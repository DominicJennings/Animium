@echo off
if exist .git ( git pull || echo Update failed. Attempting to update again... && git stash && git pull ) else ( echo Git not found. Update skiped. && pause & exit )
echo Update complete. && pause & exit
