# MyCar+ V5.23 — Pacote-fonte oficial

Este ZIP reúne em uma única estrutura a fonte Web/PWA e o projeto Android Capacitor.

## Estrutura principal

- `www/`: aplicação Web/PWA que também alimenta o Android.
- `android/`: projeto Android completo para abrir no Android Studio.
- `capacitor.config.json`: configuração do Capacitor.
- `package.json` e `package-lock.json`: dependências e comandos do projeto.
- `LEIA-ME_CAPACITOR.md`: instruções de preparação, sincronização e compilação.
- `ROTEIRO_ATUALIZACAO_GITHUB_FIREBASE.txt`: procedimento de atualização e publicação.

## Fluxo recomendado para futuras alterações

1. Altere menus, cores, textos e regras nos arquivos de `www/`.
2. Teste a versão Web/PWA.
3. Execute `npm install`.
4. Execute `npx cap sync android`.
5. Abra o projeto Android com `npx cap open android`.
6. Gere um APK para testes ou um AAB assinado para a Google Play.

## Arquivos que não fazem parte do pacote

- `node_modules/`;
- caches `.gradle/`;
- pastas de compilação `build/`;
- chaves de assinatura `.jks` ou `.keystore`;
- `google-services.json`;
- pasta antiga `functions/`.

O arquivo `google-services.json` deve ser obtido no Firebase para o aplicativo Android
`br.com.marceloauditor.mycarplus` e colocado localmente em `android/app/`. Não o publique
em repositório público.

## Observação sobre o GitHub

O GitHub não extrai um ZIP automaticamente. Para enviar esta fonte, extraia o pacote no
computador e publique o conteúdo da pasta extraída. Para preservar toda a árvore Android,
prefira GitHub Desktop ou Git pela linha de comando.
