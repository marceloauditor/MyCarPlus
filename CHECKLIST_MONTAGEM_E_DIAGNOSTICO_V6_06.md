# CHECKLIST DE MONTAGEM E DIAGNÓSTICO — MYCAR+ V6.06

Este documento passa a ser obrigatório em todas as novas versões do MyCar+.
O atualizador executa automaticamente `scripts/check-update-package.js` antes de alterar o projeto e novamente depois da sincronização.

## Erro corrigido da V6.05

A V6.05 foi interrompida em “Integridade ou versão do pacote reprovada”. O pacote possuía as versões corretas, porém o BAT usava vários comandos `findstr` com aspas aninhadas. A falha era encaminhada para um rótulo genérico, sem registrar qual teste havia reprovado.

Na V6.06:

- nenhum teste de versão usa `findstr`;
- cada teste possui código próprio;
- a primeira falha é destacada;
- o pacote é validado antes do backup e antes de qualquer alteração;
- o diretório temporário é preservado quando houver falha;
- o diagnóstico é salvo em `Downloads\DIAGNOSTICO_MYCAR_V6_06.txt`.


## Correção R2 após o primeiro teste da V6.06

O diagnóstico da primeira execução da V6.06 identificou corretamente `CHK-CLEAN-001`, mas revelou um erro na rotina de limpeza do BAT. Os padrões curinga estavam dentro de um comando `FOR` e podiam ser expandidos com base na pasta em que o BAT foi iniciado, em vez da pasta do projeto. Assim, o arquivo antigo `ATUALIZAR_MYCAR_V6_05_KEY.bat` permaneceu no projeto e gerou um falso bloqueio depois da sincronização.

Na revisão R2:

- cada padrão de limpeza é executado diretamente sobre `%PROJETO%`;
- não existe mais expansão de curingas pelo diretório atual;
- a remoção da V6.05 é confirmada imediatamente após a limpeza;
- `CHK-CLEAN-001` continua ativo e agora diferencia resíduo no pacote de falha da limpeza instalada;
- a versão do aplicativo permanece 6.06, pois a fonte funcional já havia sido aplicada corretamente.

## Checklist obrigatório para montagem

1. Atualizar `APP_VERSION` em `app.js`.
2. Atualizar a versão visível em `index.html`.
3. Atualizar `package.json` e as duas ocorrências principais do `package-lock.json`.
4. Atualizar `versionCode` e `versionName` do Android.
5. Atualizar o nome do cache no `sw.js`.
6. Atualizar parâmetros de quebra de cache das imagens.
7. Executar `node scripts/sync-web-root.js`.
8. Sincronizar os arquivos Web com os ativos públicos do Android.
9. Executar `node scripts/validate-cohesion.js`.
10. Gerar `MANIFEST_SHA256_V6_06.txt` depois de finalizar todos os arquivos.
11. Executar o checklist automático em modo `package`.
12. Confirmar que o BAT interno é idêntico ao BAT entregue separadamente.
13. Testar a abertura do ZIP e conferir a pasta interna.
14. Somente então liberar ZIP, BAT e relatório de validação.

## Códigos de diagnóstico

- `CHK-ROOT`: localização da pasta do pacote.
- `CHK-FILES`: arquivos obrigatórios.
- `CHK-APP`: versão da aplicação.
- `CHK-NPM`: versões npm e lock.
- `CHK-PWA`: cache da aplicação Web.
- `CHK-ANDROID`: versões Android.
- `CHK-DATA`: base inicial preservada.
- `CHK-LOGO`: integridade dos logotipos e Base64.
- `CHK-SYNC`: igualdade raiz, Web e Android.
- `CHK-MANIFEST`: hashes SHA-256.
- `CHK-BAT`: estrutura do atualizador.
- `CHK-CLEAN`: resíduos operacionais antigos e confirmação da limpeza controlada R2.

## Regra para futuras versões

Nunca substituir uma mensagem específica por “integridade ou versão reprovada” sem registrar o código, o nome do teste e o valor encontrado. O relatório de diagnóstico deve acompanhar qualquer log de falha.
