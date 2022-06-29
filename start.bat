@echo off
TASKKILL /F /IM node.exe
cls
set BUILD_VER=Alpha 1.0.0
title Animium %BUILD_VER%
echo [INFO] Animium %BUILD_VER%
echo [WARN] This is a BASE of Animium. There might not be most features.
echo [WARN] Please install Node.js before running the program.
echo [INFO] Running NPM install...
npm install
echo [INFO] Starting NPM and browser...
start browser.bat
call npm start

