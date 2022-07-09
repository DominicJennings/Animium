:: Animium Resetter.
:: a batch file i created for just in case anyone who is contributuing inside of anistick messes something up causing it to break.
:: NOTE: you may want to backup some of your files before using this file.
echo Reseting Dev Settings....
git checkout main || echo that's weird. something has failled. 2nd time is the charm.
git fetch --all || echo this is getting suspicious. now reseting the origin.
git reset --hard origin/main || an error has occured in all 3 phases. the command prompt is starting now so that way you can type the commands shown below. && call cmd.exe
echo Animium is sucessfully reset!
pause & exit
