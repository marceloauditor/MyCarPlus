@echo off
setlocal
chcp 65001 >nul
title Publicar regras Firebase - MyCar+ V5.62
cd /D "%~dp0"
echo ============================================================
echo  MYCAR+ V5.62 - PUBLICACAO DAS REGRAS DO FIRESTORE
echo ============================================================
echo.
echo Este processo libera a nova estrutura por registro apenas para
echo o proprio usuario autenticado.
echo.
echo Projeto Firebase: mycarplus-3180a
echo Arquivo: firebase\firestore.rules
echo.
call npx.cmd firebase-tools login
if errorlevel 1 goto erro
call npx.cmd firebase-tools deploy --only firestore:rules --project mycarplus-3180a
if errorlevel 1 goto erro
echo.
echo Regras publicadas com sucesso.
pause
exit /b 0
:erro
echo.
echo Falha ao publicar as regras. Confira o login e a conexao.
pause
exit /b 1
