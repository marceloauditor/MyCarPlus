# CHANGELOG — MyCar+ V6.06

## Atualizador e diagnóstico

- Corrigida a reprovação genérica da V6.05 na validação inicial.
- Removidos todos os testes de versão baseados em `findstr`.
- Criado checklist automático com códigos individuais de diagnóstico.
- Validação do ZIP executada antes do backup e antes de qualquer alteração no projeto.
- Segunda validação executada após sincronizar raiz, Web e Android.
- Criado diagnóstico permanente em Downloads com a primeira falha destacada.
- Diretório temporário preservado em caso de erro para facilitar auditoria.
- Incluídos checklist de montagem, manifesto SHA-256 e validador manual dentro do ZIP.

## Revisão R2 do atualizador

- Corrigida a limpeza que usava curingas dentro de `FOR` e dependia do diretório atual.
- Os padrões de exclusão agora apontam diretamente para a pasta do projeto.
- Incluída conferência imediata de remoção dos artefatos operacionais da V6.05.
- Mantido o teste `CHK-CLEAN-001`, agora com mensagem distinta para pacote e projeto instalado.
- Aplicativo mantido em V6.06; somente o atualizador recebeu revisão R2.

## Versões

- Aplicação/Web/PWA: 6.06
- Pacote npm: 6.6.0
- Android versionCode: 606
- Android versionName: 6.06.0
- Cache PWA: mycar-plus-v6-06
