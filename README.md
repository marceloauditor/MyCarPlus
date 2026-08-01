# MyCar+ V5.76

Aplicativo Web/PWA e Android para controle de consumo de combustível, manutenção, despesas administrativas, receitas, alertas técnicos e análises veiculares.

## Identificação

- versão: **5.76.0**
- Android: `versionCode 576` / `versionName 5.76.0`
- pacote: `br.com.marceloauditor.mycarplus`
- Firebase: `mycarplus-3180a`
- cache PWA: `mycar-plus-v5-76`

## Fonte oficial

A raiz do projeto é a fonte editável. As pastas `www/` e `android/app/src/main/assets/public/` devem permanecer sincronizadas com ela.

```powershell
npm.cmd install
npm.cmd run sync:web
npx.cmd cap sync android
npm.cmd run validate:cohesion
```

## Atualização automatizada

Use `ATUALIZAR_MYCAR_V5_76_KEY.bat` junto com `MYCAR_PLUS_V5_76_KEY.zip` na pasta Downloads.

## Destaques da V5.76

- linha Geral vermelha no consumo, com valores fixos nos pontos;
- linha Gasolina laranja e linha Etanol azul;
- linha Diesel verde, quando houver registros;
- demais combustíveis recebem cores distintas e estáveis;
- hodômetro com todos os pontos reais e somente três referências no eixo: primeiro mês, mês central e último mês.
