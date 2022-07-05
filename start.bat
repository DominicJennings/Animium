@echo off
TASKKILL /F /IM node.exe
cls
set BUILD_VER=Alpha 1.0.2
title Animium %BUILD_VER%
echo [INFO] Animium %BUILD_VER%
echo [WARN] This is a BASE of Animium. There might not be most features.
if not exist node_modules (
echo [WARN] Please install Node.js before running the program.
echo [INFO] Running NPM install...
npm install
start browser.bat
npm start
) else (
start browser.bat
npm start
)
if not exist package-lock.json (
echo [WARN] Please install Node.js before running the program.
echo [INFO] Running NPM install...
npm install
start browser.bat
npm start
) else (
start browser.bat
npm start
)
