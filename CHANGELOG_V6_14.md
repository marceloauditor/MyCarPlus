# CHANGELOG — MYCAR+ V6.14

## Ajustes finais

- O rótulo **Consumo** da seção Tendências foi substituído por **Eficiência**.
- A alteração é somente de nomenclatura: o cálculo central de tendência de km/L foi preservado.
- A seção Tendências permanece composta por **Eficiência**, **Custo por km** e **Custo mensal**.
- A tendência de Custo mensal continua centralizada em `indicator-calculations.js`, pela função `monthlyCostTrend()`.
- Em **Composição dos Grupos**, Receitas permanecem apresentadas entre parênteses, mantendo sua dedução matemática no Custo líquido.
- Corrigido o layout móvel da Composição dos Grupos: valores dos grupos e o valor de **Custo líquido** passam a manter o mesmo alinhamento à direita em telas de celular.
- Manual interno e validação automática atualizados para conferir a nomenclatura Eficiência e o alinhamento móvel.
- Versões atualizadas para APP 6.14, npm 6.14.0 e Android 614 / 6.14.0.

## Situação

A V6.14 substitui a V6.13 como base final de encerramento do projeto MyCar+ e passa a ser a referência oficial para futuras manutenções.
