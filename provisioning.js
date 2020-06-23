'use strict';
const fs = require('fs');
const iothub = require('azure-iothub');
var connectionString = "HostName=devhub-luca.azure-devices.net;SharedAccessKeyName=registryReadWrite;SharedAccessKey=m/nSFXTDbUXNSemjNhTpZv6S6KMx+SdCSeGW6/J6vAU="
const registry = iothub.Registry.fromConnectionString(connectionString);
var devices = [];
var firstId = 0;
var lastId = 2;

const create = async (deviceId) => {
  var hostname = connectionString.split(';')[0]

  // Create a new device
  var device = {
    deviceId
  };
  console.log(device)

  registry.create(device, (err, deviceInfo, res) => {
    if (err) console.log(' error: ' + err.toString());
    if (res) console.log(' status: ' + res.statusCode + ' ' + res.statusMessage);
    let sas = deviceInfo.authentication.symmetricKey.primaryKey
    let cs = hostname + ';DeviceId=' + device + ';SharedAccessKey=' + sas
    console.log(cs)
    devices.push(cs)
  });
};

const start = async () => {

  for (var i = firstId; i < lastId; i++) {
    let deviceId = 'SJ_TRAIN_SIM_' + ('00000000' + i).slice(-8);
    create(deviceId)
  }
}


/*
fs.writeFile("/tmp/test", "Hey there!", function(err) {
  if(err) {
      return console.log(err);
  }

  console.log("The file was saved!");
}); 
*/
start();
