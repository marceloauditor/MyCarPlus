# MyCar+ V5.45 — Relatório de correção da edição de movimentos

**Data da revisão:** 31/07/2026  
**Versão anterior:** 5.43  
**Versão corrigida:** 5.44

## 1. Falha reproduzida

Ao alterar o movimento de manutenção de R$ 380,00 registrado em 14/09/2025, às 19:51:10, com hodômetro de 61.900 km, o usuário podia dividir o valor em três itens, mas o aplicativo recusava o salvamento.

A mensagem apresentada era:

> O hodômetro não pode ser menor que 61.991 km para esta data.

## 2. Causa técnica

A função de limites do hodômetro comparava apenas `AAAA-MM-DD`. Com isso, um abastecimento posterior do mesmo dia, registrado às 19:55:23 e com 61.991 km, era classificado incorretamente como registro anterior ao movimento de 19:51:10.

Além disso, a edição regravava o horário como 12:00:00, eliminando a sequência histórica original.

## 3. Correção aplicada

- criação de `movementDateTimeForEdit()` para preservar o horário do registro histórico;
- cálculo dos limites por data, horário e `ordem_lancamento`;
- separação correta entre movimentos anteriores e posteriores no mesmo dia;
- manutenção do mesmo `movimento_id` ao transformar um registro em vários itens;
- substituição transacional do movimento original.

## 4. Teste funcional executado

O movimento foi convertido em:

| Item | Valor |
|---|---:|
| Fluido do Radiador | R$ 100,00 |
| Fluido de Freio | R$ 100,00 |
| Mão de Obra | R$ 180,00 |
| **Total** | **R$ 380,00** |

Resultado:

- formulário válido;
- salvamento concluído;
- diálogo fechado após a gravação;
- três linhas vinculadas ao mesmo movimento;
- total preservado;
- data, horário, veículo, hodômetro, fornecedor e observação preservados;
- nenhuma duplicidade criada.

## 5. Coesão

A correção foi aplicada na fonte principal e sincronizada para `www` e Android. O validador passou a exigir a presença da nova lógica de preservação do horário e ordenação cronológica.
