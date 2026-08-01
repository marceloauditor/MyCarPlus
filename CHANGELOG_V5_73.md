# CHANGELOG — MYCAR+ V5.73 KEY

Data: 01/08/2026

## Melhorias implantadas

1. O período de gráficos e relatórios é ajustado à primeira e à última movimentação disponíveis quando as datas informadas ultrapassam parcialmente o histórico do veículo.
2. Períodos totalmente anteriores ou posteriores ao histórico exibem mensagem objetiva, sem gerar gráficos ou relatórios vazios artificialmente.
3. O gráfico de evolução do hodômetro passou a usar escala Y adaptativa, intervalos arredondados e margem esquerda calculada pela largura dos rótulos.
4. A instrução para alteração do período na tela de gráficos foi reduzida e compactada.
5. A tela Sobre passou a usar o ícone oficial do MyCar+ com o título Informações.
6. Desenvolvedor e nome foram separados em linhas distintas.
7. O e-mail de contato recebeu fonte responsiva e bloqueio de quebra de linha.
8. Versões alinhadas: app 5.73, pacote 5.73.0, Android versionCode 573, versionName 5.73.0 e cache mycar-plus-v5-73.

## Estrutura preservada

- Firebase e modelo de dados sem alterações.
- Dataset XLSX sem migração.
- Fluxo KEY e rotina de atualização preservados.
