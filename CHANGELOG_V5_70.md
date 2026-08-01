# MyCar+ V5.70

- Base: V5.68 homologada.
- Guia Relatórios abre somente com Executivo, I.A., XLSX e Voltar.
- Período aparece após a escolha do relatório.
- Período padrão dos relatórios: últimos 12 meses.
- Guia Gráficos exibe os gráficos antes do seletor de datas.
- Orientação para rolar ao final da página.
- Período padrão dos gráficos: últimos 6 meses.
- Impressão Android e compartilhamento HTML da V5.68 preservados.
- Arquivos operacionais e relatórios técnicos antigos removidos do pacote.

## Correção do BAT de atualização
- Corrigida a localização automática de arquivos baixados com sufixos `(1)`, `(2)` etc.
- Removida a busca PowerShell com aspas incompatíveis.
- Adotada busca nativa do Windows com `dir`, selecionando o ZIP mais recente.
- Tornada determinística a localização da pasta interna `MYCAR_PLUS_V5_70_TREE`.

## BAT TREE simplificado
- Pacote renomeado para `MYCAR_PLUS_V5_70_TREE.zip`.
- Pasta interna renomeada para `MYCAR_PLUS_V5_70_TREE`.
- O BAT aceita cópias numeradas pelo navegador, como `(1)`, `(2)` e seguintes.
- Removidas a limpeza e a validação organizacional da pasta real.
- Mantidas apenas: backup, extração, cópia, dependências, sincronização Web/Android e validação funcional.
- A variável temporária própria é `WORKTEMP`, sem sobrescrever `%TEMP%` do Windows.

## Correção operacional do BAT
- Log de instalação gravado na pasta Downloads.
- Corrigidos os testes Android para o pacote `br.com.marceloauditor.mycarplus`.
- Geração automática do APK de depuração.
- Instalação/atualização automática no celular conectado via ADB.
- Atualização automática do repositório GitHub por commit e push.
- Abertura automática do Android Studio após a sincronização do Capacitor.
