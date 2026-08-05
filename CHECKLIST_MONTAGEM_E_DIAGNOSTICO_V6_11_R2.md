# CHECKLIST DE MONTAGEM E DIAGNÓSTICO — MYCAR+ V6.11 R2

1. APP 6.11, npm 6.11.0, Android 611/6.11.0 e cache `mycar-plus-v6-11`.
2. Motor de indicadores e XLSX no APP_SHELL.
3. Firebase modular único na versão 12.16.0.
4. Gravação com diário, fila e reconstrução automática.
5. Isolamento local por Conta Google e proteção no logout.
6. Ausência do modelo antigo de alertas e do campo `incluir_indicadores`.
7. Somente `data/MyCarPlus.xlsx` na fonte e nas camadas públicas.
8. Raiz, Web e Android idênticos para todos os arquivos executáveis.
9. BAT ASCII/CRLF, ZIP íntegro e manifesto SHA-256 aprovado.
10. Resíduos da V5.70/V6.10 removidos explicitamente da raiz instalada.
11. Teste de gravação/fila: versões estáveis, isolamento por UID, tombstones e diário de recuperação.
12. APK gerado antes do commit e do push.
