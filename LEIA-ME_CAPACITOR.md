# MyCar+ V5.23 — Capacitor

Esta entrega mantém a aplicação Web/PWA em `www/` e acrescenta o projeto
Android em `android/`. Menus, cores, textos, gráficos e regras continuam sendo
alterados nos arquivos de `www/`.

## Atualização do Android

1. Instale Node.js 20 ou superior e Android Studio.
2. Na pasta do projeto, execute `npm install`.
3. Depois de alterar os arquivos de `www/`, execute `npm run sync`.
4. Abra o projeto com `npm run open:android`.

## Arquivos de distribuição

- APK de teste: `npm run build:debug`
- AAB de publicação: `npm run build:release`

O AAB de produção deve ser assinado no Android Studio com uma chave mantida em
local seguro. Não publique arquivos `.jks`, `.keystore` ou `google-services.json`.

## Firebase Android

Antes de ativar o login Google nativo e publicar na Play Store:

1. Registre no Firebase um aplicativo Android com o identificador
   `br.com.marceloauditor.mycarplus`.
2. Baixe `google-services.json` e coloque em `android/app/`.
3. Cadastre no Firebase as impressões SHA-1 e SHA-256 da chave de assinatura.

O arquivo `google-services.json` não está incluído nesta entrega porque deve ser
obtido no projeto Firebase do proprietário.

## Versão

- Aplicativo: 5.23.0
- Android `versionCode`: 523
- Android `versionName`: 5.23.0
