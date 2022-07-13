@echo off && cls
echo Starting Chromium...
start browser\chrome.exe --allow-outdated-plugins --app=http://localhost/
npm start

