# CHECKLIST DE MONTAGEM E DIAGNÓSTICO — MYCAR+ V6.08

## Identificação
- APP: 6.08
- npm: 6.8.0
- Android: versionCode 608 / versionName 6.08.0
- Cache PWA: mycar-plus-v6-08

## Verificações automáticas obrigatórias
1. Arquivos essenciais e versões.
2. Base `data/MyCarPlus.xlsx` preservada.
3. Logotipos e Base64 dos relatórios íntegros.
4. Indicadores estruturados do Relatório Executivo enviados à IA.
5. Recomendações vinculadas a evidências.
6. Ausência do seletor `aiType` e das opções de análise parcial.
7. Prompt configurado para análise sempre completa.
8. Dica MyCar+ com fundo opaco e texto preto/cinza-escuro.
9. Igualdade entre raiz, `www` e Android.
10. Manifesto SHA-256 conferido.
11. Ausência de artefatos operacionais V6.07 no pacote.

## Diagnóstico em caso de falha
O BAT grava `Downloads\DIAGNOSTICO_MYCAR_V6_08.txt` e `Downloads\ATUALIZACAO_MYCAR_V6_08_KEY_LOG.txt`. Enviar os dois arquivos para localizar a primeira etapa reprovada.
