@echo off && cls
::    Anistick Animium Updater    ::
::     Made by Kia and Joseph     ::
::      https://anistick.com      ::
if exist .git ( git pull || echo Update failed. Attempting to update again... && git stash && git pull ) else ( echo Git not found. Update skiped. && pause & exit )
echo Update sucessfull. && pause & exit
