@echo off
:: this is another set of random batch files that i created. i don't know why. but i am making this just for the devs.
set /p CHOICE=Please Input Your Commit Response:
git add "%choice%"
git commit -a -m "%choice%"
git push
