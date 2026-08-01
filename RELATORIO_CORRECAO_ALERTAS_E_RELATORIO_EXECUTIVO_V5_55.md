# Relatório de correção — MyCar+ V5.55

A V5.55 corrige a seção de manutenção do Relatório Executivo e elimina o modelo antigo de alertas.

## Regra vigente

O relatório lista exclusivamente alertas do novo modelo vinculados ao veículo selecionado e a itens existentes no Cadastro de Itens. Itens sem alerta não aparecem. Alertas órfãos ou provenientes da geração automática antiga são removidos durante a migração.

## Dataset

O arquivo `MyCarPlus.xlsx` contém a planilha `Alertas` com o esquema do novo modelo. As planilhas antigas `Historico_Alertas` e `Parametros_Tecnicos` não fazem parte do dataset.
