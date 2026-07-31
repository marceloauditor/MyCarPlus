# MyCar+ V5.49 — Pacote-fonte oficial

Pacote consolidado para Web/PWA e Android, com as correções e parametrizações pendentes da V5.41 implantadas.

## Fonte de verdade

- **Raiz do projeto:** fonte oficial editável.
- **`www/`:** cópia sincronizada da fonte oficial para Web/PWA e Capacitor.
- **`android/app/src/main/assets/public/`:** cópia gerada pelo Capacitor para o aplicativo Android.

Não altere manualmente `www/` ou os assets Android. Edite a raiz e execute a sincronização.

## Versão

- Aplicação: **5.49.0**
- Android `versionCode`: **549**
- Android `versionName`: **5.49.0**
- Cache PWA: **mycar-plus-v5-49**
- Esquema de dados/nuvem: **8**

## Atualização automatizada

Na pasta Downloads, mantenha o arquivo `MYCAR_PLUS_V5_49_MASTER.zip` e execute:

```powershell
.\ATUALIZAR_MYCAR_V5_49_WEB_ANDROID.bat
```

O BAT cria backup, instala dependências, sincroniza Web e Android, valida a coesão e gera o APK de teste.

Se o navegador salvar o ZIP com sufixo como `(1)`, o BAT V5.49 localiza automaticamente o arquivo mais recente compatível na pasta Downloads.

## Relatórios V5.49

Os Relatórios Executivo e de Inteligência compartilham arquivos `.html` por meio da ponte nativa `MainActivity.shareHtml`. O arquivo Java correto está incluído no pacote Android.
