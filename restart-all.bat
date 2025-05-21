@echo off

echo Killing all node processes...
taskkill /F /IM node.exe

echo Building frontend...
npm run build

echo Starting proxy server...
start cmd /k "npm run start:proxy"

echo Starting frontend (React) server...
start cmd /k "npm start"

echo All servers restarted!
pause 