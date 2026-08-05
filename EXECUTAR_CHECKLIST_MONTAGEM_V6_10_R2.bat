@echo off
setlocal EnableExtensions
chcp 65001 >nul
set "DIAG=%~dp0DIAGNOSTICO_MONTAGEM_V6_10_R2.txt"
node.exe "%~dp0scripts\check-update-package.js" --root "%~dp0" --mode package --diagnostic "%DIAG%"
if errorlevel 1 (
  echo CHECKLIST V6.10 R2 REPROVADO. Consulte: %DIAG%
  pause
  exit /b 1
)
echo.
echo CHECKLIST V6.10 R2 APROVADO.
echo Diagnostico: %DIAG%
pause
exit /b 0
