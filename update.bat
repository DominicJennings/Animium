@echo off && cls
::    Anistick Animium Updater    ::
::     Made by Kia and Joseph     ::
::      https://anistick.com      ::
if not exist git ( goto nogit ) else ( goto yesgit )
:nogit
echo Git doesn't exist. Please download Animium from the Animium GitHub repository.
explorer https://github.com/KiaWeb/Animium
:yesgit
if exist .git ( goto yesdotgit ) else ( goto nodotgit )
:yesdotgit
git pull || git stash && git pull || goto noworkingupdate
:nodotgit
echo There is no .git directory. Please download Animium using the installer. https://github.com/josephanimate2021/Animium-Installer
