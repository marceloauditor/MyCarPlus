# PACOTE FONTE — MYCAR+ V6.10 R2

Esta revisão mantém a versão funcional 6.10 e conclui a centralização das fórmulas de negócio utilizadas pela tela inicial, Relatório Executivo, gráficos, exportações e Análise Inteligente.

O motor oficial é `indicator-calculations.js`. Nele ficam as regras de custos, dias inclusivos, consumo, litros, participação por combustível, somatórios, projeções, rateio e agregações financeiras. O `app.js` apenas solicita os resultados e apresenta os dados.

A revisão R2 também corrige o atualizador Windows: todos os arquivos `.bat` foram gravados em ASCII, sem BOM e com finais de linha CRLF. Isso elimina os erros `et`, `cho` e `f` causados pelo BAT anterior em LF.

A base `data/MyCarPlus.xlsx` é preservada. O atualizador valida o ZIP antes do backup, sincroniza raiz, Web e Android, executa os testes e somente depois compila o APK e atualiza o GitHub.

Coloque `MYCAR_PLUS_V6_10_R2_KEY.zip` e `ATUALIZAR_MYCAR_V6_10_R2_KEY.bat` juntos na pasta Downloads e execute o BAT.
