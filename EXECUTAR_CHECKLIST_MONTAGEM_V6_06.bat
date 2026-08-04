@echo off
setlocal EnableExtensions
chcp 65001 >nul
set "RAIZ=%~dp0"
set "DIAG=%RAIZ%DIAGNOSTICO_MANUAL_V6_06.txt"
where node.exe >nul 2>&1 || (
  echo [ERRO] Node.js nao encontrado.
  pause
  exit /b 1
)
node.exe "%RAIZ%scripts\check-update-package.js" --root "%RAIZ%" --mode package --diagnostic "%DIAG%"
echo.
echo Diagnostico: %DIAG%
pause
exit /b %ERRORLEVEL%
