# Configuração dos dados online — MyCar+ V6.13

1. Crie um projeto no Firebase.
2. Ative Authentication > Sign-in method > Google.
3. Em Authentication > Settings > Authorized domains, adicione o domínio usado pela versão Web.
4. Crie o Cloud Firestore em modo de produção.
5. Publique as regras existentes em `firebase/firestore.rules`.
6. Confira os dados do aplicativo Web em `firebase-config.js`.
7. Publique os arquivos da pasta `www` no GitHub Pages.

## Primeira conexão de uma conta

- Se a conta já possuir dados no Firebase, eles serão carregados em seu espaço local exclusivo.
- Se a conta estiver vazia e existirem dados no espaço local do aparelho, o aplicativo pedirá confirmação antes de vinculá-los e enviá-los.
- Recusar a vinculação cria um espaço vazio para aquela conta e preserva o espaço local anterior.
- Sair da conta retorna ao espaço local sem misturar os dados de usuários diferentes.

## Sincronização

A gravação local é concluída antes do envio. Uma fila e um diário permitem recuperar operações interrompidas. Em caso de edição divergente em dois aparelhos, nenhuma versão é descartada silenciosamente: o painel solicita a escolha da versão a manter.
