/*
Anistick Launcher
*/
require("./server");
const env = Object.assign(process.env, require("./env"), require("./config"));
// modules
const { app, BrowserWindow, Menu } = require("electron");
const fs = require("fs");
const path = require("path");
let pluginName;
const platform = process.platform;
const ternimal = app.commandLine;
switch (platform) {
	case "win32": {
		pluginName = "./extensions/pepflashplayer.dll";
		break;
	} case "darwin": {
		pluginName = "./extensions/PepperFlashPlayer.plugin";
		break;
	} case "linux": {
		pluginName = "./extensions/libpepflashplayer.so";
		// i don't know what this does but it makes flash work
		ternimal.appendSwitch("no-sandbox");
		break;
	}
}
ternimal.appendSwitch("ppapi-flash-path", path.join(__dirname, pluginName));
ternimal.appendSwitch("ppapi-flash-version", "32.0.0.371");

let mainWindow;
const createWindow = () => {
	mainWindow = new BrowserWindow({
		width: 1200,
		height: 700,
		title: "Anistick Studio",
		icon: path.join(__dirname, "./favicon.ico"),
		webPreferences: {
			plugins: true,
			contextIsolation: true
		}
	});
	// use it in external scripts
	process.env.MAIN_WINDOW_ID = mainWindow.id;

	// initialize stuff
	// clear the menu bar
	Menu.setApplicationMenu(Menu.buildFromTemplate([]));
	// load the video list
	mainWindow.loadURL("http://localhost");
	mainWindow.on("closed", () => mainWindow = null);

	// debug stuff
	if (env.NODE_ENV == "development") {
		mainWindow.webContents.openDevTools();
	}
};

app.whenReady().then(() => {
	// wait for the server
	setTimeout(createWindow, 2000);
});
app.on("window-all-closed", () => {
	if (process.platform !== "darwin") app.quit();
});
app.on("activate", () => {
	if (mainWindow === null) createWindow();
});
