# CHECKLIST DE MONTAGEM E DIAGNÓSTICO — MYCAR+ V6.10 R2

1. Confirmar APP 6.10, npm 6.10.0, Android 610/6.10.0 e cache `mycar-plus-v6-10`.
2. Confirmar `PACKAGE_REVISION.txt` com R2.
3. Confirmar carregamento de `indicator-calculations.js` antes de `app.js`.
4. Executar `node scripts/validate-indicators.js`.
5. Executar `node scripts/validate-formula-centralization.js`.
6. Confirmar que tela inicial, Relatório Executivo, gráficos e IA usam o motor central.
7. Validar dias corridos inclusivos.
8. Validar custo líquido por km, dia e mês.
9. Validar consumo ponderado somente com ciclos completos, litros > 0 e distância > 0.
10. Confirmar consumo com duas casas decimais em todos os artefatos.
11. Validar agregações por combustível, item, fornecedor, ano e grupo.
12. Validar rateio em centavos, competência e última parcela.
13. Confirmar igualdade entre raiz, Web e Android.
14. Confirmar BAT ASCII sem BOM e com CRLF em todas as linhas.
15. Confirmar manifesto SHA-256 e integridade estrutural do ZIP antes do build.
