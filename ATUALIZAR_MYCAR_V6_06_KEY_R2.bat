@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul
title Atualizacao MyCar+ V6.06 KEY

set "VERSAO=6.06"
set "VERSAO_SEM_PONTO=606"
set "REVISAO_ATUALIZADOR=R2"
set "ZIP_PREFIX=MYCAR_PLUS_V6_06_KEY_R2"
set "ZIP_ESPERADO=MYCAR_PLUS_V6_06_KEY_R2.zip"
set "PASTA_INTERNA=MYCAR_PLUS_V6_06_KEY_R2"
set "PROJETO=%USERPROFILE%\Documents\GitHub\MyCarPlus"
set "DOWNLOADS=%USERPROFILE%\Downloads"
set "WORKTEMP=%DOWNLOADS%\MYCAR_PLUS_V6_06_KEY_R2_TEMP"
set "LOG=%DOWNLOADS%\ATUALIZACAO_MYCAR_V6_06_KEY_R2_LOG.txt"
set "DIAGNOSTICO=%DOWNLOADS%\DIAGNOSTICO_MYCAR_V6_06_R2.txt"
set "APK_DESTINO=%DOWNLOADS%\MYCAR_PLUS_V6_06_KEY_R2_DEBUG.apk"
set "STUDIO=C:\Program Files\Android\Android Studio\bin\studio64.exe"
set "STAGE=INICIALIZACAO"
set "MOTIVO=Falha nao identificada"
set "MODIFICOU_PROJETO=0"

>"%LOG%" echo ============================================================
>>"%LOG%" echo ATUALIZACAO MYCAR+ V6.06 KEY COM CHECKLIST - REVISAO R2
>>"%LOG%" echo Inicio: %DATE% %TIME%
>>"%LOG%" echo Projeto: %PROJETO%
>>"%LOG%" echo Diagnostico: %DIAGNOSTICO%
>>"%LOG%" echo ============================================================

>"%DIAGNOSTICO%" echo ============================================================
>>"%DIAGNOSTICO%" echo DIAGNOSTICO MYCAR+ V6.06
>>"%DIAGNOSTICO%" echo Inicio: %DATE% %TIME%
>>"%DIAGNOSTICO%" echo ============================================================

echo.
echo ============================================================
echo ATUALIZACAO MYCAR+ V6.06 KEY COM CHECKLIST - REVISAO R2
echo ============================================================

set "ZIP=%DOWNLOADS%\%ZIP_ESPERADO%"
if not exist "%ZIP%" (
  set "ZIP="
  for /f "delims=" %%F in ('dir /b /a-d /o-d "%DOWNLOADS%\%ZIP_PREFIX%*.zip" 2^>nul') do if not defined ZIP set "ZIP=%DOWNLOADS%\%%F"
)
if not defined ZIP (
  set "STAGE=LOCALIZACAO_ZIP"
  set "MOTIVO=ZIP %ZIP_ESPERADO% nao encontrado em Downloads"
  goto :fim_erro
)
echo [OK] ZIP selecionado: %ZIP%
>>"%LOG%" echo [OK] ZIP: %ZIP%

where node.exe >>"%LOG%" 2>&1
if errorlevel 1 (
  set "STAGE=FERRAMENTAS"
  set "MOTIVO=Node.js nao encontrado"
  goto :fim_erro
)
where npm.cmd >>"%LOG%" 2>&1
if errorlevel 1 (
  set "STAGE=FERRAMENTAS"
  set "MOTIVO=npm.cmd nao encontrado"
  goto :fim_erro
)
where git.exe >>"%LOG%" 2>&1
if errorlevel 1 (
  set "STAGE=FERRAMENTAS"
  set "MOTIVO=Git nao encontrado"
  goto :fim_erro
)
if not exist "%PROJETO%\package.json" (
  set "STAGE=LOCALIZACAO_PROJETO"
  set "MOTIVO=Projeto nao encontrado em %PROJETO%"
  goto :fim_erro
)

set "STAMP=%DATE:~6,4%%DATE:~3,2%%DATE:~0,2%_%TIME:~0,2%%TIME:~3,2%%TIME:~6,2%"
set "STAMP=%STAMP: =0%"
set "BACKUP=%USERPROFILE%\Documents\GitHub\MyCarPlus_BACKUP_ANTES_V6_06_%STAMP%"

