# MyCar+ V6.06 — Capacitor 7

## Comandos Windows

```powershell
npm.cmd ci
npm.cmd run sync:web
npx.cmd cap sync android
npm.cmd run validate:cohesion
npx.cmd cap open android
```

A fonte oficial está na raiz. O diretório `www/` é recriado pelo script `sync:web`, e `android/app/src/main/assets/public/` é atualizado pelo Capacitor. Não edite manualmente essas cópias.

Versão Android: `versionCode 606` / `versionName 6.06.0`.
