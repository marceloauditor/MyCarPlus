@echo off
setlocal
cd /d "%~dp0"
set "DIAG=%~dp0DIAGNOSTICO_MONTAGEM_V6_09.txt"
node.exe "%~dp0scripts\check-update-package.js" --root "%~dp0" --mode package --diagnostic "%DIAG%"
if errorlevel 1 (
  echo.
  echo CHECKLIST REPROVADO. Consulte: %DIAG%
  pause
  exit /b 1
)
echo.
echo CHECKLIST V6.09 APROVADO.
pause