echo.
echo [1/12] Extraindo o pacote sem alterar o projeto...
set "STAGE=EXTRACAO_ZIP"
if exist "%WORKTEMP%" rmdir /S /Q "%WORKTEMP%"
mkdir "%WORKTEMP%"
powershell -NoProfile -ExecutionPolicy Bypass -Command "Expand-Archive -LiteralPath '%ZIP%' -DestinationPath '%WORKTEMP%' -Force" >>"%LOG%" 2>&1
if errorlevel 1 (
  set "MOTIVO=Falha ao extrair o ZIP"
  goto :fim_erro
)
set "FONTE=%WORKTEMP%\%PASTA_INTERNA%"
if not exist "%FONTE%\package.json" (
  for /f "delims=" %%D in ('dir /b /ad "%WORKTEMP%" 2^>nul') do if exist "%WORKTEMP%\%%D\package.json" set "FONTE=%WORKTEMP%\%%D"
)
if not exist "%FONTE%\package.json" (
  set "MOTIVO=Pasta interna com package.json nao localizada"
  goto :fim_erro
)
echo [OK] Fonte extraida: %FONTE%
>>"%LOG%" echo [OK] Fonte: %FONTE%

echo.
echo [2/12] Executando checklist do pacote antes do backup...
set "STAGE=CHECKLIST_PREVIO"
node.exe "%FONTE%\scripts\check-update-package.js" --root "%FONTE%" --mode package --diagnostic "%DIAGNOSTICO%" --log "%LOG%"
if errorlevel 1 (
  set "MOTIVO=Checklist previo reprovado. Consulte %DIAGNOSTICO%"
  goto :fim_erro
)
echo [OK] Pacote aprovado antes de qualquer alteracao.

echo.
echo [3/12] Criando backup sem caches nem builds...
set "STAGE=BACKUP"
robocopy "%PROJETO%" "%BACKUP%" /E /R:2 /W:2 ^
 /XD "%PROJETO%\.git" "%PROJETO%\node_modules" "%PROJETO%\android\.gradle" "%PROJETO%\android\build" "%PROJETO%\android\app\build" "%PROJETO%\android\capacitor-cordova-android-plugins\build" ^
 /XF "local.properties" "*_LOG.txt" >>"%LOG%"
if errorlevel 8 (
  set "MOTIVO=Falha ao criar backup"
  goto :fim_erro
)
echo [OK] Backup: %BACKUP%
>>"%DIAGNOSTICO%" echo [CHK-BACKUP-001][OK] Backup criado — %BACKUP%

echo.
echo [4/12] Removendo residuos operacionais antigos...
set "STAGE=LIMPEZA_CONTROLADA"
set "LX=%PROJETO%\android\app\src\main\java\br\com\marceloauditor\mycarplus\lx"
if exist "%LX%" rmdir /S /Q "%LX%" >>"%LOG%" 2>&1
del /F /Q "%PROJETO%\ATUALIZAR_MYCAR_V*.bat" >>"%LOG%" 2>&1
del /F /Q "%PROJETO%\ATUALIZACAO_MYCAR_V*_LOG.txt" >>"%LOG%" 2>&1
del /F /Q "%PROJETO%\CHANGELOG_V*.md" >>"%LOG%" 2>&1
del /F /Q "%PROJETO%\CORRECAO_V*.txt" >>"%LOG%" 2>&1
del /F /Q "%PROJETO%\PROPOSTA_IMPLEMENTADA_MYCAR_PLUS_V*.md" >>"%LOG%" 2>&1
del /F /Q "%PROJETO%\RESULTADO_VALIDACAO_BAT_V*.txt" >>"%LOG%" 2>&1
del /F /Q "%PROJETO%\RESULTADO_VALIDACAO_COESAO_V*.txt" >>"%LOG%" 2>&1
del /F /Q "%PROJETO%\VALIDACAO_PACOTE_V*_KEY.txt" >>"%LOG%" 2>&1
del /F /Q "%PROJETO%\MANUAL_AJUDA_MYCAR_PLUS_V*.html" >>"%LOG%" 2>&1
del /F /Q "%PROJETO%\HOTFIX_COMPILACAO_ANDROID_V*.md" >>"%LOG%" 2>&1
del /F /Q "%PROJETO%\COMPARACAO_BAT_V*.txt" >>"%LOG%" 2>&1
del /F /Q "%PROJETO%\CONSOLIDADO_AJUSTES_E_PARAMETRIZACOES_PENDENTES_MYCAR_PLUS_V*.md" >>"%LOG%" 2>&1
del /F /Q "%PROJETO%\ROTEIRO_FIREBASE_BASE_OFICIAL_V*.md" >>"%LOG%" 2>&1
del /F /Q "%PROJETO%\CHECKLIST_MONTAGEM_E_DIAGNOSTICO_V*.md" >>"%LOG%" 2>&1
del /F /Q "%PROJETO%\MANIFEST_SHA256_V*.txt" >>"%LOG%" 2>&1
del /F /Q "%PROJETO%\EXECUTAR_CHECKLIST_MONTAGEM_V*.bat" >>"%LOG%" 2>&1
for /d /r "%PROJETO%\android\app\src\main\java" %%D in (MYCAR_PLUS_V*_TEMP MYCAR_PLUS_V*_MASTER MYCAR_PLUS_V*_TREE MYCAR_PLUS_V*_KEY) do if exist "%%~fD" rmdir /S /Q "%%~fD" >>"%LOG%" 2>&1
if exist "%PROJETO%\ATUALIZAR_MYCAR_V6_05_KEY.bat" (
  set "MOTIVO=Limpeza controlada nao removeu ATUALIZAR_MYCAR_V6_05_KEY.bat"
  goto :fim_erro
)
if exist "%PROJETO%\VALIDACAO_PACOTE_V6_05_KEY.txt" (
  set "MOTIVO=Limpeza controlada nao removeu VALIDACAO_PACOTE_V6_05_KEY.txt"
  goto :fim_erro
)
echo [OK] Limpeza controlada R2 concluida.

