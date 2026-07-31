# MyCar+ V5.50

**Data:** 31/07/2026  
**Versão da aplicação:** 5.50.0  
**Android:** versionCode 550 / versionName 5.50.0

## Atualização dos alertas de manutenção

- Padronização de todos os alertas como alertas técnicos do grupo **MANUTENÇÃO**.
- Tela limitada aos alertas e ao histórico do veículo selecionado.
- Bloqueio de novos alertas e de avisos ativos para veículos inativos.
- Inclusão, alteração, ativação, desativação, conclusão e exclusão disponíveis para o usuário.
- Exclusão com confirmação clara de que o histórico técnico não será apagado.
- Preservação dos movimentos de manutenção e dos registros históricos ao excluir um alerta.
- Normalização de alertas antigos sem limpeza automática de dados reais.
- Campo de veículo coletado explicitamente mesmo quando bloqueado na interface.
- Grupo MANUTENÇÃO fixado no formulário para evitar alertas classificados em grupos incorretos.
- Resumo da tela atualizado para apresentar também alertas inativos.
- Texto orientativo inserido na tela de alertas.

## Atualização automatizada

- Novo `ATUALIZAR_MYCAR_V5_50_WEB_ANDROID.bat`.
- BAT autocontido: não depende de `APLICAR_ATUALIZACAO_MYCAR_V5_50.ps1`.
- Backup automático da versão anterior.
- Sincronização da fonte oficial com Web e Android.
- Validação de coesão e geração do APK de teste.
- Remoção automática dos BATs operacionais antigos da raiz do projeto.
