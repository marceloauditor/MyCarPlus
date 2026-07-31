# MyCar+ V5.45 — Correção da visualização e do PDF do Relatório Executivo

## Correções implantadas

1. O Relatório Executivo volta a ser exibido de forma legível na visualização interna do Android.
2. A impressão/PDF nativa deixa de capturar a tela inteira do aplicativo e passa a imprimir somente o HTML do relatório.
3. Foi criada a ponte nativa `printHtml(jobName, html)` em uma WebView exclusiva para impressão.
4. O papel padrão da impressão nativa foi definido como A4, orientação retrato, colorido e sem margens adicionais do Android.
5. O relatório enviado à impressão não contém o cabeçalho “Visualização interna”, o botão de fechar nem os controles da tela.
6. O CSS responsivo do relatório foi ampliado para leitura confortável no celular.
7. A mesma rotina isolada de impressão foi aplicada ao Relatório Executivo, ao Relatório com IA e ao Histórico Técnico.
8. Fonte oficial, `www` e assets Android foram sincronizados.

## Causa corrigida

A V5.44 usava `createPrintDocumentAdapter()` sobre a WebView principal do aplicativo. Como o relatório estava dentro de um `iframe`, o Android imprimia toda a interface — cabeçalho, fundo e iframe — e reduzia o relatório no canto da página.

Na V5.45, o documento é clonado, os controles e scripts são removidos e o HTML limpo é carregado em uma WebView dedicada exclusivamente à impressão.
