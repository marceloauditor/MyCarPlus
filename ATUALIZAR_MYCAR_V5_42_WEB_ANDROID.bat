@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul
title Atualizacao MyCar+ V5.42 - Web e Android

rem ============================================================
rem CONFIGURACAO
rem ============================================================
set "VERSAO=5.42"
set "ZIP=%USERPROFILE%\Downloads\MYCAR_PLUS_V5_42_MASTER.zip"
set "PROJETO=%USERPROFILE%\Documents\GitHub\MyCarPlus"
set "TEMP=%USERPROFILE%\Downloads\MYCAR_PLUS_V5_42_TEMP"
set "LOG=%USERPROFILE%\Downloads\ATUALIZACAO_MYCAR_V5_42_LOG.txt"

for /f "tokens=1-4 delims=/ " %%a in ("%date%") do set "DATA=%%d%%c%%b"
for /f "tokens=1-2 delims=: " %%a in ("%time%") do set "HORA=%%a%%b"
set "HORA=%HORA: =0%"
set "BACKUP=%USERPROFILE%\Documents\GitHub\MyCarPlus_BACKUP_ANTES_V5_42_%DATA%_%HORA%"

> "%LOG%" echo ============================================================
>>"%LOG%" echo ATUALIZACAO MYCAR+ V%VERSAO%
>>"%LOG%" echo Inicio: %date% %time%
>>"%LOG%" echo ZIP: %ZIP%
>>"%LOG%" echo Projeto: %PROJETO%
>>"%LOG%" echo Backup: %BACKUP%
>>"%LOG%" echo ============================================================

echo.
echo ============================================================
echo        ATUALIZACAO MYCAR+ V%VERSAO% - WEB E ANDROID
echo ============================================================
echo.
echo O processo vai:
echo   1. Conferir o ZIP em Downloads
echo   2. Criar backup da versao atual
echo   3. Descompactar e copiar a nova fonte
echo   4. Instalar dependencias
echo   5. Atualizar a versao Web
echo   6. Sincronizar o Android
echo   7. Validar a coesao da fonte, Web e Android
echo   8. Gerar o APK de teste
echo   9. Criar um arquivo de log em Downloads
echo.
pause

rem ============================================================
rem 1. VALIDACOES
rem ============================================================
call :etapa "1/9 - Conferindo arquivos e pastas"

if not exist "%ZIP%" (
    call :erro "ZIP nao encontrado: %ZIP%"
    goto :fim_erro
)

if not exist "%PROJETO%\package.json" (
    call :erro "Projeto nao encontrado ou sem package.json: %PROJETO%"
    goto :fim_erro
)

where node.exe >>"%LOG%" 2>&1
if errorlevel 1 (
    call :erro "Node.js nao foi encontrado no PATH."
    goto :fim_erro
)

where npm.cmd >>"%LOG%" 2>&1
if errorlevel 1 (
    call :erro "npm.cmd nao foi encontrado no PATH."
    goto :fim_erro
)

call :ok "Validacoes concluidas."

rem ============================================================
rem 2. BACKUP
rem ============================================================
call :etapa "2/9 - Criando backup da versao atual"

robocopy "%PROJETO%" "%BACKUP%" /E /COPY:DAT /DCOPY:DAT /R:2 /W:2 /XD node_modules .git android\build android\app\build >>"%LOG%" 2>&1
set "RC=!ERRORLEVEL!"
if !RC! GEQ 8 (
    call :erro "Falha ao criar backup. Codigo Robocopy: !RC!"
    goto :fim_erro
)
call :ok "Backup criado em: %BACKUP%"

rem ============================================================
rem 3. DESCOMPACTAR E COPIAR
rem ============================================================
call :etapa "3/9 - Descompactando o ZIP e atualizando a fonte"

if exist "%TEMP%" rmdir /S /Q "%TEMP%" >>"%LOG%" 2>&1
mkdir "%TEMP%" >>"%LOG%" 2>&1

powershell.exe -NoProfile -ExecutionPolicy Bypass -Command ^
  "Expand-Archive -LiteralPath '%ZIP%' -DestinationPath '%TEMP%' -Force" >>"%LOG%" 2>&1
if errorlevel 1 (
    call :erro "Falha ao descompactar o ZIP."
    goto :fim_erro
)

set "FONTE="
for /f "delims=" %%D in ('dir /B /S /A:D "%TEMP%\MYCAR_PLUS_V5_42_MASTER" 2^>nul') do (
    if exist "%%D\package.json" set "FONTE=%%D"
)
if not defined FONTE (
    if exist "%TEMP%\MYCAR_PLUS_V5_42_MASTER\package.json" set "FONTE=%TEMP%\MYCAR_PLUS_V5_42_MASTER"
)
if not defined FONTE (
    for /f "delims=" %%F in ('dir /B /S "%TEMP%\package.json" 2^>nul') do (
        set "FONTE=%%~dpF"
        goto :fonte_encontrada
    )
)
:fonte_encontrada

if not defined FONTE (
    call :erro "Nao foi possivel localizar a pasta da fonte extraida."
    goto :fim_erro
)

>>"%LOG%" echo Fonte localizada: !FONTE!

robocopy "!FONTE!" "%PROJETO%" /E /COPY:DAT /DCOPY:DAT /R:2 /W:2 /XD .git node_modules /XF ATUALIZACAO_MYCAR_V5_42_LOG.txt >>"%LOG%" 2>&1
set "RC=!ERRORLEVEL!"
if !RC! GEQ 8 (
    call :erro "Falha ao copiar a nova fonte. Codigo Robocopy: !RC!"
    goto :fim_erro
)
call :ok "Nova fonte copiada para o projeto."

