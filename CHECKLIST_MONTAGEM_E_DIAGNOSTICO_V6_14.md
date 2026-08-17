# CHECKLIST DE MONTAGEM E DIAGNÓSTICO — MYCAR+ V6.14

1. APP 6.14, npm 6.14.0, Android 614/6.14.0 e cache `mycar-plus-v6-14`.
2. Painel renderizado após a leitura local e antes da ocultação do splash interno.
3. Firebase e sincronização não bloqueiam a primeira pintura do painel.
4. Relatório Executivo, Inteligência e Gráficos usam primeiro movimento até a data atual como padrão.
5. Tendências exibem **Eficiência**, **Custo por km** e **Custo mensal**.
6. Tendência do Custo mensal centralizada em `indicator-calculations.js` e consumida pelo Painel Inteligente.
7. Receitas da Composição dos Grupos exibidas entre parênteses e deduzidas somente pelo motor financeiro.
8. Em telas de celular, valores dos grupos e Custo líquido ficam alinhados à direita de forma uniforme.
9. Fórmulas, rateio, alertas, armazenamento e sincronização preservados.
10. Raiz, `www` e Android com arquivos públicos idênticos.
11. BAT V6.14, manifesto SHA-256, validações e geração de APK Debug conferidos pelo atualizador.
