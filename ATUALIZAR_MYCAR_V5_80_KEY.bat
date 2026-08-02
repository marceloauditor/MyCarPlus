@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul
title Atualizacao MyCar+ V5.80 KEY

set "VERSAO=5.80"
set "ZIP_PREFIX=MYCAR_PLUS_V5_80_KEY"
set "ZIP_ESPERADO=MYCAR_PLUS_V5_80_KEY.zip"
set "PASTA_INTERNA=MYCAR_PLUS_V5_80_KEY"
set "PROJETO=%USERPROFILE%\Documents\GitHub\MyCarPlus"
set "DOWNLOADS=%USERPROFILE%\Downloads"
set "WORKTEMP=%DOWNLOADS%\MYCAR_PLUS_V5_80_KEY_TEMP"
set "LOG=%DOWNLOADS%\ATUALIZACAO_MYCAR_V5_80_KEY_LOG.txt"
set "APK_DESTINO=%DOWNLOADS%\MYCAR_PLUS_V5_80_KEY_DEBUG.apk"
set "STUDIO=C:\Program Files\Android\Android Studio\bin\studio64.exe"

> "%LOG%" echo ============================================================
>>"%LOG%" echo ATUALIZACAO MYCAR+ V5.80 KEY
>>"%LOG%" echo Inicio: %DATE% %TIME%
>>"%LOG%" echo Projeto: %PROJETO%
>>"%LOG%" echo ============================================================

echo.
echo ============================================================
echo ATUALIZACAO MYCAR+ V5.80 KEY
echo ============================================================

set "ZIP="
for /f "delims=" %%F in ('dir /b /a-d /o-d "%DOWNLOADS%\%ZIP_PREFIX%*.zip" 2^>nul') do (
    if not defined ZIP set "ZIP=%DOWNLOADS%\%%F"
)
if not defined ZIP (
    echo [ERRO] ZIP %ZIP_ESPERADO% nao encontrado em Downloads.
    >>"%LOG%" echo [ERRO] ZIP nao encontrado.
    goto :fim_erro
)
echo [OK] ZIP selecionado: %ZIP%
>>"%LOG%" echo ZIP: %ZIP%

where node.exe >>"%LOG%" 2>&1 || goto :erro_node
where npm.cmd >>"%LOG%" 2>&1 || goto :erro_npm
where git.exe >>"%LOG%" 2>&1 || goto :erro_git

if not exist "%PROJETO%\package.json" (
    echo [ERRO] Projeto nao encontrado: %PROJETO%
    >>"%LOG%" echo [ERRO] Projeto nao encontrado.
    goto :fim_erro
)

set "STAMP=%DATE:~6,4%%DATE:~3,2%%DATE:~0,2%_%TIME:~0,2%%TIME:~3,2%%TIME:~6,2%"
set "STAMP=%STAMP: =0%"
set "BACKUP=%USERPROFILE%\Documents\GitHub\MyCarPlus_BACKUP_ANTES_V5_80_%STAMP%"

echo.
echo [1/10] Criando backup...
robocopy "%PROJETO%" "%BACKUP%" /E /R:2 /W:2 ^
 /XD ".git" "node_modules" "android\.gradle" "android\build" "android\app\build" >>"%LOG%"
if errorlevel 8 goto :erro_backup
echo [OK] Backup criado.

echo.
echo [2/10] Extraindo pacote...
if exist "%WORKTEMP%" rmdir /S /Q "%WORKTEMP%"
mkdir "%WORKTEMP%"
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
 "Expand-Archive -LiteralPath '%ZIP%' -DestinationPath '%WORKTEMP%' -Force" >>"%LOG%" 2>&1
if errorlevel 1 goto :erro_extracao

set "FONTE=%WORKTEMP%\%PASTA_INTERNA%"
if not exist "%FONTE%\package.json" (
    for /f "delims=" %%D in ('dir /b /ad "%WORKTEMP%" 2^>nul') do (
        if exist "%WORKTEMP%\%%D\package.json" set "FONTE=%WORKTEMP%\%%D"
    )
)
if not exist "%FONTE%\package.json" goto :erro_fonte
echo [OK] Fonte: %FONTE%
>>"%LOG%" echo Fonte: %FONTE%

