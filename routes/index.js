'use strict';
const Protocol = require('azure-iot-device-mqtt').Mqtt;
const Client = require('azure-iot-device').Client;
const Message = require('azure-iot-device').Message;
var signals = require('../signals.json');
var trips = require('../trips.json');
var cs = require('../cs.json');
const trains = ['X2008', 'U2510', 'U2842', 'U2611', 'U2840', 'U2808']
var clients = [];

var currentPoints = [0, 0, 0, 0, 0, 0];
var teles = [],
  trainNumber, trip, routePoints = [],
  coord = [],
  interval = 10000;

const spawn = () => {
  for (var i = 0; i < 6; i++) {
    let connectionString = cs[i];
    let parsedConnectionString = connectionString.split(';');
    let deviceId = parsedConnectionString[1].split('=')[1]
    clients[i] = Client.fromConnectionString(connectionString, Protocol);

    clients[i].open(function (err) {
      if (err) {
        console.error('Could not connect: ' + err.message);
      } else {
        console.log(`${deviceId} connected`);
      }
    });
  }
}

var express = require('express');
const { format } = require('path');
var router = express.Router();

const interpolate = () => {
  for (var i = 0; i < 6; i++) {
    var interpolated = [];
    let trip = trips[i];
    for (var j = 0; j < trip.points; j++) {
      let newlat = trip.lat1 + (j / trip.points) * (trip.lat2 - trip.lat1)
      let newlong = trip.long1 + (j / trip.points) * (trip.long2 - trip.long1)

      interpolated.push({
        "lat": newlat,
        "long": newlong
      });
    }
    routePoints.push(interpolated)
  }
}

const generateValue = (min, max, type) => {
  var value = Math.random() * (max - min) + min;
  if (type !== "REAL")
    value = Math.round(value)
  return value
}

const telemetry = (index) => {
  var payload = {};

  for (var i = 0; i < signals.length; i++) {
    let v = generateValue(signals[i].min, signals[i].max, signals[i].type)
    payload[signals[i].dataPoint] = v
  }
  payload['timestamp'] = Date.now();

  let points = routePoints[index];
  let position = currentPoints[index];
  
  payload['DP.rLatitude'] = points[position].lat;
  payload['DP.rLongitude'] = points[position].long;
  payload['DP_F.iVstPIS_TrainNumber'] = trains[index];
  currentPoints[index]++;

  console.log(`##### Train [${trains[index]}] currently at >> lat: [${payload['DP.rLatitude']} | long: [${ payload['DP.rLongitude']}]`)
  let msg = JSON.stringify(payload);
  
    let messageBytes = Buffer.from(msg)
    let message = new Message(messageBytes);

    message.contentEncoding = "utf-8";
    message.contentType = "application/json";

    clients[index].sendEvent(message, function (err) {
      if (err) {
        console.error('Could not send: ' + err.toString());
      }
    });
}

/* GET home page. */
router.get('/', function (req, res, next) {
  res.render('index', {
    title: 'Trip Selector'
  });
});

router.post('/start', function (req, res, next) {
  trip = trips[req.body.route];
  trainNumber = trains.indexOf(req.body.train_nr)
  if (req.body.action == 'start') {
    if (currentPoints[trainNumber] === 0) {
      teles.push(setInterval(telemetry, interval, trainNumber));
      console.log(`\n### Train [${trains[trainNumber]}] will depart\n`);
      res.render('index', {
        title: 'Trip Selector'
      });
    } else {
      res.render('error', {
        message: 'This train is no longer at the station'
      });
    }
  } else {
    console.log('\n### Stopping trip for train: ' + trains[trainNumber]);
    currentPoints[trainNumber] = 0;
    clearInterval(teles[trainNumber])
    res.render('index', {
      title: 'Trip Selector'
    });
  }

});

router.post('/stop', function (req, res, next) {
  clearInterval(tele);
  res.render('index', {
    title: 'Trip Selector'
  });
});
spawn();
interpolate();


module.exports = router;