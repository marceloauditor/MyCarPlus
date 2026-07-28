# MyCar+ V5.33 — Conectividade e sincronização persistente

- Sessão Google persistente com Firebase Auth LOCAL.
- Persistência offline do Firestore com sincronização entre abas.
- Fila local durável para o estado ainda não enviado.
- Reenvio automático após reconexão, retorno ao aplicativo e verificação periódica.
- Monitor de internet, autenticação, pendências e sincronização.
- Painel de diagnóstico com conta, rede, última sincronização e último recebimento.
- Botão de sincronização manual.
- Proteção contra aplicação remota enquanto existem alterações locais pendentes.
- Dados continuam salvos localmente em falhas de internet ou Firebase.
- Versão Web/PWA 5.33.0, Android versionCode 533 e cache PWA V5.33.

Observação: o modelo atual sincroniza o estado consolidado do usuário. Conflitos simultâneos são evitados enquanto há pendência local; a última gravação confirmada no servidor torna-se a versão distribuída aos demais dispositivos.
