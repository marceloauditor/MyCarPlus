# Relatório de Correção — MyCar+ V5.47

## Problemas informados

1. O botão **Salvar PDF** não executava a ação esperada.
2. O relatório aparecia com as laterais cortadas no celular.
3. O Relatório de Inteligência apresentava o mesmo comportamento.
4. Os relatórios estavam desformatados na visualização móvel.

## Correções implantadas

### Visualização em tela

- Relatórios limitados à largura real do `iframe` e da tela.
- Remoção de estouro horizontal.
- Páginas A4 convertidas para largura fluida apenas durante a visualização em tela.
- Indicadores reorganizados em duas colunas e, nas telas menores, em uma coluna.
- Tabelas largas convertidas em cartões verticais identificados por rótulos.
- Gráficos SVG redimensionados proporcionalmente.
- Textos longos passam a quebrar linha sem extrapolar as laterais.
- Barra de ações mantida visível no final da tela.

### Compartilhamento

- **Salvar PDF** substituído por **Compartilhar PDF**.
- O HTML limpo do relatório é enviado ao `MainActivity.java`.
- O Android gera um PDF A4 temporário dentro do cache privado do aplicativo.
- O arquivo é exposto com segurança pelo `FileProvider`.
- O seletor nativo do Android permite compartilhar por WhatsApp, e-mail, Drive e aplicativos compatíveis.

### Fluxo

- **Fechar:** retorna à tela anterior e preserva o contexto.
- **Compartilhar PDF:** gera e compartilha o arquivo sem fechar o relatório.
- O mesmo fluxo é usado no Relatório Executivo e no Relatório de Inteligência.

## Arquivos principais alterados

- `app.js`
- `styles.css`
- `android/app/src/main/java/br/com/marceloauditor/mycarplus/MainActivity.java`
- `android/app/build.gradle`
- arquivos de versão, documentação, validação e atualização automatizada
