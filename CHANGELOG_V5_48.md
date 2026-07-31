# MyCar+ V5.48

## Correção de compilação Android

- Removida a criação direta de `PrintDocumentAdapter.LayoutResultCallback`, cujo construtor não é público no SDK Android usado pelo projeto.
- A geração do arquivo compartilhável passou a usar `PdfDocument`, sem depender dos callbacks internos do framework de impressão.
- Mantido o compartilhamento pelo `FileProvider` com WhatsApp, e-mail, Drive e outros aplicativos.

## Relatórios

- Botão dos Relatórios Executivo e de Inteligência renomeado de **Compartilhar PDF** para **Compartilhar**.
- Mantidos somente os botões **Fechar** e **Compartilhar**.
- Preservada a visualização responsiva em tela e a composição A4 no arquivo compartilhado.

## Versão

- Aplicação: 5.48.0
- Android: versionCode 548 / versionName 5.48.0
- Cache PWA: mycar-plus-v5-48
