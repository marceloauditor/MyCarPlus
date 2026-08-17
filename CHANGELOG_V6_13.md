# CHANGELOG — MYCAR+ V6.13

## Ajustes finais

- Substituída a informação de Distância na seção Tendências por **Custo mensal**.
- Criada a função central `monthlyCostTrend()` em `indicator-calculations.js`.
- A tendência de Custo mensal compara duas janelas consecutivas de igual duração dentro do histórico analisado e calcula a variação percentual entre os custos mensais líquidos.
- O Painel Inteligente apenas consome o resultado do motor central; a fórmula não foi duplicada em `app.js`.
- Em Composição dos Grupos, Receitas deixam de ser exibidas com sinal negativo e passam a ser apresentadas entre parênteses, preservando sua natureza de dedução no cálculo do Custo líquido.
- Manual interno atualizado para refletir as novas regras de apresentação.
- Validação de coesão passa a usar arquivo temporário, evitando deixar diagnóstico residual na raiz do projeto; o BAT também remove resíduos antigos `DIAGNOSTICO_COESAO_V*.txt`.
- Versões atualizadas para APP 6.13, npm 6.13.0 e Android 613/6.13.0.

## Situação

Versão definida como base final de encerramento do projeto MyCar+. Futuras alterações devem partir da V6.13.
