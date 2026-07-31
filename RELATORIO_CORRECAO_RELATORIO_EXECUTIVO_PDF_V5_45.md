# MyCar+ V5.45 — Relatório de correção do Relatório Executivo e PDF

**Data:** 31/07/2026  
**Versão:** 5.45.0  
**Escopo:** Android, Web/PWA e coesão da cadeia de arquivos

## 1. Evidência analisada

Na pré-visualização “Salvar como PDF” do Android, o relatório aparecia reduzido no canto superior esquerdo, enquanto a maior parte da folha era ocupada pelo fundo cinza e pelo cabeçalho da visualização interna.

## 2. Diagnóstico técnico

O documento era mostrado em um `iframe` dentro da WebView principal. Ao solicitar o PDF, a ponte nativa executava `createPrintDocumentAdapter()` sobre a WebView principal. Dessa forma, o Android recebia a tela inteira do aplicativo, e não apenas o conteúdo do relatório.

## 3. Solução implantada

- Nova função nativa `printHtml(String jobName, String html)`.
- Criação de WebView temporária e exclusiva para impressão.
- Carregamento do HTML do relatório nessa WebView.
- Impressão A4 retrato, colorida e sem margens extras do Android.
- Remoção dos controles e scripts antes de enviar o documento para impressão.
- Acesso à ponte nativa pelo frame pai.
- CSS de tela responsivo com fontes, tabelas, indicadores e gráficos maiores no celular.
- Manutenção do CSS A4 específico para impressão.

## 4. Abrangência

A nova rotina foi aplicada a:

- Relatório Executivo Veicular;
- Relatório Executivo com Inteligência Artificial;
- Histórico Técnico de Manutenção.

## 5. Resultado esperado

Na visualização interna, o relatório deve ocupar toda a largura disponível e permanecer legível. Ao tocar em “Relatório Executivo PDF”, o sistema Android deve mostrar somente as duas páginas A4 do relatório, sem o cabeçalho “Visualização interna”, sem fundo cinza e sem redução do conteúdo no canto.