echo.
echo [5/12] Copiando a V6.06 para o projeto...
set "STAGE=COPIA_FONTE"
set "MODIFICOU_PROJETO=1"
robocopy "%FONTE%" "%PROJETO%" /E /R:2 /W:2 ^
 /XD "%FONTE%\.git" "%FONTE%\node_modules" "%FONTE%\android\.gradle" "%FONTE%\android\build" "%FONTE%\android\app\build" "%FONTE%\android\capacitor-cordova-android-plugins\build" ^
 /XF "local.properties" "*_LOG.txt" >>"%LOG%"
if errorlevel 8 (
  set "MOTIVO=Falha ao copiar a fonte V6.06"
  goto :fim_erro
)
echo [OK] Fonte atualizada.
cd /d "%PROJETO%"

echo.
echo [6/12] Validando dependencias npm e Capacitor...
set "STAGE=DEPENDENCIAS"
call npm.cmd config set registry https://registry.npmjs.org/ >>"%LOG%" 2>&1
call npm.cmd cache verify >>"%LOG%" 2>&1
set "DEPENDENCIAS_OK="
if exist "%PROJETO%\node_modules\@capacitor\cli\package.json" (
  call npx.cmd cap --version >>"%LOG%" 2>&1
  if not errorlevel 1 set "DEPENDENCIAS_OK=1"
)
if defined DEPENDENCIAS_OK goto :dependencias_prontas
echo [INFO] Executando npm ci...
call npm.cmd ci --prefer-offline --no-audit --no-fund >>"%LOG%" 2>&1
if not errorlevel 1 goto :dependencias_prontas
>>"%LOG%" echo [AVISO] npm ci falhou; tentando npm install de contingencia.
call npm.cmd cache clean --force >>"%LOG%" 2>&1
call npm.cmd install --legacy-peer-deps --no-audit --no-fund >>"%LOG%" 2>&1
if errorlevel 1 (
  set "MOTIVO=Falha ao validar ou instalar dependencias npm"
  goto :fim_erro
)
:dependencias_prontas
echo [OK] Dependencias disponíveis.

echo.
echo [7/12] Sincronizando raiz, Web e Android...
set "STAGE=SINCRONIZACAO"
call npm.cmd run sync:web >>"%LOG%" 2>&1
if errorlevel 1 (
  set "MOTIVO=Falha em npm run sync:web"
  goto :fim_erro
)
call npx.cmd cap sync android >>"%LOG%" 2>&1
if errorlevel 1 (
  set "MOTIVO=Falha em npx cap sync android"
  goto :fim_erro
)
echo [OK] Sincronizacao concluida.

echo.
echo [8/12] Executando checklist depois da sincronizacao...
set "STAGE=CHECKLIST_POS_SINCRONIZACAO"
node.exe "%PROJETO%\scripts\check-update-package.js" --root "%PROJETO%" --mode installed --diagnostic "%DIAGNOSTICO%" --log "%LOG%"
if errorlevel 1 (
  set "MOTIVO=Checklist apos sincronizacao reprovado. Consulte %DIAGNOSTICO%"
  goto :fim_erro
)
echo [OK] Versao e arquivos confirmados em todas as camadas.

echo.
echo [9/12] Executando validacao funcional de coesao...
set "STAGE=VALIDACAO_COESAO"
call npm.cmd run validate:cohesion >>"%LOG%" 2>&1
if errorlevel 1 (
  set "MOTIVO=Validacao funcional de coesao reprovada"
  goto :fim_erro
)
echo [OK] Coesao funcional aprovada.

