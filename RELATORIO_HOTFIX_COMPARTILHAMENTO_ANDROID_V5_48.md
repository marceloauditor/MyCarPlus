# Relatório de correção — MyCar+ V5.48

## Falha corrigida

A compilação Android da V5.47 falhava porque `PrintDocumentAdapter.LayoutResultCallback()` não possui construtor público acessível fora do pacote `android.print`.

## Solução implantada

A geração do PDF para compartilhamento foi reescrita com `android.graphics.pdf.PdfDocument`. A WebView isolada do relatório é dimensionada para A4, renderizada página a página e gravada no cache do aplicativo. Em seguida, o arquivo é compartilhado pelo `FileProvider`.

## Ajuste visual solicitado

Nos Relatórios Executivo e de Inteligência, o botão passou a exibir apenas **Compartilhar**. O fluxo final contém somente **Fechar** e **Compartilhar**.

## Validações

- Ausência de `LayoutResultCallback` e `WriteResultCallback` no `MainActivity.java`.
- Presença de `PdfDocument`, `FileProvider` e `Intent.ACTION_SEND`.
- Coesão entre raiz, `www` e assets Android.
- Versões alinhadas em 5.48.0 / versionCode 548.