rem ============================================================
rem 4. INSTALAR DEPENDENCIAS
rem ============================================================
call :etapa "4/9 - Instalando dependencias"

cd /D "%PROJETO%"
call npm.cmd install >>"%LOG%" 2>&1
if errorlevel 1 (
    call :erro "npm install falhou. Consulte o log."
    goto :fim_erro
)
call :ok "Dependencias instaladas."

rem ============================================================
rem 5. ATUALIZAR WEB
rem ============================================================
call :etapa "5/9 - Atualizando a versao Web"

call npm.cmd run sync:web >>"%LOG%" 2>&1
if errorlevel 1 (
    call :erro "A sincronizacao Web falhou."
    goto :fim_erro
)
call :ok "Arquivos Web sincronizados na pasta www."

rem ============================================================
rem 6. SINCRONIZAR ANDROID
rem ============================================================
call :etapa "6/9 - Sincronizando o Android"

call npm.cmd run sync >>"%LOG%" 2>&1
if errorlevel 1 (
    call :erro "A sincronizacao Android falhou."
    goto :fim_erro
)
call :ok "Android sincronizado com a versao Web."

call :etapa "7/9 - Validando coesao da fonte Web e Android"
call npm.cmd run validate:cohesion >>"%LOG%" 2>&1
if errorlevel 1 (
    call :erro "A validacao de coesao encontrou inconsistencias. Consulte o log."
    goto :fim_erro
)
call :ok "Coesao validada: raiz, www e Android estao sincronizados."

rem ============================================================
rem 8. GERAR APK DEBUG
rem ============================================================
call :etapa "8/9 - Gerando APK de teste"

call npm.cmd run build:debug >>"%LOG%" 2>&1
if errorlevel 1 (
    call :erro "A geracao do APK falhou. A fonte e as sincronizacoes anteriores foram mantidas."
    goto :fim_erro
)

set "APK=%PROJETO%\android\app\build\outputs\apk\debug\app-debug.apk"
if exist "%APK%" (
    call :ok "APK gerado: %APK%"
) else (
    call :erro "O build terminou, mas o APK nao foi encontrado no local esperado."
    goto :fim_erro
)

rem ============================================================
rem 9. RELATORIO FINAL
rem ============================================================
call :etapa "9/9 - Conferindo a versao e finalizando"

for /f "delims=" %%V in ('node -p "require('./package.json').version" 2^>nul') do set "VERSAO_ENCONTRADA=%%V"
>>"%LOG%" echo Versao encontrada no package.json: !VERSAO_ENCONTRADA!
>>"%LOG%" echo.
>>"%LOG%" echo GIT STATUS:
git status >>"%LOG%" 2>&1

if exist "%TEMP%" rmdir /S /Q "%TEMP%" >>"%LOG%" 2>&1

>>"%LOG%" echo.
>>"%LOG%" echo ============================================================
>>"%LOG%" echo ATUALIZACAO CONCLUIDA COM SUCESSO
>>"%LOG%" echo Final: %date% %time%
>>"%LOG%" echo APK: %APK%
>>"%LOG%" echo ============================================================

echo.
echo ============================================================
echo ATUALIZACAO CONCLUIDA COM SUCESSO
echo ============================================================
echo.
echo Versao instalada: !VERSAO_ENCONTRADA!
echo Backup:
echo   %BACKUP%
echo.
echo APK:
echo   %APK%
echo.
echo Log completo:
echo   %LOG%
echo.

choice /C SN /N /M "Deseja abrir o Android Studio agora? [S/N]: "
if errorlevel 2 goto :perguntar_git
if errorlevel 1 (
    echo Abrindo Android Studio...
    >>"%LOG%" echo Solicitada abertura do Android Studio.
    call npm.cmd run open:android >>"%LOG%" 2>&1
)

:perguntar_git
echo.
choice /C SN /N /M "Deseja publicar a atualizacao Web no GitHub agora? [S/N]: "
if errorlevel 2 goto :fim_sucesso
if errorlevel 1 goto :publicar_git

:publicar_git
call :etapa "Publicando no GitHub"
git add . >>"%LOG%" 2>&1
if errorlevel 1 (
    call :erro "git add falhou."
    goto :fim_erro
)
git commit -m "Atualiza MyCar+ para V5.42" >>"%LOG%" 2>&1
if errorlevel 1 (
    echo Nao houve novo commit ou o commit falhou. Verifique o log.
    >>"%LOG%" echo Commit nao realizado ou sem alteracoes.
)
git push origin main >>"%LOG%" 2>&1
if errorlevel 1 (
    call :erro "git push falhou. A atualizacao local permanece concluida."
    goto :fim_erro
)
call :ok "Atualizacao enviada ao GitHub. A pagina Web sera atualizada conforme o servico de publicacao configurado."

:fim_sucesso
echo.
echo Processo finalizado. Guarde o arquivo de log.
echo.
pause
exit /b 0

:fim_erro
echo.
echo ============================================================
echo A ATUALIZACAO FOI INTERROMPIDA
echo ============================================================
echo Consulte o arquivo:
echo   %LOG%
echo.
echo O backup anterior esta em:
echo   %BACKUP%
echo.
pause
exit /b 1

:etapa
echo.
echo ------------------------------------------------------------
echo %~1
echo ------------------------------------------------------------
>>"%LOG%" echo.
>>"%LOG%" echo [%date% %time%] %~1
exit /b 0

:ok
echo [OK] %~1
>>"%LOG%" echo [OK] %~1
exit /b 0

:erro
echo [ERRO] %~1
>>"%LOG%" echo [ERRO] %~1
exit /b 0
