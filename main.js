/*
Anistick 3.0.0 Launcher
Made by the Anistick Team
*/

// Modules
const https = require('node:https');
const crypto = require('crypto');
var prompt = require("prompt-sync")();

// Variables
var username = prompt("Username: ");
var password = prompt("Password: ");

// Password hasher
var hpass = crypto.createHash('md5').update(password).digest('hex');
// assign stuff to process.env.
const env = Object.assign(process.env, require("./env"), require("./config"));
// API request
const options = {
  hostname: env.API_URL,
  port: 443,
  path: env.API_ENDPOINT + `?username=${username}&password=${hpass}`,
  method: 'GET'
};

const req = https.request(options, (res) => {
    if (res.statusCode == 200) {
      env.SAVED_FOLDER = `./_SAVED/${username}`;
      env.PROP_THUMB_FOLDER = `./_PROPS/${username}`;
      env.VIDEOS_FOLDER = `./_VIDEOS/${username}`;
      env.WAVEFORMS_FOLDER = `./_WAVEFORMS/${username}`;
      env.CACHÉ_FOLDER = `./_CACHÉ/${username}`;
      console.log(`Successfully logged in as "${username}"!`);
      require("./server");
    } else {
      env.SAVED_FOLDER = "./_SAVED";
      env.PROP_THUMB_FOLDER = "./_PROPS";
      env.VIDEOS_FOLDER = "./_VIDEOS";
      env.WAVEFORMS_FOLDER = "./_WAVEFORMS";
      env.CACHÉ_FOLDER = "./_CACHÉ";
      console.log("Guest mode is activated!");
      require("./server");
    };

  res.on('data', (d) => {
  });
});

req.on('error', (e) => {
  console.error(e);
});
req.end(); 