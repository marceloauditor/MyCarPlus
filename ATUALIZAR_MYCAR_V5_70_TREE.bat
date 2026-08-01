@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul
title Atualização MyCar+ V5.70 TREE

set "VERSAO=5.70"
set "ZIP_PREFIX=MYCAR_PLUS_V5_70_TREE"
set "PASTA_INTERNA=MYCAR_PLUS_V5_70_TREE"
set "PROJETO=%USERPROFILE%\Documents\GitHub\MyCarPlus"
set "DOWNLOADS=%USERPROFILE%\Downloads"
set "WORKTEMP=%DOWNLOADS%\MYCAR_PLUS_V5_70_TREE_TEMP"
set "LOG=%DOWNLOADS%\ATUALIZACAO_MYCAR_V5_70_TREE_LOG.txt"
set "BACKUP=%USERPROFILE%\Documents\GitHub\MyCarPlus_BACKUP_ANTES_V5_70_%DATE:~6,4%%DATE:~3,2%%DATE:~0,2%_%TIME:~0,2%%TIME:~3,2%%TIME:~6,2%"
set "BACKUP=%BACKUP: =0%"

> "%LOG%" echo ============================================================
>>"%LOG%" echo ATUALIZACAO MYCAR+ V5.70 TREE
>>"%LOG%" echo Inicio: %DATE% %TIME%
>>"%LOG%" echo Projeto: %PROJETO%
>>"%LOG%" echo ============================================================

echo.
echo ============================================================
echo ATUALIZACAO MYCAR+ V5.70 TREE
echo ============================================================
echo.

rem 1. Localizar o ZIP mais recente
set "ZIP="
for /f "delims=" %%F in ('dir /b /a-d /o-d "%DOWNLOADS%\%ZIP_PREFIX%*.zip" 2^>nul') do (
    if not defined ZIP set "ZIP=%DOWNLOADS%\%%F"
)

if not defined ZIP (
    echo [ERRO] Nenhum ZIP da V5.70 TREE foi encontrado em Downloads.
    >>"%LOG%" echo [ERRO] Nenhum ZIP compatível encontrado.
    goto :fim_erro
)

echo [OK] ZIP selecionado: %ZIP%
>>"%LOG%" echo ZIP: %ZIP%

rem 2. Validar ferramentas e projeto
where node.exe >>"%LOG%" 2>&1 || goto :erro_node
where npm.cmd >>"%LOG%" 2>&1 || goto :erro_npm
where git.exe >>"%LOG%" 2>&1 || goto :erro_git

if not exist "%PROJETO%" (
    echo [ERRO] Projeto não encontrado: %PROJETO%
    >>"%LOG%" echo [ERRO] Projeto não encontrado.
    goto :fim_erro
)

rem 3. Backup
echo.
echo [1/9] Criando backup...
>>"%LOG%" echo [1/9] Criando backup em %BACKUP%
robocopy "%PROJETO%" "%BACKUP%" /E /R:2 /W:2 /XD ".git" "node_modules" "android\.gradle" "android\build" "android\app\build" >>"%LOG%"
if errorlevel 8 (
    echo [ERRO] Falha ao criar backup.
    goto :fim_erro
)
echo [OK] Backup criado.

rem 4. Extrair ZIP
echo.
echo [2/9] Extraindo pacote...
if exist "%WORKTEMP%" rmdir /S /Q "%WORKTEMP%"
mkdir "%WORKTEMP%" || goto :fim_erro

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "Expand-Archive -LiteralPath '%ZIP%' -DestinationPath '%WORKTEMP%' -Force" >>"%LOG%" 2>&1
if errorlevel 1 (
    echo [ERRO] Falha ao extrair o ZIP.
    goto :fim_erro
)

set "FONTE=%WORKTEMP%\%PASTA_INTERNA%"
if not exist "%FONTE%\package.json" (
    for /f "delims=" %%D in ('dir /b /ad "%WORKTEMP%" 2^>nul') do (
        if exist "%WORKTEMP%\%%D\package.json" set "FONTE=%WORKTEMP%\%%D"
    )
)
if not exist "%FONTE%\package.json" (
    echo [ERRO] Pasta interna do projeto não encontrada.
    >>"%LOG%" echo [ERRO] Fonte extraída não localizada.
    goto :fim_erro
)
echo [OK] Fonte localizada: %FONTE%
>>"%LOG%" echo Fonte: %FONTE%

rem 5. Atualizar fonte real
echo.
echo [3/9] Atualizando projeto GitHub local...
robocopy "%FONTE%" "%PROJETO%" /E /R:2 /W:2 ^
 /XD ".git" "node_modules" "android\.gradle" "android\build" "android\app\build" ^
 /XF "local.properties" "ATUALIZACAO_MYCAR_V5_70_TREE_LOG.txt" >>"%LOG%"
if errorlevel 8 (
    echo [ERRO] Falha ao copiar a nova versão.
    goto :fim_erro
)

rem Remover resíduos conhecidos de extrações antigas dentro do código Java
for /d /r "%PROJETO%\android\app\src\main\java" %%D in (
    MYCAR_PLUS_V5_70_TEMP
    MYCAR_PLUS_V5_70_MASTER
    MYCAR_PLUS_V5_70_TREE
) do (
    if exist "%%~fD" rmdir /S /Q "%%~fD" >>"%LOG%" 2>&1
)

rem Manter somente a MainActivity oficial
set "MAIN_OFICIAL=%PROJETO%\android\app\src\main\java\br\com\marceloauditor\mycarplus\MainActivity.java"
for /f "delims=" %%F in ('where /R "%PROJETO%\android\app\src\main\java" MainActivity.java 2^>nul') do (
    if /I not "%%~fF"=="%MAIN_OFICIAL%" del /F /Q "%%~fF" >>"%LOG%" 2>&1
)

