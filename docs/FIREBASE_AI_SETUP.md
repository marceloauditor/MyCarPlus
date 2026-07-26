# Firebase AI Logic — MyCar+ V5.21

O PWA utiliza diretamente o SDK Web do Firebase AI Logic com o provedor
Gemini Developer API. A chave da API Gemini permanece protegida no serviço
proxy do Firebase e não é incluída no aplicativo.

## Configuração já incorporada

- Projeto Firebase: `mycarplus-3180a`
- Aplicativo: MyCarPlus Web
- App Check: reCAPTCHA v3
- Renovação automática do token: ativada
- Modelo inicial: `gemini-3.5-flash`

## Publicação

1. Publique todos os arquivos da pasta na raiz do GitHub Pages.
2. Não copie a chave secreta do reCAPTCHA para nenhum arquivo.
3. Confirme que `marceloauditor.github.io` continua nos domínios autorizados.
4. Teste login, sincronização e uma análise inteligente no endereço publicado.
5. Acompanhe as métricas do App Check antes de exigir proteção em outros
   serviços além do Firebase AI Logic.

O nome do modelo pode ser atualizado em `firebase-config.js` sem alterar a
estrutura do módulo de inteligência.
