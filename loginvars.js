/*
Anistick 3.0.1 Login Vars
Made by the Anistick Team
*/
const fs = require("fs");
function saveUser (username) {
	fs.writeFileSync("./env.json", `{"CHAR_BASE_URL":"https://raw.githubusercontent.com/GoAnimate-Wrapper/GoAnimate-Character-Dump/master/characters","THUMB_BASE_URL":"https://raw.githubusercontent.com/GoAnimate-Wrapper/GoAnimate-Thumbnails/master/thumbnails","XML_HEADER":"<?xml version=\"1.0\" encoding=\"utf-8\"?>\n","CROSSDOMAIN":"<cross-domain-policy><allow-access-from domain=\"*\"/></cross-domain-policy>","FILE_WIDTH":1000,"GATHER_THREADS":100,"GATHER_THRESH1":250000000,"GATHER_THRESH2":328493000,"GATHER_THRESH3":400000000,"FILE_NUM_WIDTH":9,"XML_NUM_WIDTH":3,"SERVER_PORT":80,"NODE_USER":"goanimator","THUMB_URL":"./_THUMBS/download.jpg","VIDEOS_FOLDER":"./_VIDEOS/${username}","PROP_THUMB_FOLDER":"./_PROPS/${username}","WAVEFORMS_FOLDER":"./_WAVEFORMS/${username}","SAVED_FOLDER":"./_SAVED/${username}","CACHÉ_FOLDER":"./_CACHÉ/${username}","THEME_FOLDER":"./_THEMES","PREMADE_FOLDER":"./_PREMADE","EXAMPLE_FOLDER":"./_EXAMPLES","API_URL":"www.anistick.com","API_ENDPOINT":"/animium-login.php"}`);
    return true;
};
function saveGuest () {
	fs.writeFileSync("./env.json", `{"CHAR_BASE_URL":"https://raw.githubusercontent.com/GoAnimate-Wrapper/GoAnimate-Character-Dump/master/characters","THUMB_BASE_URL":"https://raw.githubusercontent.com/GoAnimate-Wrapper/GoAnimate-Thumbnails/master/thumbnails","XML_HEADER":"<?xml version=\"1.0\" encoding=\"utf-8\"?>\n","CROSSDOMAIN":"<cross-domain-policy><allow-access-from domain=\"*\"/></cross-domain-policy>","FILE_WIDTH":1000,"GATHER_THREADS":100,"GATHER_THRESH1":250000000,"GATHER_THRESH2":328493000,"GATHER_THRESH3":400000000,"FILE_NUM_WIDTH":9,"XML_NUM_WIDTH":3,"SERVER_PORT":80,"NODE_USER":"goanimator","THUMB_URL":"./_THUMBS/download.jpg","VIDEOS_FOLDER":"./_VIDEOS","PROP_THUMB_FOLDER":"./_PROPS","WAVEFORMS_FOLDER":"./_WAVEFORMS","SAVED_FOLDER":"./_SAVED","CACHÉ_FOLDER":"./_CACHÉ","THEME_FOLDER":"./_THEMES","PREMADE_FOLDER":"./_PREMADE","EXAMPLE_FOLDER":"./_EXAMPLES","API_URL":"www.anistick.com","API_ENDPOINT":"/animium-login.php"}`);
    return true;
};
exports.saveUser = saveUser;
exports.saveGuest = saveGuest;