echo.
echo [3/10] Limpando residuos antigos do projeto Android...
set "LX=%PROJETO%\android\app\src\main\java\br\com\marceloauditor\mycarplus\lx"
if exist "%LX%" (
    >>"%LOG%" echo Excluindo pasta residual: %LX%
    rmdir /S /Q "%LX%" >>"%LOG%" 2>&1
)
for /d /r "%PROJETO%\android\app\src\main\java" %%D in (
    MYCAR_PLUS_V5_57_TEMP
    MYCAR_PLUS_V5_58_TEMP
    MYCAR_PLUS_V5_59_TEMP
    MYCAR_PLUS_V5_60_TEMP
    MYCAR_PLUS_V5_61_TEMP
    MYCAR_PLUS_V5_62_TEMP
    MYCAR_PLUS_V5_63_TEMP
    MYCAR_PLUS_V5_64_TEMP
    MYCAR_PLUS_V5_65_TEMP
    MYCAR_PLUS_V5_66_TEMP
    MYCAR_PLUS_V5_67_TEMP
    MYCAR_PLUS_V5_68_TEMP
    MYCAR_PLUS_V5_69_TEMP
    MYCAR_PLUS_V5_70_TEMP
    MYCAR_PLUS_V5_71_TEMP
    MYCAR_PLUS_V5_72_TEMP
    MYCAR_PLUS_V5_73_TEMP
    MYCAR_PLUS_V5_74_TEMP
    MYCAR_PLUS_V5_75_TEMP
    MYCAR_PLUS_V5_76_TEMP
    MYCAR_PLUS_V5_77_TEMP
    MYCAR_PLUS_V5_78_TEMP
    MYCAR_PLUS_V5_80_TEMP
    MYCAR_PLUS_V5_70_MASTER
    MYCAR_PLUS_V5_71_MASTER
    MYCAR_PLUS_V5_72_MASTER
    MYCAR_PLUS_V5_73_MASTER
    MYCAR_PLUS_V5_74_MASTER
    MYCAR_PLUS_V5_75_MASTER
    MYCAR_PLUS_V5_76_MASTER
    MYCAR_PLUS_V5_77_MASTER
    MYCAR_PLUS_V5_78_MASTER
    MYCAR_PLUS_V5_80_MASTER
    MYCAR_PLUS_V5_70_TREE
    MYCAR_PLUS_V5_71_TREE
    MYCAR_PLUS_V5_72_TREE
    MYCAR_PLUS_V5_73_TREE
    MYCAR_PLUS_V5_74_TREE
    MYCAR_PLUS_V5_75_TREE
    MYCAR_PLUS_V5_76_TREE
    MYCAR_PLUS_V5_77_TREE
    MYCAR_PLUS_V5_78_TREE
    MYCAR_PLUS_V5_80_TREE
    MYCAR_PLUS_V5_70_KEY
    MYCAR_PLUS_V5_71_KEY
    MYCAR_PLUS_V5_72_KEY
    MYCAR_PLUS_V5_73_KEY
    MYCAR_PLUS_V5_74_KEY
    MYCAR_PLUS_V5_75_KEY
    MYCAR_PLUS_V5_76_KEY
    MYCAR_PLUS_V5_77_KEY
    MYCAR_PLUS_V5_78_KEY
    MYCAR_PLUS_V5_80_KEY
) do (
    if exist "%%~fD" rmdir /S /Q "%%~fD" >>"%LOG%" 2>&1
)
echo [OK] Residuos removidos.

echo.
echo [4/10] Atualizando a fonte local...
robocopy "%FONTE%" "%PROJETO%" /E /R:2 /W:2 ^
 /XD ".git" "node_modules" "android\.gradle" "android\build" "android\app\build" ^
 /XF "local.properties" "*_LOG.txt" >>"%LOG%"
if errorlevel 8 goto :erro_copia
echo [OK] Fonte atualizada.

cd /d "%PROJETO%"

echo.
echo [5/10] Instalando dependencias...
call npm.cmd install >>"%LOG%" 2>&1
if errorlevel 1 goto :erro_npm_install
echo [OK] Dependencias instaladas.

echo.
echo [6/10] Sincronizando Web e Android...
call npm.cmd run sync:web >>"%LOG%" 2>&1
if errorlevel 1 goto :erro_web
call npx.cmd cap sync android >>"%LOG%" 2>&1
if errorlevel 1 goto :erro_android
echo [OK] Web e Android sincronizados.

echo.
echo [7/10] Validando coesao funcional...
call npm.cmd run validate:cohesion >>"%LOG%" 2>&1
if errorlevel 1 goto :erro_coesao
echo [OK] Coesao funcional aprovada.

