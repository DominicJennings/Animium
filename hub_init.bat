@echo off && cls
::     Anistick Animium Launcher    ::
::            Made by Kia           ::
::       https://anistick.com       ::
set LAUNCHER_RUN=nofolder
if %1 == %LAUNCHER_RUN% ( goto inst ) else ( goto noinst )
:inst
npm install
exit
:noinst
No Node.js installation needed.
call npm start
