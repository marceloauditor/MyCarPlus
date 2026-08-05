# CHECKLIST DE MONTAGEM E DIAGNÓSTICO — MYCAR+ V6.09

1. Confirmar APP 6.09, npm 6.9.0, Android 609/6.09.0 e cache `mycar-plus-v6-09`.
2. Confirmar raiz, `www` e assets Android idênticos.
3. Confirmar Dica MyCar+ com fundo `#fff` e texto `#000` nos temas claro e escuro.
4. Confirmar neutralização de transparência, filtros e preenchimento de texto do WebView.
5. Confirmar proteção inline no relatório exibido e compartilhado.
6. Confirmar `styles.css` em network-first e cache-busting `v=609`.
7. Executar `node scripts/check-update-package.js` e `npm run validate:cohesion`.
8. Compilar o APK Debug sem reaproveitar build anterior.
