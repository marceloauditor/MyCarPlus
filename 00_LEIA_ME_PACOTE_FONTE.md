# MyCar+ V5.76 KEY — pacote-fonte oficial

Este pacote foi produzido a partir da V5.75 KEY e mantém a raiz do projeto como fonte oficial.

## Estrutura

- **Raiz:** fonte editável oficial.
- **`www/`:** cópia sincronizada para Web/PWA.
- **`android/app/src/main/assets/public/`:** cópia sincronizada para o Android.

Edite sempre a raiz e execute a sincronização antes de compilar o aplicativo.

## Identificação da versão

- Aplicação: **5.76.0**
- Android `versionCode`: **576**
- Android `versionName`: **5.76.0**
- Cache PWA: **mycar-plus-v5-76**
- Pacote Android: `br.com.marceloauditor.mycarplus`

## Melhorias da V5.76

- consumo geral em vermelho, mantendo os valores nos pontos;
- consumo de Gasolina em laranja e de Etanol em azul;
- Diesel em verde quando houver registros;
- demais combustíveis com cores distintas e estáveis;
- meses sem dados permanecem como ausência de informação, sem queda para zero;
- hodômetro com todos os registros reais e apenas primeiro, meio e último mês identificados no eixo.

## Atualização automatizada

Coloque na pasta Downloads:

- `MYCAR_PLUS_V5_76_KEY.zip`
- `ATUALIZAR_MYCAR_V5_76_KEY.bat`

Depois execute o BAT pelo PowerShell. Ele cria backup, atualiza a fonte, sincroniza Web e Android, valida a coesão, envia as alterações ao GitHub e gera o APK debug.
