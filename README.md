# MyCar+ V5.42

Aplicativo Web/PWA e Android para controle de consumo de combustível, manutenção, despesas administrativas, receitas, alertas técnicos e análises veiculares com IA.

## Regras centrais

O veículo selecionado na tela inicial controla indicadores, relatórios, gráficos, alertas e histórico técnico. Veículos inativos permanecem disponíveis para consulta histórica, mas não geram alertas ativos nem recebem novos lançamentos técnicos.

Todos os alertas são técnicos e podem ser incluídos, alterados, ativados, desativados ou excluídos. A exclusão remove apenas o alerta e sua programação futura; o histórico técnico permanece preservado.

## Desenvolvimento

```powershell
npm.cmd install
npm.cmd run sync:web
npm.cmd run sync:android
npm.cmd run validate:cohesion
```

## Identificação

- versão: **5.42.0**
- Android: `versionCode 542` / `versionName 5.42.0`
- pacote: `br.com.marceloauditor.mycarplus`
- Firebase: `mycarplus-3180a`
- cache PWA: `mycar-plus-v5-42`

## Atualização automatizada

A fonte inclui `ATUALIZAR_MYCAR_V5_42_WEB_ANDROID.bat`. Em toda nova versão, o nome e o conteúdo do BAT devem ser atualizados junto com o software. Consulte `ROTEIRO_ATUALIZACAO_GITHUB_FIREBASE.txt`.
