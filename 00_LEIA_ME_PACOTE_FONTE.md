# MyCar+ V6.06 — Pacote-fonte KEY

Este pacote contém a fonte consolidada do MyCar+ V6.06 para Web/PWA e Android, com checklist automático de montagem e diagnóstico.

## Atualização recomendada

1. Coloque `MYCAR_PLUS_V6_06_KEY_R2.zip` e `ATUALIZAR_MYCAR_V6_06_KEY_R2.bat` em **Downloads**.
2. Feche o Android Studio antes da atualização.
3. Execute o BAT.
4. O pacote será extraído e validado antes de qualquer alteração.
5. Consulte `Downloads\DIAGNOSTICO_MYCAR_V6_06.txt` se a execução for interrompida.
6. O GitHub somente será atualizado depois da validação, sincronização e compilação do APK.

## Preservação de dados

- A base inicial antiga em `data/MyCarPlus.xlsx` permanece no pacote.
- A base existente no Firebase não é substituída quando já existe.
- `.git`, `node_modules`, `android/local.properties` e configurações locais são preservados.

## Arquivos de diagnóstico incluídos

- `CHECKLIST_MONTAGEM_E_DIAGNOSTICO_V6_06.md`;
- `EXECUTAR_CHECKLIST_MONTAGEM_V6_06.bat`;
- `scripts/check-update-package.js`;
- `MANIFEST_SHA256_V6_06.txt`;
- `VALIDACAO_PACOTE_V6_06_KEY.txt`.

## Identificação

- Aplicação/Web/PWA: 6.06
- package.json: 6.6.0
- Android: versionCode 606 / versionName 6.06.0
- Cache PWA: mycar-plus-v6-06

## Revisão do atualizador

Este pacote contém o atualizador V6.06 revisão R2, com limpeza por caminhos absolutos e diagnóstico CHK-CLEAN corrigido.
