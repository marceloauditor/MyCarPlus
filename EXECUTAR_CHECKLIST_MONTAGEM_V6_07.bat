@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
set "DIAGNOSTICO=%~dp0DIAGNOSTICO_MONTAGEM_V6_07.txt"
node.exe "%~dp0scripts\check-update-package.js" --root "%~dp0" --mode package --diagnostic "%DIAGNOSTICO%"
set "RC=%ERRORLEVEL%"
echo.
echo Diagnostico: %DIAGNOSTICO%
pause
exit /b %RC%
