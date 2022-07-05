@echo off && cls
::     Anistick Animium Launcher                        ::
::            Made by Kia And Fixed By Joseph.          ::
::       https://anistick.com                           ::
if not exist node_modules ( npm install && npm start ) else ( npm start )
