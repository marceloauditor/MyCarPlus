# POLÍTICA DE GRAVAÇÃO E SINCRONIZAÇÃO — MYCAR+ V6.11

## Gravação local

Cada operação grava o estado no aparelho e registra a mesma alteração em uma fila local. Um diário temporário permanece disponível se o processo for interrompido entre essas etapas. Na abertura ou antes de sincronizar, o sistema recupera o diário e reconstrói a fila comparando o estado atual com a última base confirmada.

## Separação por usuário

Cada UID do Firebase possui chaves locais próprias. O espaço sem login é identificado como `local`. Entrar ou sair de uma Conta Google troca o espaço ativo sem copiar dados automaticamente entre usuários.

## Conta sem base online

Quando o Firebase da conta estiver vazio, o usuário precisa confirmar se deseja vincular os dados existentes no aparelho. Sem confirmação, a conta começa vazia e o espaço anterior permanece preservado.

## Conflitos

A sincronização compara a versão-base, a cópia local e a cópia remota. Quando dois aparelhos alteram o mesmo registro a partir de bases diferentes, o conflito é mantido e apresentado no painel. O usuário escolhe manter a versão local ou a versão do Firebase.

## Exclusões

Exclusões são sincronizadas inicialmente como tombstones. Após 90 dias, tombstones antigos podem ser eliminados do Firebase. O modelo antigo de alertas é excluído imediatamente por ter sido utilizado somente em testes.

## Funcionamento offline

O PWA armazena os arquivos essenciais, o motor de indicadores e `data/MyCarPlus.xlsx`. Alterações offline permanecem no aparelho e são enviadas quando houver conexão e autenticação.
