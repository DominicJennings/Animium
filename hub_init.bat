@echo off && cls
::     Anistick Animium Launcher    ::
::            Made by Kia           ::
::       https://anistick.com       ::
set LAUNCHER_RUN=nofolder
if not exist installed goto inst
if exist installed goto inst
:inst
npm install
echo Installed >> installed
goto noinst
:noinst
start npm start
pause
