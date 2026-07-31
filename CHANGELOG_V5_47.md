# MyCar+ V5.47

## Relatórios no celular

- Corrigida a largura dos Relatórios Executivo e de Inteligência na visualização interna.
- Eliminado o corte das laterais em telas estreitas.
- Indicadores, cartões, textos, gráficos e rodapés adaptados à largura do aparelho.
- Tabelas largas convertidas em cartões com rótulos na visualização móvel.
- Mantida a composição A4 na geração do PDF.

## Compartilhamento em PDF

- Removido o botão **Salvar PDF** dos Relatórios Executivo e de Inteligência.
- Incluído o botão **Compartilhar PDF** nos dois relatórios.
- O Android gera o PDF em cache e abre o compartilhamento nativo.
- O usuário pode escolher WhatsApp, e-mail, Google Drive e outros aplicativos compatíveis.
- O relatório permanece aberto após iniciar o compartilhamento.
- O botão **Fechar** continua retornando à tela anterior.

## Android

- `MainActivity.java` atualizado com `shareHtmlAsPdf`.
- Geração assíncrona do PDF com `PrintDocumentAdapter`.
- Compartilhamento seguro pelo `FileProvider`.
- Compatibilidade mantida com as rotinas antigas de impressão.

## Versão

- Aplicação: 5.47.0
- Android: versionCode 547 / versionName 5.47.0
- Cache PWA: mycar-plus-v5-47
