# Relatório de atualização — Alertas de manutenção — MyCar+ V5.50

## 1. Objetivo

Consolidar em um pacote completo a atualização dos alertas de manutenção, mantendo o mesmo comportamento na Web/PWA e no Android.

## 2. Regras implantadas

1. Todos os alertas são tratados como alertas técnicos do grupo **MANUTENÇÃO**.
2. Cada alerta permanece vinculado ao veículo informado no cadastro.
3. A tela lista somente alertas e histórico do veículo selecionado.
4. Veículos inativos ficam disponíveis para consulta, mas não geram avisos ativos e não recebem novos alertas.
5. O usuário pode incluir, alterar, concluir, ativar, desativar e excluir alertas.
6. A exclusão solicita confirmação e remove somente o alerta e sua programação futura.
7. O histórico técnico e os movimentos reais de manutenção são preservados.
8. Alertas antigos são normalizados na carga sem exclusão automática de dados.
9. O formulário fixa o grupo MANUTENÇÃO e coleta explicitamente o veículo, mesmo com o campo bloqueado.
10. A mudança do veículo selecionado atualiza imediatamente a tela de alertas e o histórico.

## 3. Instalador

O arquivo `ATUALIZAR_MYCAR_V5_50_WEB_ANDROID.bat` é autocontido. Ele não necessita de arquivo PowerShell `.ps1`.

O instalador:

- localiza o ZIP na pasta Downloads, inclusive com sufixos como `(1)`;
- cria backup do projeto;
- copia a nova fonte;
- instala dependências;
- sincroniza Web e Android;
- executa a validação de coesão;
- gera o APK de teste;
- registra todo o processo em arquivo de log.

## 4. Preservação de dados

A atualização não executa limpeza automática do histórico técnico, pois não é possível distinguir com segurança dados antigos de teste e registros reais do usuário. A regra permanente é preservar o histórico.

## 5. Identificação

- Aplicação: `5.50.0`
- Android versionCode: `550`
- Android versionName: `5.50.0`
- Cache PWA: `mycar-plus-v5-50`
