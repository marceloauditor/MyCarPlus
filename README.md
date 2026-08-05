# MyCar+ V6.10 R2

Aplicativo Web/PWA e Android para controle de consumo, manutenção, despesas administrativas e receitas do veículo.

## Atualização

Mantenha `MYCAR_PLUS_V6_10_R2_KEY.zip` e `ATUALIZAR_MYCAR_V6_10_R2_KEY.bat` juntos na pasta Downloads. O atualizador valida a integridade do ZIP, cria backup, sincroniza Web/Android, testa as fórmulas, compila o APK e somente então atualiza o GitHub.

Versões: APP 6.10 · npm 6.10.0 · Android 610 / 6.10.0 · cache `mycar-plus-v6-10` · revisão do pacote R2.

## Ajustes V6.10 R2

- Centralização integral das fórmulas dos indicadores e artefatos em `indicator-calculations.js`.
- Custos por km, dia e mês; custo líquido; competência; projeções; rateio; consumo; litros; participação e agregações por combustível usam o mesmo motor.
- Consumo exibido com duas casas, mantendo precisão interna.
- BAT regravado em ASCII sem BOM e CRLF.
- ZIP testado estruturalmente antes da extração e antes de qualquer alteração no projeto.
