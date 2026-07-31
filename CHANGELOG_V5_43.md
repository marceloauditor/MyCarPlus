# MyCar+ V5.43 — Correção do gerenciamento de movimentos

**Data:** 31/07/2026

## Correções

- Corrigida a comparação entre IDs numéricos antigos e IDs textuais atuais.
- O botão **Alterar** agora carrega corretamente data, hodômetro, itens, valores, motorista, fornecedor, forma de pagamento e observação.
- A alteração substitui o movimento original, sem criar duplicidade.
- Movimentos históricos de veículos inativos podem ser alterados ou excluídos.
- Novos lançamentos continuam permitidos somente para veículos ativos.
- Incluída mensagem quando um movimento não puder ser localizado.

## Validação

- Teste automatizado com `movimento_id` numérico: aprovado.
- Teste de alteração e persistência em veículo ativo: aprovado.
- Teste de alteração e persistência em veículo inativo: aprovado.
- Validação de sintaxe e coesão raiz → Web → Android: aprovada.

## Revisão do instalador V5.43

- Corrigida a localização da pasta `MYCAR_PLUS_V5_43_MASTER` após a descompactação.
- Removida a barra final da variável de origem antes do `ROBOCOPY`, evitando o erro “Nenhum Diretório de Destino Especificado”.
- Corrigida a identificação do backup para usar data e hora completas (`yyyyMMdd_HHmmss`).
- Excluídas corretamente do backup as pastas transitórias de compilação e cache Android.
