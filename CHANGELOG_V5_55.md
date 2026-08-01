# MyCar+ V5.55

## Correção do Relatório Executivo

- A seção **Movimentações e manutenção** passou a listar somente itens que:
  1. existem no Cadastro de Itens;
  2. pertencem ao grupo Manutenção;
  3. possuem alerta cadastrado no novo modelo para o veículo selecionado.
- Foi eliminada a lista técnica fixa que incluía itens sem cadastro ou sem alerta.

## Eliminação do modelo antigo

- removida a criação automática de alertas de óleo e bateria;
- removidos `TECHNICAL_ITEMS`, `technicalParameters` e chaves técnicas legadas;
- removida a base `Historico_Alertas` de teste;
- preservados os movimentos reais de manutenção;
- dataset atualizado para manter somente a planilha **Alertas** no novo formato.
