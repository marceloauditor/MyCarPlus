# Checklist de montagem e diagnóstico — MyCar+ V6.07

Este checklist acompanha o pacote para identificar a primeira falha pelo código da verificação.

## Execução automática

Na pasta extraída, execute:

`EXECUTAR_CHECKLIST_MONTAGEM_V6_07.bat`

Durante a atualização, o BAT principal executa o mesmo checklist antes do backup e depois da sincronização. Em caso de falha, consulte:

- `Downloads\ATUALIZACAO_MYCAR_V6_07_KEY_LOG.txt`
- `Downloads\DIAGNOSTICO_MYCAR_V6_07.txt`

## Etapas verificadas

| Código | Verificação |
|---|---|
| CHK-ROOT-001 | Pasta raiz do pacote |
| CHK-FILES-001 | Arquivos essenciais |
| CHK-APP-001 | Versão 6.07 do aplicativo |
| CHK-NPM-001/002 | Versões do package.json e package-lock.json |
| CHK-PWA-001 | Cache PWA V6.07 |
| CHK-ANDROID-001/002 | versionCode 607 e versionName 6.07.0 |
| CHK-DATA-001 | Base inicial MyCarPlus.xlsx preservada |
| CHK-LOGO-001/003 | Integridade dos logotipos |
| CHK-AI-001 | Indicadores executivos enviados à IA |
| CHK-AI-002 | Proteção contra conclusões sem evidência |
| CHK-AI-003 | Nome diferenciado e Dica MyCar+ |
| CHK-SYNC-001 | Igualdade entre raiz, Web e Android |
| CHK-MANIFEST-001 | Conferência dos hashes SHA-256 |
| CHK-BAT-001 | Estrutura do BAT V6.07 |
| CHK-CLEAN-001 | Ausência de resíduos operacionais da V6.06 |

## Fluxo protegido do atualizador

1. Localiza somente `MYCAR_PLUS_V6_07_KEY.zip`.
2. Extrai o pacote sem alterar o projeto.
3. Executa o checklist do pacote.
4. Cria backup do projeto.
5. Remove resíduos operacionais antigos por caminho absoluto.
6. Copia a V6.07.
7. Sincroniza raiz, Web e Android.
8. Executa novamente o checklist.
9. Valida a coesão funcional e as regras da Análise Inteligente.
10. Compila um APK Debug novo.
11. Somente depois envia as alterações ao GitHub.

## Regra de diagnóstico

A primeira linha `[ERRO]` do diagnóstico identifica a causa prioritária. O GitHub não é atualizado antes da aprovação do checklist, da coesão e do APK.
