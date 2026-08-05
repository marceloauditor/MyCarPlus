# CHANGELOG — MyCar+ V6.10 R2

## Centralização integral das fórmulas

- Consolidado o motor oficial `indicator-calculations.js`.
- Centralizados custo por km, custo por dia, custo mensal e custo líquido.
- Centralizados dias corridos inclusivos, projeção anual e médias mensais.
- Centralizados consumo unitário, último consumo, consumo ponderado e resumos por período.
- Centralizados filtros de ciclos válidos: tanque completo, litros maiores que zero e distância maior que zero.
- Centralizados cálculo de litros, participação por combustível, consumo por combustível e custo do combustível por km.
- Centralizados somatórios, totais por grupo, valores assinados de receitas, agregações por ano, item e fornecedor.
- Centralizados rateio, parcelas, competência, saldo e apropriação.
- Tela inicial, Relatório Executivo, gráficos, exportações e Análise Inteligente passam a consumir o mesmo motor.
- Mantida a exibição de consumo com duas casas decimais e precisão integral nos cálculos internos.

## Correção do atualizador Windows

- Identificada a causa dos comandos `et`, `cho` e `f`: o BAT anterior estava com finais de linha LF.
- BAT externo e BAT interno regravados em ASCII, sem BOM e com CRLF.
- Incluída verificação byte a byte para impedir LF isolado.
- Incluída abertura estrutural do ZIP antes da extração.
- Nomes do ZIP, pasta interna, diagnóstico, log e APK fixados para a revisão R2.

## Versões

- APP: 6.10
- npm: 6.10.0
- Android: versionCode 610 / versionName 6.10.0
- Cache PWA: `mycar-plus-v6-10`
- Revisão do pacote: R2
