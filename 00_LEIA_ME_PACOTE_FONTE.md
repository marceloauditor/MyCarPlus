# MyCar+ V5.42 — Pacote-fonte oficial

Pacote consolidado para Web/PWA e Android, com as correções e parametrizações pendentes da V5.41 implantadas.

## Fonte de verdade

- **Raiz do projeto:** fonte oficial editável.
- **`www/`:** cópia sincronizada da fonte oficial para Web/PWA e Capacitor.
- **`android/app/src/main/assets/public/`:** cópia gerada pelo Capacitor para o aplicativo Android.

Não altere manualmente `www/` ou os assets Android. Edite a raiz e execute a sincronização.

## Versão

- Aplicação: **5.42.0**
- Android `versionCode`: **542**
- Android `versionName`: **5.42.0**
- Cache PWA: **mycar-plus-v5-42**
- Esquema de dados/nuvem: **8**

## Atualização automatizada

Na pasta Downloads, mantenha o arquivo `MYCAR_PLUS_V5_42_MASTER.zip` e execute:

```powershell
.\ATUALIZAR_MYCAR_V5_42_WEB_ANDROID.bat
```

O BAT cria backup, instala dependências, sincroniza Web e Android, valida a coesão e gera o APK de teste.
