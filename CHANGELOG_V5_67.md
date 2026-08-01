# MyCar+ V5.67

## Refatoração dos relatórios

- Criado `report-manager.js` como módulo único para abrir, imprimir, compartilhar e fechar relatórios.
- Relatórios Executivo e de Inteligência Artificial agora chamam diretamente o gerenciador da janela principal.
- Impressão Android utiliza sempre o HTML completo por `MyCarNative.printHtml`.
- Compartilhamento Android mantém capa PNG + HTML, com contingência para HTML.
- Visualizador de tela cheia e fechamento centralizados.
- Validação de coesão ampliada para conferir o novo módulo nas cópias raiz, Web e Android.
