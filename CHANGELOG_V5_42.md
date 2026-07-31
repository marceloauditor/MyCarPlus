# MyCar+ V5.42 — Implantação consolidada

**Base:** V5.41 consolidada  
**Data:** 31/07/2026

## Correções implantadas

### Persistência e navegação

- Gravação local transacional com restauração do estado anterior em caso de falha.
- Separação entre persistência do lançamento e rotinas complementares de alertas/telas.
- Mensagens claras de sucesso, aviso e erro.
- Retorno do lançamento à tela de origem.
- Cadastro rápido de item, fornecedor ou motorista preserva o lançamento em andamento e retorna ao mesmo ponto por Salvar, Cancelar, Fechar, Esc ou Voltar.

### Alertas técnicos

- Correção da coleta de `vehicleId` em campo bloqueado.
- Todos os alertas passam a ser tratados como técnicos.
- Inclusão, alteração, ativação, desativação e exclusão disponíveis para o veículo ativo.
- Exclusão com mensagem explicativa e preservação do histórico técnico.
- Parâmetro excluído recebe marca lógica para impedir recriação automática involuntária.
- Histórico técnico visível e filtrado pelo veículo selecionado.
- Veículos inativos não geram alertas ativos.
- Conclusão de manutenção registra histórico e recalcula a próxima programação quando recorrente.

### Relatórios

- Visualizador interno para Android, sem dependência de `window.close()` na WebView.
- Fechamento controlado dos relatórios Executivo, Inteligente e Histórico Técnico.
- Padronização dos botões: `Relatório Executivo PDF`, `Relatório com IA PDF`, `Histórico técnico PDF` e `Exportar dados XLSX`.

### Dados e integração

- Exportação e importação XLSX ampliadas para Alertas, Histórico de Alertas e Parâmetros Técnicos.
- Esquema de backup e sincronização atualizado para a versão 8.
- Cache PWA atualizado para `mycar-plus-v5-42`.
- Android atualizado para `versionCode 542` e `versionName 5.42.0`.
- BAT versionado para V5.42 e integrado à validação automática de coesão.

## Validação

A fonte inclui `scripts/validate-cohesion.js`, que verifica versões, IDs duplicados, regras críticas e igualdade de arquivos entre raiz, `www/` e assets Android.
