# Relatório de Correção — MyCar+ V5.46

## Solicitação atendida

Padronização do Relatório Executivo e do Relatório de Inteligência para exibição dentro do aplicativo, com somente os botões **Fechar** e **Salvar PDF** ao final do documento.

## Correções

1. Remoção dos botões **Imprimir** dos dois relatórios.
2. Remoção do cabeçalho redundante “Visualização interna”.
3. Exibição do relatório em tela cheia dentro do aplicativo.
4. **Fechar** retorna à tela anterior e preserva o estado da tela de origem.
5. **Salvar PDF** usa `postMessage` para enviar o HTML ao aplicativo principal.
6. O aplicativo principal chama `MyCarNative.printHtml`, eliminando a tentativa de acesso direto do iframe à ponte Java.
7. Na Web, o mesmo botão abre o recurso do navegador para salvar em PDF.
8. Correção da sobreposição do cabeçalho pela barra de status do Android.
9. Inclusão e validação do `MainActivity.java` correto no pacote.

## Arquivos centrais alterados

- `app.js`
- `index.html`
- `styles.css`
- `capacitor.config.json`
- `android/app/build.gradle`
- `android/app/src/main/res/values/styles.xml`
- `android/app/src/main/java/br/com/marceloauditor/mycarplus/MainActivity.java`
- `scripts/validate-cohesion.js`

## Versão

MyCar+ 5.46.0 — Android versionCode 546.
