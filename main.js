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
var isGuest = prompt("Would you like to use guest mode [y/n]: ");
var username = null;
var password = null;
isGuest = isGuest.toLowerCase();
if (isGuest == "y") {
	loginvars.saveGuest();
    console.log("Guest mode is activated!");
    require("./server");
} else {
	username = prompt("Username: ");
	password = prompt("Password: ");
	// Password hasher
    var hpass = crypto.createHash('md5').update(password).digest('hex');

    // Environment variables
    const env = Object.assign(process.env, require("./env"), require("./config"));

    // API request
    const options = {
      hostname: env.API_URL,
      port: 443,
      path: env.API_ENDPOINT + `?usrn=${username}&pswd=${hpass}`,
      method: 'GET'
    };

    const req = https.request(options, (res) => {
        if (res.statusCode == 200) {
            loginvars.saveUser(username);
            console.log(`Successfully logged in as "${username}"!`);
            require("./server");
        } else {
			console.log("Incorrect password.");
			console.log("To try again, re-launch Anistick Studio / Animium. Entering guest mode.")
			loginvars.saveGuest();
			require("./server");
        };

      res.on('data', (d) => {
      });
    });

    req.on('error', (e) => {
      console.error(e);
    });
    req.end();
};