echo.
echo [8/10] Atualizando GitHub...
git add . >>"%LOG%" 2>&1
git diff --cached --quiet
if errorlevel 1 (
    git commit -m "Atualiza MyCar+ para V5.80 KEY" >>"%LOG%" 2>&1
    if errorlevel 1 goto :erro_commit
    git push >>"%LOG%" 2>&1
    if errorlevel 1 goto :erro_push
    echo [OK] GitHub atualizado.
) else (
    echo [INFO] Nenhuma alteracao nova para enviar ao GitHub.
    >>"%LOG%" echo [INFO] Nenhuma alteracao nova para commit.
)

echo.
echo [9/10] Abrindo Android Studio e sincronizando o projeto...
if exist "%STUDIO%" (
    start "" "%STUDIO%" "%PROJETO%\android"
    echo [OK] Android Studio aberto.
    >>"%LOG%" echo [OK] Android Studio aberto: %STUDIO%
) else (
    call npx.cmd cap open android >>"%LOG%" 2>&1
    if errorlevel 1 (
        echo [AVISO] Nao foi possivel abrir o Android Studio automaticamente.
        >>"%LOG%" echo [AVISO] Android Studio nao localizado.
    ) else (
        echo [OK] Android Studio aberto pelo Capacitor.
    )
)

echo.
echo [10/10] Gerando APK debug...
if exist "%PROJETO%\android\app\build" rmdir /S /Q "%PROJETO%\android\app\build" >>"%LOG%" 2>&1
if exist "%PROJETO%\android\build" rmdir /S /Q "%PROJETO%\android\build" >>"%LOG%" 2>&1
pushd "%PROJETO%\android"
call gradlew.bat assembleDebug >>"%LOG%" 2>&1
set "BUILD_RESULT=%ERRORLEVEL%"
popd

if not "%BUILD_RESULT%"=="0" (
    echo [ERRO] O APK nao foi gerado. GitHub e Android Studio ja foram atualizados.
    >>"%LOG%" echo [ERRO] Build APK falhou, codigo %BUILD_RESULT%.
    goto :fim_erro
)

set "APK_ORIGEM=%PROJETO%\android\app\build\outputs\apk\debug\app-debug.apk"
if not exist "%APK_ORIGEM%" goto :erro_apk
copy /Y "%APK_ORIGEM%" "%APK_DESTINO%" >>"%LOG%" 2>&1
echo [OK] APK: %APK_DESTINO%
>>"%LOG%" echo APK: %APK_DESTINO%

if exist "%WORKTEMP%" rmdir /S /Q "%WORKTEMP%"

echo.
echo ============================================================
echo ATUALIZACAO V5.80 KEY CONCLUIDA COM SUCESSO
echo GitHub atualizado.
echo Android Studio aberto.
echo APK: %APK_DESTINO%
echo Log: %LOG%
echo ============================================================
>>"%LOG%" echo [OK] Atualizacao concluida em %DATE% %TIME%.
pause
exit /b 0

:erro_node
echo [ERRO] Node.js nao encontrado.
goto :fim_erro
:erro_npm
echo [ERRO] npm.cmd nao encontrado.
goto :fim_erro
:erro_git
echo [ERRO] Git nao encontrado.
goto :fim_erro
:erro_backup
echo [ERRO] Falha ao criar backup.
goto :fim_erro
:erro_extracao
echo [ERRO] Falha ao extrair o ZIP.
goto :fim_erro
:erro_fonte
echo [ERRO] Pasta interna KEY nao localizada.
goto :fim_erro
:erro_copia
echo [ERRO] Falha ao copiar a fonte.
goto :fim_erro
:erro_npm_install
echo [ERRO] npm install falhou.
goto :fim_erro
:erro_web
echo [ERRO] Sincronizacao Web falhou.
goto :fim_erro
:erro_android
echo [ERRO] Sincronizacao Android falhou.
goto :fim_erro
:erro_coesao
echo [ERRO] Coesao funcional reprovada.
goto :fim_erro
:erro_commit
echo [ERRO] Falha no commit Git.
goto :fim_erro
:erro_push
echo [ERRO] Falha no git push.
goto :fim_erro
:erro_apk
echo [ERRO] Build terminou, mas o APK nao foi localizado.
goto :fim_erro

:fim_erro
>>"%LOG%" echo [ERRO] Atualizacao interrompida em %DATE% %TIME%.
echo.
echo ============================================================
echo PROCESSO INTERROMPIDO
echo Consulte o log:
echo %LOG%
echo ============================================================
if exist "%WORKTEMP%" rmdir /S /Q "%WORKTEMP%"
pause
exit /b 1
