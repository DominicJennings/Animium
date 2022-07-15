/*
Anistick 3.0.1 Launcher
Made by the Anistick Team
*/

// Modules
const https = require('node:https');
const crypto = require('crypto');
const loginvars = require('./loginvars');
var prompt = require("prompt-sync")();

// Variables
var username = prompt("Username: ");
var password = prompt("Password: ");

// Password hasher
var hpass = crypto.createHash('md5').update(password).digest('hex');

// Environment variables
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
      loginvars.saveUser(username);
      console.log(`Successfully logged in as "${username}"!`);
      require("./server");
    } else {
      loginvars.saveGuest();
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