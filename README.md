# MyCar+ V5.71

> A V5.58 utiliza exclusivamente o novo modelo de alertas. O modelo automático antigo, seus parâmetros e registros de teste foram eliminados do código e do dataset.


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

- versão: **5.71.0**
- Android: `versionCode 571` / `versionName 5.71.0`
- pacote: `br.com.marceloauditor.mycarplus`
- Firebase: `mycarplus-3180a`
- cache PWA: `mycar-plus-v5-71`

## Atualização automatizada

A fonte inclui `ATUALIZAR_MYCAR_V5_71_KEY.bat`. Em toda nova versão, o nome e o conteúdo do BAT devem ser atualizados junto com o software. Consulte `ROTEIRO_ATUALIZACAO_GITHUB_FIREBASE.txt`.

## Relatórios e compartilhamento

O Relatório Executivo e o Relatório de Inteligência são exibidos dentro do aplicativo, com os botões **Fechar** e **Compartilhar**. O compartilhamento cria um arquivo HTML temporário e abre a folha nativa do Android.


## Alertas de manutenção — V5.52

- a tela apresenta somente os alertas e o histórico do veículo selecionado;
- veículos inativos não geram alertas ativos e ficam apenas para consulta;
- todos os alertas são gravados como técnicos do grupo **MANUTENÇÃO**;
- o usuário pode incluir, alterar, ativar, desativar, concluir e excluir alertas;
- a exclusão exige confirmação e preserva integralmente o histórico técnico;
- o cadastro coleta explicitamente o veículo mesmo com o campo bloqueado;
- o modelo antigo de alertas, os parâmetros automáticos e o histórico de teste foram removidos; permanecem apenas os alertas cadastrados no novo modelo e os movimentos reais.


## Novo Alerta Técnico — V5.52

A tela de alertas segue a simulação aprovada, com vida útil, base de cálculo, previsão automática, antecedência, status e observações.
