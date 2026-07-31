# MyCar+ V5.45 — Correção da edição histórica com vários itens

## Correção principal

Foi corrigida a validação de hodômetro ao alterar movimentos históricos ocorridos no mesmo dia de outros lançamentos.

Na V5.43, a rotina comparava apenas a data civil. Assim, um movimento posterior do mesmo dia podia ser tratado como movimento anterior e bloquear indevidamente o salvamento.

## Ajustes implantados

- a posição cronológica agora considera data, horário original e ordem do lançamento;
- ao editar, o horário histórico do movimento é preservado;
- movimentos posteriores do mesmo dia passam a formar o limite superior, e não o limite inferior;
- a divisão de um movimento antigo em vários itens permanece vinculada ao mesmo `movimento_id`;
- o registro original é substituído sem duplicidade;
- o total é recalculado pela soma dos itens;
- a fonte, a versão Web e os assets Android foram sincronizados.

## Caso de regressão validado

Movimento de manutenção de 14/09/2025, às 19:51:10, hodômetro 61.900 km e valor total de R$ 380,00:

- convertido de 1 item para 3 itens;
- valores testados: R$ 100,00 + R$ 100,00 + R$ 180,00;
- total preservado: R$ 380,00;
- horário e hodômetro históricos preservados;
- salvamento concluído sem duplicação;
- lançamento posterior do mesmo dia, às 19:55:23 e 61.991 km, corretamente tratado como limite posterior.
