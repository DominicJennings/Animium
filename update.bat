@echo off && cls
::    Anistick Animium Updater    ::
::     Made by Kia and Joseph     ::
::      https://anistick.com      ::
:: delete the node_modules folder and package-lock.json file before the update.
if exist node_modules ( rd /q /s node_modules || echo Error deleting the node_modules folder. && set ERROR_OCCURED_ONCE=y ) 
if exist package-lock.json ( del package-lock.json || echo Error deleting the package-lock.json file. && goto errorSeting )
:errorSetting
:: set error vars if something went wrong.
if "%ERROR_OCCURED_ONCE%"=="" ( set ERROR_OCCURED_ONCE=y ) else ( set ERROR_OCCURED_TWICE=y )
:: don't peform the updates after an error occurs.
if %ERROR_OCCURED_ONCE%==y ( %ERROR_OCCURED_TWICE%==y ( echo There was an error while peforming two tasks. so the update will be skipped. && pause & exit ) else ( echo There was an error while peforming a task. so the update will be skipped. && pause & exit ) )
:: peform the update afterwards.
if exist .git ( git pull || echo Update failed. Attempting to update again... && git stash && git pull || echo i have nothing else to do now. && npm install && call cmd.exe ) else ( echo Git not found. Update skiped. && pause & exit )
echo Update sucessfull. && npm install && pause & exit
