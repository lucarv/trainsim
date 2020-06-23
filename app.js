// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';
require('dotenv').config()
const Protocol = require('azure-iot-device-mqtt').Mqtt;
const Client = require('azure-iot-device').Client;
const Message = require('azure-iot-device').Message;
var signals = require('./signals.json')

const connectionString = process.env.CS;
var parsedConnectionString = connectionString.split(';');
var deviceId = parsedConnectionString[1].split('=')[1]
var authType = 'PSK';

var tele,
  interval = 10000;
var certFile, keyFile;
const currentPath = process.cwd();

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


client.on('error', function (err) {
  console.error(err.message);
  process.exit(-1);
});



// register handler for 'start'
client.onDeviceMethod('start', function (request, response) {
  var responsePayload = {
    result: 'started'
  };
  if (request.payload !== null) {
    if (request.payload.hasOwnProperty('interval')) {
      interval = request.payload.interval;
    }
  }
  console.log('received a request to start telemetry at interval: ' + interval);

  tele = setInterval(telemetry, interval);
  var responsePayload = {
    result: 'telemetry startd at intervals of: ' + interval + ' ms'
  };
  response.send(200, responsePayload, function (err) {
    if (err) {
      console.error('Unable to send method response: ' + err.toString());
    }
  });
});

// register handler for 'stop'
client.onDeviceMethod('stop', function (request, response) {
  console.log('\nreceived a request to stop telemetry');
  clearInterval(tele);

  var responsePayload = {
    result: 'stopped'
  };

  response.send(200, responsePayload, function (err) {
    if (err) {
      console.error('Unable to send method response: ' + err.toString());
    }
  });
});

// register handler for 'reset'
client.onDeviceMethod('reset', function (request, response) {
  console.log('received a request for reset');
  lastSentValues = Object.assign({}, defaults);

  var responsePayload = {
    result: 'sensor reset'
  };

  response.send(200, responsePayload, function (err) {
    if (err) {
      console.error('Unable to send method response: ' + err.toString());
    }
  });
});

// register handler for 'close'
client.onDeviceMethod('close', function (request, response) {
  console.log('received a request to disconnect');

  var responsePayload = {
    result: 'device will disconnect'
  };

  response.send(200, responsePayload, function (err) {
    if (err) {
      console.error('Unable to send method response: ' + err.toString());
    } else {
      client.close(function (err) {
        if (err) {
          console.error('Unable to close the connection: ' + err.toString());
        } else {
          console.log('exiting....')
          process.exit(0);
        }
      });
    }
  });
});