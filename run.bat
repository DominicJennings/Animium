@echo off && cls
::     Anistick Animium Launcher     ::
taskkill /f /im node.exe
if not exist node_modules ( npm install && call browser.bat ) else ( call browser.bat )
