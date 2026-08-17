@echo off
setlocal EnableExtensions
set "DIAG=%~dp0DIAGNOSTICO_MONTAGEM_V6_14.txt"
node.exe "%~dp0scripts\check-update-package.js" --root "%~dp0" --mode package --diagnostic "%DIAG%"
if errorlevel 1 (
  echo CHECKLIST V6.14 REPROVADO. Consulte: %DIAG%
  pause
  exit /b 1
)
echo CHECKLIST V6.14 APROVADO.
pause
