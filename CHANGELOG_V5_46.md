# MyCar+ V5.46

## Relatórios Executivo e de Inteligência

- Os relatórios voltaram a ser gerados e exibidos dentro do aplicativo.
- O cabeçalho intermediário “Visualização interna” e o botão X foram removidos.
- Os botões de ação ficam ao final do relatório.
- Permanecem apenas **Fechar** e **Salvar PDF**.
- O botão **Imprimir** foi removido dos relatórios Executivo e de Inteligência.
- **Fechar** encerra o visualizador e retorna à tela anterior, preservando veículo, período e filtros.
- **Salvar PDF** envia o HTML limpo ao aplicativo principal, que aciona a ponte nativa `MainActivity.java`.
- Na Web, Salvar PDF abre a caixa de impressão do navegador para escolher “Salvar como PDF”.

## Android

- Mantido o `MainActivity.java` Java puro, com `public void onDestroy()`.
- A ponte `printHtml` continua imprimindo somente o HTML do relatório em uma WebView exclusiva.
- Configuração da barra de status alterada para não sobrepor o cabeçalho do MyCar+.
- Incluída proteção para Android 15 por meio de `windowOptOutEdgeToEdgeEnforcement`.

## Versão

- Aplicação: 5.46.0
- Android: versionCode 546 / versionName 5.46.0
- Cache PWA: mycar-plus-v5-46
## Hotfix do instalador

- O BAT agora remove automaticamente os BATs operacionais V5.42 a V5.45 que permanecerem na raiz do projeto antes da validação de coesão.
- Corrige a interrupção na etapa 7/9 causada exclusivamente por esses arquivos antigos.

