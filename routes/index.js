'use strict';
const Protocol = require('azure-iot-device-mqtt').Mqtt;
const Client = require('azure-iot-device').Client;
const Message = require('azure-iot-device').Message;
var signals = require('../signals.json');
var trips = require('../trips.json');
var cs = require('../cs.json');

var currentpoint = 0;
var tele, trip, points = [],
  interval = 10000;

const connectionString = cs[0];
var parsedConnectionString = connectionString.split(';');
var deviceId = parsedConnectionString[1].split('=')[1]
var authType = 'PSK';

var client = Client.fromConnectionString(connectionString, Protocol);
console.log(deviceId + '......will try to connect....');

client.open(function (err) {
  console.log('.....trying to connect to iothub .....');
  if (err) {
    console.error('Could not connect: ' + err.message);
  } else {
    console.log(`${deviceId} connected`);
  }
});

var express = require('express');
var router = express.Router();

const interpolate = (index) => {
  console.log("start linear interpolation")
  var interpolated = [];
  for (var i=1; i<trip.points; i++) {
    let newlat = trip.lat1 + (i/trip.points)*(trip.lat2 - trip.lat1)
    let newlong = trip.long1 + (i/trip.points)*(trip.long2 - trip.long1)
    interpolated.push({"lat": newlat, "long": newlong});
  }
  console.log("interpolated " + i + " points")
  return interpolated;
}

const generateValue = (min, max, type) => {
  var value = Math.random() * (max - min) + min;
  if (type !== "REAL")
    value = Math.round(value)
  return value
}

const telemetry = () => {
  var payload = {};

  for (var i = 0; i < signals.length ; i++) {
    let v = generateValue(signals[i].min, signals[i].max, signals[i].type)
    payload[signals[i].dataPoint] = v
  }
  payload['timestamp'] = Date.now();
  payload['DP.rLatitude'] = points[currentpoint].lat;
  payload['DP.rLongitude'] = points[currentpoint].long;
  currentpoint++;

  console.log(payload['DP.rLatitude'] + ' | ' + payload['DP.rLongitude'])

  let msg = JSON.stringify(payload);

  let messageBytes = Buffer.from(msg)
  let message = new Message(messageBytes);

  message.contentEncoding = "utf-8";
  message.contentType = "application/json";

  client.sendEvent(message, function (err) {
    if (err) {
      console.error('Could not send: ' + err.toString());
    } else {
      console.error(`${messageBytes.length} sent to hub`);
    }
  });
}

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Trip Selector' });
});

router.post('/start', function(req, res, next) {
  let index = req.body.trip
  trip = trips[index];

  console.log(trip)
  points = interpolate( - 1);
  tele = setInterval(telemetry, interval);
  res.render('stop', { title: 'Trip Selector' });
});

router.post('/stop', function(req, res, next) {
  clearInterval(tele);
  var currentpoint = 0;

  res.render('index', { title: 'Trip Selector' });
});

module.exports = router;
