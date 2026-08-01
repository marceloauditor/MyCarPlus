# MyCar+ V5.56

## Relatório XLSX

- Corrigido o acionamento do botão **Gerar Relatório XLSX** na Web/PWA e no Android.
- No Android, o arquivo XLSX agora é entregue pelo compartilhamento nativo para salvar ou abrir em outro aplicativo.
- A guia `Movimentacoes` exporta somente o veículo e o período selecionados.
- As guias `Veiculos`, `Motoristas`, `Fornecedores`, `Itens`, `Formas_Pagamento` e `Alertas` exportam a base completa, sem filtro de período.
- Confirmada e mantida a guia `Alertas`, usando exclusivamente o novo modelo técnico.
- Incluídos tratamento de erro, bloqueio temporário do botão e confirmação de conclusão.

## Estrutura de dados

- Corrigidos no dataset os cabeçalhos GPS de `Movimentacoes`: `latitude`, `longitude`, `precisao_gps_m` e `localizacao_confirmada`.
- Corrigidos no dataset os cabeçalhos `latitude` e `longitude` de `Fornecedores`.
- Adicionado roteiro para tornar o Firebase a base oficial com migração versionada e sem substituição por novas instalações.
