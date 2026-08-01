# MyCar+ V5.66

## Correção de impressão no Android

- Corrigida a função de impressão do Relatório Executivo, que chamava uma função inexistente.
- Os relatórios Executivo e de Inteligência Artificial agora procuram a ponte nativa `MyCarNative.printHtml` no `window`, `parent` e `top`.
- O manipulador principal aciona a impressão nativa sempre que a ponte estiver disponível, sem depender da detecção auxiliar do ambiente.
- Mantida a impressão Web por `window.print()` como contingência.
- Versões Web, PWA e Android atualizadas para 5.66.