echo.
echo [10/12] Gerando APK Debug novo...
set "STAGE=BUILD_ANDROID"
if exist "%APK_DESTINO%" del /F /Q "%APK_DESTINO%" >>"%LOG%" 2>&1
if exist "%PROJETO%\android\app\build" rmdir /S /Q "%PROJETO%\android\app\build" >>"%LOG%" 2>&1
if exist "%PROJETO%\android\build" rmdir /S /Q "%PROJETO%\android\build" >>"%LOG%" 2>&1
pushd "%PROJETO%\android"
call gradlew.bat assembleDebug >>"%LOG%" 2>&1
set "BUILD_RESULT=!ERRORLEVEL!"
popd
if not "!BUILD_RESULT!"=="0" (
  set "MOTIVO=Compilacao Android falhou com codigo !BUILD_RESULT!"
  goto :fim_erro
)
set "APK_ORIGEM=%PROJETO%\android\app\build\outputs\apk\debug\app-debug.apk"
if not exist "%APK_ORIGEM%" (
  set "MOTIVO=Build finalizou, mas app-debug.apk nao foi localizado"
  goto :fim_erro
)
copy /Y "%APK_ORIGEM%" "%APK_DESTINO%" >>"%LOG%" 2>&1
echo [OK] APK: %APK_DESTINO%
>>"%DIAGNOSTICO%" echo [CHK-APK-001][OK] APK gerado — %APK_DESTINO%

echo.
echo [11/12] Atualizando o GitHub somente apos todas as validacoes...
set "STAGE=GITHUB"
git add . >>"%LOG%" 2>&1
git diff --cached --quiet
if not errorlevel 1 goto :sem_commit
git commit -m "Atualiza MyCar+ para V6.06 - checklist e diagnostico do atualizador" >>"%LOG%" 2>&1
if errorlevel 1 (
  set "MOTIVO=Falha ao criar commit Git"
  goto :fim_erro
)
git push >>"%LOG%" 2>&1
if errorlevel 1 (
  set "MOTIVO=Falha no git push"
  goto :fim_erro
)
for /f "delims=" %%H in ('git rev-parse HEAD') do set "LOCAL_HEAD=%%H"
for /f "delims=" %%B in ('git rev-parse --abbrev-ref HEAD') do set "BRANCH=%%B"
for /f "tokens=1" %%H in ('git ls-remote origin refs/heads/!BRANCH!') do set "REMOTE_HEAD=%%H"
if /I not "!LOCAL_HEAD!"=="!REMOTE_HEAD!" (
  set "MOTIVO=Commit local nao confirmado no GitHub remoto"
  goto :fim_erro
)
echo [OK] GitHub atualizado: !REMOTE_HEAD!
goto :github_pronto
:sem_commit
echo [INFO] Nenhuma alteracao nova para commit.
>>"%LOG%" echo [INFO] Nenhuma alteracao nova para commit.
:github_pronto

echo.
echo [12/12] Abrindo Android Studio...
set "STAGE=ANDROID_STUDIO"
if exist "%STUDIO%" (
  start "" "%STUDIO%" "%PROJETO%\android"
  echo [OK] Android Studio aberto.
) else (
  call npx.cmd cap open android >>"%LOG%" 2>&1
  if errorlevel 1 (
    echo [AVISO] Android Studio nao foi aberto automaticamente.
    >>"%LOG%" echo [AVISO] Android Studio nao localizado.
  ) else (
    echo [OK] Android Studio aberto pelo Capacitor.
  )
)

if exist "%WORKTEMP%" rmdir /S /Q "%WORKTEMP%"
>>"%LOG%" echo [OK] Atualizacao concluida em %DATE% %TIME%.
>>"%DIAGNOSTICO%" echo [RESULTADO][OK] Atualizacao V6.06 concluida.
echo.
echo ============================================================
echo ATUALIZACAO V6.06 CONCLUIDA COM SUCESSO
echo APK: %APK_DESTINO%
echo Log: %LOG%
echo Diagnostico: %DIAGNOSTICO%
echo ============================================================
pause
exit /b 0

:fim_erro
>>"%LOG%" echo [ERRO] Etapa: %STAGE%
>>"%LOG%" echo [ERRO] Motivo: %MOTIVO%
>>"%LOG%" echo [ERRO] Atualizacao interrompida em %DATE% %TIME%.
>>"%DIAGNOSTICO%" echo [RESULTADO][ERRO] Etapa: %STAGE% — %MOTIVO%
echo.
echo ============================================================
echo PROCESSO INTERROMPIDO
echo Etapa: %STAGE%
echo Motivo: %MOTIVO%
echo Diagnostico: %DIAGNOSTICO%
echo Log: %LOG%
if defined FONTE echo Pacote extraido preservado em: %FONTE%
if "%MODIFICOU_PROJETO%"=="1" echo Backup disponivel em: %BACKUP%
echo Nenhum commit e enviado antes do APK e das validacoes serem aprovados.
echo ============================================================
pause
exit /b 1
