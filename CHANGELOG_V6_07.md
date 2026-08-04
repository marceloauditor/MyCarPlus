# MyCar+ V6.07 — Análise Inteligente com dados executivos

## Identidade dos demonstrativos

- **Relatório Executivo**: demonstrativo calculado diretamente pelo MyCar+.
- **Análise Inteligente Veicular**: interpretação dos indicadores pela Inteligência Artificial.
- Título do documento da IA: **Análise Inteligente de Gestão Veicular**.

## Integração com o Relatório Executivo

A IA passou a receber um objeto estruturado `executive_report`, produzido pelo mesmo conjunto de dados e critérios usados pelo Relatório Executivo. O HTML do relatório não é enviado. São enviados somente indicadores e evidências necessárias à interpretação.

O conjunto inclui período, utilização, histórico, consumo por combustível, indicadores financeiros, custos por grupo, rateios por competência, despesas administrativas, manutenção, alertas, itens de maior valor, candidatos exatos a duplicidade e qualidade dos dados.

## Controles de interpretação

- Removida a regra de anomalia baseada na média global de despesas.
- IPVA, licenciamento e seguro são tratados como despesas periódicas.
- Datas próximas ou valores altos não comprovam duplicidade.
- A IA só pode mencionar duplicidade quando o aplicativo fornecer candidato exato com mesma data, grupo, item, valor e fornecedor.
- Recomendações e pontos de atenção devem indicar o caminho da evidência utilizada.
- Evidências inexistentes são descartadas pelo aplicativo.
- A confiança é calculada localmente, e não escolhida livremente pela IA.
- Comparações de combustível ficam limitadas ao período e à amostra disponível.

## Dica MyCar+

Foi incluída ao final uma orientação automotiva selecionada localmente em uma biblioteca revisada. A dica pode abordar manutenção, combustível, despesas ou qualidade dos registros e não representa diagnóstico mecânico.

## Versões

- Aplicativo/Web/PWA: 6.07
- npm: 6.7.0
- Android versionCode: 607
- Android versionName: 6.07.0
- Cache PWA: mycar-plus-v6-07
