# Relatório de correção — MyCar+ V5.49

## Problema

O botão **Compartilhar** dos Relatórios Executivo e de Inteligência não abria o menu de compartilhamento em alguns aparelhos Android porque dependia da geração interna de PDF.

## Solução

Os dois relatórios agora são gravados diretamente como arquivos HTML temporários e compartilhados pela folha nativa do Android. A ponte Java usa `FileProvider`, `Intent.ACTION_SEND`, tipo `text/html`, permissão temporária de leitura e `ClipData`.

## Fluxo final

1. O relatório é gerado e exibido dentro do aplicativo.
2. **Fechar** retorna à tela anterior.
3. **Compartilhar** cria um arquivo `.html` sem os botões internos.
4. O Android apresenta WhatsApp, e-mail, Drive e aplicativos compatíveis.

A mesma rotina é usada no Relatório Executivo e no Relatório de Inteligência.
