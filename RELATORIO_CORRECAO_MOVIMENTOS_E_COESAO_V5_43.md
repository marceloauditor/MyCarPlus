# MyCar+ V5.43 — Relatório de correção e coesão

**Data:** 31/07/2026  
**Origem:** relato de que a tela Consultar e Gerenciar Movimentos não permitia alterações.

## Diagnóstico reproduzido

Movimentos antigos podiam possuir `id` e `movimento_id` numéricos. Os atributos HTML dos botões sempre retornam texto. A comparação estrita entre número e texto não localizava o lançamento. Ao tocar em **Alterar**, o formulário abria como novo movimento e não carregava os dados existentes.

## Solução implantada

1. IDs de movimentos normalizados como texto durante o carregamento.
2. Criadas as funções `movementIdOf()` e `sameMovement()` para todas as consultas, alterações, exclusões e cálculos de limites de hodômetro.
3. Fluxo de alteração corrigido para carregar e substituir o movimento original.
4. Permitida a manutenção de movimentos históricos de veículos inativos.
5. Mantido o bloqueio de novos lançamentos em veículos inativos.
6. Fonte sincronizada com `www/` e assets Android.

## Testes executados

- Abertura de movimento com ID numérico: título **Alterar manutenção** e dados carregados.
- Alteração de R$ 200,00 para R$ 250,00: persistência aprovada sem duplicidade.
- Mesmo teste com veículo inativo: aprovado.
- Sintaxe JavaScript: aprovada.
- Coesão de versão e hashes: aprovada.