rem Limpar testes padrão antigos do Capacitor
if exist "%PROJETO%\android\app\src\androidTest\java\com\getcapacitor\myapp" ^
  rmdir /S /Q "%PROJETO%\android\app\src\androidTest\java\com\getcapacitor\myapp" >>"%LOG%" 2>&1
if exist "%PROJETO%\android\app\src\test\java\com\getcapacitor\myapp" ^
  rmdir /S /Q "%PROJETO%\android\app\src\test\java\com\getcapacitor\myapp" >>"%LOG%" 2>&1

echo [OK] Fonte atualizada.

cd /d "%PROJETO%" || goto :fim_erro

rem 6. Dependências
echo.
echo [4/9] Instalando dependências...
call npm.cmd install >>"%LOG%" 2>&1
if errorlevel 1 (
    echo [ERRO] npm install falhou.
    goto :fim_erro
)
echo [OK] Dependências instaladas.

rem 7. Web
echo.
echo [5/9] Sincronizando Web...
call npm.cmd run sync:web >>"%LOG%" 2>&1
if errorlevel 1 (
    echo [ERRO] Falha na sincronização Web.
    goto :fim_erro
)
echo [OK] Web sincronizada.

rem 8. Android/Capacitor
echo.
echo [6/9] Sincronizando Android...
call npx.cmd cap sync android >>"%LOG%" 2>&1
if errorlevel 1 (
    echo [ERRO] Falha no cap sync android.
    goto :fim_erro
)
echo [OK] Android sincronizado.

rem 9. Coesão funcional
echo.
echo [7/9] Validando coesão funcional...
call npm.cmd run validate:cohesion >>"%LOG%" 2>&1
if errorlevel 1 (
    echo [ERRO] Validação de coesão reprovada.
    goto :fim_erro
)
echo [OK] Coesão funcional aprovada.

rem 10. Build APK
echo.
echo [8/9] Gerando APK debug...
if exist "%PROJETO%\android\app\build" rmdir /S /Q "%PROJETO%\android\app\build" >>"%LOG%" 2>&1
if exist "%PROJETO%\android\build" rmdir /S /Q "%PROJETO%\android\build" >>"%LOG%" 2>&1

pushd "%PROJETO%\android"
call gradlew.bat assembleDebug >>"%LOG%" 2>&1
set "GRADLE_RESULT=%ERRORLEVEL%"
popd
if not "%GRADLE_RESULT%"=="0" (
    echo [ERRO] Falha na geração do APK.
    goto :fim_erro
)

set "APK_ORIGEM=%PROJETO%\android\app\build\outputs\apk\debug\app-debug.apk"
set "APK_DESTINO=%DOWNLOADS%\MYCAR_PLUS_V5_70_TREE_DEBUG.apk"
if exist "%APK_ORIGEM%" (
    copy /Y "%APK_ORIGEM%" "%APK_DESTINO%" >>"%LOG%" 2>&1
    echo [OK] APK gerado: %APK_DESTINO%
) else (
    echo [ERRO] APK não localizado após o build.
    goto :fim_erro
)

rem 11. GitHub
echo.
echo [9/9] Atualizando GitHub...
cd /d "%PROJETO%"
git add . >>"%LOG%" 2>&1
git diff --cached --quiet
if errorlevel 1 (
    git commit -m "Atualiza MyCar+ para V5.70 TREE" >>"%LOG%" 2>&1
    if errorlevel 1 (
        echo [ERRO] Falha no commit Git.
        goto :fim_erro
    )
    git push >>"%LOG%" 2>&1
    if errorlevel 1 (
        echo [ERRO] Falha no git push.
        goto :fim_erro
    )
    echo [OK] GitHub atualizado.
) else (
    echo [INFO] Nenhuma alteração nova para enviar ao GitHub.
    >>"%LOG%" echo [INFO] Nenhuma alteração para commit.
)

rem Abrir Android Studio com o projeto Android
set "STUDIO=C:\Program Files\Android\Android Studio\bin\studio64.exe"
if exist "%STUDIO%" (
    start "" "%STUDIO%" "%PROJETO%\android"
    echo [OK] Android Studio aberto.
    >>"%LOG%" echo [OK] Android Studio aberto.
) else (
    echo [AVISO] Android Studio não encontrado no caminho padrão.
    >>"%LOG%" echo [AVISO] Android Studio não encontrado.
)

if exist "%WORKTEMP%" rmdir /S /Q "%WORKTEMP%"

echo.
echo ============================================================
echo ATUALIZAÇÃO V5.70 TREE CONCLUÍDA COM SUCESSO
echo Log: %LOG%
echo APK: %APK_DESTINO%
echo ============================================================
>>"%LOG%" echo [OK] Atualização concluída com sucesso.
echo.
pause
exit /b 0

:erro_node
echo [ERRO] Node.js não encontrado.
>>"%LOG%" echo [ERRO] Node.js não encontrado.
goto :fim_erro

:erro_npm
echo [ERRO] npm.cmd não encontrado.
>>"%LOG%" echo [ERRO] npm.cmd não encontrado.
goto :fim_erro

:erro_git
echo [ERRO] Git não encontrado.
>>"%LOG%" echo [ERRO] Git não encontrado.
goto :fim_erro

:fim_erro
echo.
echo ============================================================
echo ATUALIZAÇÃO INTERROMPIDA COM ERRO
echo Consulte o log em:
echo %LOG%
echo ============================================================
>>"%LOG%" echo [ERRO] Atualização interrompida em %DATE% %TIME%.
echo.
pause
exit /b 1
