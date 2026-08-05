# MyCar+ V6.11 R2

Aplicativo Web/PWA e Android para controle de consumo, manutenção, despesas administrativas e receitas do veículo.

## Atualização

Mantenha `MYCAR_PLUS_V6_11_KEY.zip` e `ATUALIZAR_MYCAR_V6_11_KEY.bat` juntos na pasta Downloads. O atualizador valida o ZIP e seus hashes, cria backup, sincroniza Web/Android, testa cálculos e gravação, compila o APK, tenta publicar as regras do Firestore e somente então atualiza o GitHub.

Versões: APP 6.11 · npm 6.11.0 · Android 611 / 6.11.0 · cache `mycar-plus-v6-11`.

## Estabilização V6.11

- Fórmulas de negócio centralizadas em `indicator-calculations.js`.
- Gravação local protegida por diário e fila recuperável.
- Dados locais separados por Conta Google.
- Divergências entre aparelhos preservadas para decisão, sem sobrescrita silenciosa.
- Firebase Auth, Firestore, App Check e IA na geração modular 12.16.0.
- Motor de indicadores e banco XLSX disponíveis offline.
- Modelo antigo de alertas eliminado do código, armazenamento e Firebase.
- Funções órfãs, arquivos duplicados e ativos sem uso removidos.
- BAT em CRLF, sem BOM, com validação antes de alterar o projeto.
