@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul
title Atualizacao MyCar+ V5.68 - Web e Android

rem ============================================================
rem CONFIGURACAO
rem ============================================================
set "VERSAO=5.68"
set "ZIP=%USERPROFILE%\Downloads\MYCAR_PLUS_V5_68_MASTER.zip"
set "PROJETO=%USERPROFILE%\Documents\GitHub\MyCarPlus"
set "TEMP=%USERPROFILE%\Downloads\MYCAR_PLUS_V5_68_TEMP"
set "LOG=%USERPROFILE%\Downloads\ATUALIZACAO_MYCAR_V5_68_LOG.txt"

for /f "delims=" %%I in ('powershell.exe -NoProfile -Command "Get-Date -Format yyyyMMdd_HHmmss"') do set "STAMP=%%I"
set "BACKUP=%USERPROFILE%\Documents\GitHub\MyCarPlus_BACKUP_ANTES_V5_68_%STAMP%"

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
echo Este BAT e autocontido e nao depende de arquivo PS1.
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
    set "ZIP_ENCONTRADO="
    for /f "delims=" %%Z in ('dir /B /A:-D /O:-D "%USERPROFILE%\Downloads\MYCAR_PLUS_V5_68_MASTER*.zip" 2^>nul') do (
        if not defined ZIP_ENCONTRADO set "ZIP_ENCONTRADO=%USERPROFILE%\Downloads\%%Z"
    )
    if defined ZIP_ENCONTRADO (
        set "ZIP=!ZIP_ENCONTRADO!"
        >>"%LOG%" echo ZIP alternativo localizado: !ZIP!
        echo ZIP localizado automaticamente: !ZIP!
    ) else (
        call :erro "ZIP nao encontrado. Esperado: %ZIP%"
        goto :fim_erro
    )
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

robocopy "%PROJETO%" "%BACKUP%" /E /COPY:DAT /DCOPY:DAT /R:2 /W:2 ^
 /XD "%PROJETO%\node_modules" "%PROJETO%\.git" "%PROJETO%\android\.gradle" "%PROJETO%\android\build" "%PROJETO%\android\app\build" "%PROJETO%\android\capacitor-cordova-android-plugins\build" ^
 >>"%LOG%" 2>&1
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

set "FONTE=%TEMP%\MYCAR_PLUS_V5_68_MASTER"
if not exist "!FONTE!\package.json" set "FONTE="

if not defined FONTE (
    for /f "delims=" %%F in ('dir /B /S /A:-D "%TEMP%\package.json" 2^>nul') do (
        if not defined FONTE set "FONTE=%%~dpF"
    )
)

if not defined FONTE (
    call :erro "Nao foi possivel localizar a pasta da fonte extraida."
    goto :fim_erro
)

rem Remove a barra final para evitar que o ROBOCOPY una origem e destino.
if "!FONTE:~-1!"=="\" set "FONTE=!FONTE:~0,-1!"

>>"%LOG%" echo Fonte localizada: !FONTE!

robocopy "!FONTE!" "%PROJETO%" /E /COPY:DAT /DCOPY:DAT /R:2 /W:2 ^
 /XD "!FONTE!\.git" "!FONTE!\node_modules" "!FONTE!\android\.gradle" "!FONTE!\android\build" "!FONTE!\android\app\build" "!FONTE!\android\capacitor-cordova-android-plugins\build" ^
 /XF ATUALIZACAO_MYCAR_V5_68_LOG.txt >>"%LOG%" 2>&1
set "RC=!ERRORLEVEL!"
if !RC! GEQ 8 (
    call :erro "Falha ao copiar a nova fonte. Codigo Robocopy: !RC!"
    goto :fim_erro
)
call :ok "Nova fonte copiada para o projeto."

rem Remove BATs operacionais antigos que permanecem como arquivos extras
rem no projeto e fariam a validacao de coesao reprovar.
>>"%LOG%" echo Removendo BATs operacionais antigos da raiz do projeto...
for %%B in (
    "%PROJETO%\ATUALIZAR_MYCAR_V5_41_WEB_ANDROID*.bat"
    "%PROJETO%\ATUALIZAR_MYCAR_V5_42_WEB_ANDROID*.bat"
    "%PROJETO%\ATUALIZAR_MYCAR_V5_43_WEB_ANDROID*.bat"
    "%PROJETO%\ATUALIZAR_MYCAR_V5_44_WEB_ANDROID*.bat"
    "%PROJETO%\ATUALIZAR_MYCAR_V5_45_WEB_ANDROID*.bat"
    "%PROJETO%\ATUALIZAR_MYCAR_V5_46_WEB_ANDROID*.bat"
    "%PROJETO%\ATUALIZAR_MYCAR_V5_47_WEB_ANDROID*.bat"
    "%PROJETO%\ATUALIZAR_MYCAR_V5_48_WEB_ANDROID*.bat"
    "%PROJETO%\ATUALIZAR_MYCAR_V5_49_WEB_ANDROID*.bat"
    "%PROJETO%\ATUALIZAR_MYCAR_V5_50_WEB_ANDROID*.bat"
    "%PROJETO%\ATUALIZAR_MYCAR_V5_51_WEB_ANDROID*.bat"
    "%PROJETO%\ATUALIZAR_MYCAR_V5_52_WEB_ANDROID*.bat"
    "%PROJETO%\ATUALIZAR_MYCAR_V5_53_WEB_ANDROID*.bat"
    "%PROJETO%\ATUALIZAR_MYCAR_V5_54_WEB_ANDROID*.bat"
) do (
    if exist "%%~fB" (
        >>"%LOG%" echo Excluindo: %%~fB
        del /F /Q "%%~fB" >>"%LOG%" 2>&1
    )
)

rem Remove instaladores parciais antigos da V5.68 que dependiam de PS1.
for %%P in (
    "%PROJETO%\APLICAR_ATUALIZACAO_MYCAR_V5_68.ps1"
    "%PROJETO%\ATUALIZAR_MYCAR_V5_68.bat"
) do (
    if exist "%%~fP" (
        >>"%LOG%" echo Excluindo instalador parcial: %%~fP
        del /F /Q "%%~fP" >>"%LOG%" 2>&1
    )
)

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
git commit -m "Atualiza MyCar+ para V5.68" >>"%LOG%" 2>&1
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
