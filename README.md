# MyCar+ V5.75

Aplicativo Web/PWA e Android para controle de consumo de combustível, manutenção, despesas administrativas, receitas, alertas técnicos e análises veiculares.

## Identificação

- versão: **5.75.0**
- Android: `versionCode 575` / `versionName 5.75.0`
- pacote: `br.com.marceloauditor.mycarplus`
- Firebase: `mycarplus-3180a`
- cache PWA: `mycar-plus-v5-75`

## Fonte oficial

A raiz do projeto é a fonte editável. As pastas `www/` e `android/app/src/main/assets/public/` devem permanecer sincronizadas com ela.

```powershell
npm.cmd install
npm.cmd run sync:web
npx.cmd cap sync android
npm.cmd run validate:cohesion
```

## Atualização automatizada

Use `ATUALIZAR_MYCAR_V5_75_KEY.bat` junto com `MYCAR_PLUS_V5_75_KEY.zip` na pasta Downloads.

## Destaques da V5.75

- quarta barra laranja no custo médio diário por grupo;
- quarta barra laranja no custo total por grupo;
- período padrão do último ano ajustado aos registros disponíveis;
- Manual de Ajuda com capa profissional;
- versão, desenvolvedor, criação e geração organizados sem truncamento.
