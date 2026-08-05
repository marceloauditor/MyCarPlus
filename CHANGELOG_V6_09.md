# CHANGELOG — MyCar+ V6.09

Data: 04/08/2026

## Correção visual da Dica MyCar+

- Fundo alterado para branco puro (`#ffffff`) na tela e no relatório compartilhado.
- Categoria, título e texto fixados em preto puro (`#000000`).
- Regras específicas para temas claro e escuro.
- Neutralização de transparência, gradiente, `backdrop-filter`, filtros, mistura de cores e preenchimento automático de texto do Android WebView.
- Proteção inline no HTML gerado para que a dica permaneça legível mesmo diante de regras externas.
- `styles.css` passou a usar estratégia network-first e referências visuais receberam cache-busting V6.09.
- Checklist automático reforçado para reprovar qualquer retorno ao fundo quase branco da V6.08.
