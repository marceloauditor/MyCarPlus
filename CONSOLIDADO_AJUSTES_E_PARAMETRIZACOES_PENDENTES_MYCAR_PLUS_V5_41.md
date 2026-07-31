# MYCAR+ V5.41 — Documento Consolidado de Ajustes e Parametrizações Pendentes

**Versão de referência:** 5.41  
**Data da consolidação:** 31/07/2026  
**Situação da especificação:** implementada na versão 5.42 em 31/07/2026  
**Finalidade:** reunir em um único documento as especificações funcionais e técnicas recebidas para correção das rotinas do MYCAR+.


> **Registro de implantação:** os itens deste consolidado foram aplicados na V5.42. A matriz de comprovação e os resultados da revisão de coesão estão em `RELATORIO_IMPLANTACAO_E_COESAO_MYCAR_PLUS_V5_42.md`.

## Critério de prevalência

Este documento reúne integralmente os dois arquivos de origem. Em caso de conflito entre as especificações:

1. prevalece a orientação mais recente do arquivo **Ajustes Pendentes de Correção**;
2. para os alertas técnicos, o usuário poderá **incluir, alterar e excluir** qualquer alerta;
3. a exclusão removerá somente o alerta e sua programação futura, preservando o histórico técnico e os movimentos reais;
4. ficam superadas, portanto, as recomendações anteriores que restringiam a exclusão física dos alertas técnicos às ações “Dispensar”, “Desativar” ou “Ocultar”;
5. as demais correções da proposta de rotinas permanecem válidas enquanto não conflitarem com as regras posteriores.

---

# PARTE I — AJUSTES PENDENTES DE CORREÇÃO

# MYCAR+ V5.41 — Ajustes Pendentes de Correção

**Versão de referência:** 5.41  
**Situação:** pendente de implementação  
**Escopo:** cadastro e funcionamento dos alertas técnicos

## 1. Objetivo

Reestruturar o cadastro de alertas para que todos sejam tratados como alertas técnicos utilizados na programação das manutenções do veículo.

O usuário deverá poder:

- incluir novos alertas técnicos;
- alterar alertas técnicos existentes;
- excluir alertas técnicos;
- consultar o histórico técnico relacionado ao veículo ativo.

## 2. Cadastro de alertas técnicos

A tela deverá apresentar os alertas técnicos do veículo ativo e disponibilizar as seguintes ações:

- **Novo alerta:** abre o formulário para inclusão;
- **Editar:** abre o alerta selecionado para alteração;
- **Excluir:** solicita confirmação antes da exclusão;
- **Salvar:** valida e grava os dados;
- **Cancelar/Fechar/Voltar:** retorna à tela anterior sem salvar alterações indevidas.

Cada alerta deverá permanecer vinculado ao respectivo veículo.

## 3. Exclusão de alerta

Ao solicitar a exclusão, o sistema deverá exibir uma confirmação semelhante a:

> **Excluir alerta técnico?**
>
> Os alertas são utilizados na programação das manutenções do veículo. A exclusão removerá somente este alerta e não apagará os registros do histórico técnico.
>
> Tem certeza de que deseja excluir?

Botões:

- **Cancelar:** não realiza nenhuma alteração;
- **Excluir alerta:** remove somente o alerta selecionado.

## 4. Preservação do histórico técnico

A exclusão de um alerta deverá apagar apenas o cadastro e a programação futura desse alerta.

Os registros já existentes no histórico técnico não poderão ser excluídos automaticamente nem perder seu vínculo com o veículo.

O histórico atualmente presente na versão de teste não possui valor real e poderá ser limpo antes da disponibilização da versão definitiva. Essa limpeza é excepcional e não altera a regra permanente de preservação do histórico real.

## 5. Veículo ativo e veículos inativos

- A tela de alertas deverá listar somente os alertas do veículo ativo.
- O histórico técnico exibido na área de alertas deverá pertencer somente ao veículo ativo.
- Veículos inativos não deverão gerar alertas ativos.
- Alertas e históricos de outros veículos não poderão aparecer misturados.
- A troca do veículo ativo deverá atualizar imediatamente a listagem.

## 6. Regras de integridade

- Não excluir o histórico ao excluir um alerta.
- Não permitir alerta sem vínculo com um veículo.
- Não transferir alerta ou histórico entre veículos.
- Não gerar avisos ativos para veículos inativos.
- Manter o mesmo comportamento na versão web e no Android.
- Garantir que os botões funcionem por clique/toque e que as ações de voltar do Android não causem salvamento ou exclusão involuntária.

## 7. Critérios de aceite

A correção será considerada concluída quando:

1. for possível incluir, editar e excluir alertas técnicos;
2. a exclusão exigir confirmação;
3. a mensagem informar que o alerta participa da programação das manutenções;
4. a mensagem esclarecer que o histórico técnico será preservado;
5. a exclusão remover apenas o alerta selecionado;
6. a tela apresentar somente dados do veículo ativo;
7. veículos inativos não produzirem alertas ativos;
8. web e Android apresentarem o mesmo funcionamento;
9. os dados técnicos de teste forem removidos antes da liberação definitiva;
10. os testes confirmarem que nenhum histórico real é apagado durante a exclusão de alertas.

## 8. Validação obrigatória

Executar testes de:

- inclusão, alteração e exclusão de alerta;
- cancelamento da exclusão;
- preservação do histórico após excluir o alerta;
- troca entre veículos ativos;
- inativação e reativação de veículo;
- fechamento, cancelamento e retorno pelo botão do Android;
- persistência após fechar e abrir novamente o aplicativo;
- sincronização dos dados entre web e Android.

---

# PARTE II — PROPOSTA DE CORREÇÃO DAS ROTINAS

> **Nota de consolidação:** as passagens desta parte que recomendam impedir a exclusão física de alertas técnicos devem ser consideradas substituídas pelas regras da Parte I.

# MYCAR+ V5.41 — Proposta de Correção das Rotinas

## 1. Objetivo

Esta proposta apresenta as correções recomendadas para as falhas identificadas nas rotinas de movimentos, lançamentos, alertas e Relatório Executivo do MYCAR+ V5.41.

As soluções foram definidas com base no comportamento mais comum em aplicativos de controle financeiro e veicular, priorizando:

- segurança no salvamento dos dados;
- mensagens claras ao usuário;
- retorno consistente à tela anterior;
- preservação dos dados já digitados;
- compatibilidade entre Web e Android;
- navegação controlada dentro do aplicativo.

> **Observação:** esta proposta não executa alterações no código. Ela serve como especificação funcional e técnica para a futura implementação.

## 2. Falhas identificadas e propostas de correção

| Tela ou rotina | Falha identificada | Comportamento atual | Padrão recomendado | Proposta de correção | Prioridade |
|---|---|---|---|---|---|
| Cadastro de movimento/lançamento | O salvamento pode ser interrompido por uma falha posterior | O sistema grava, recalcula distâncias, atualiza telas e avalia alertas em uma única sequência. Uma falha em qualquer etapa pode manter o formulário aberto | Confirmar primeiro a persistência e executar depois as rotinas complementares | Separar a gravação das atualizações posteriores, incluir tratamento de erros e confirmar o sucesso somente após validar a persistência | Crítica |
| Movimento/lançamento | Não há indicação clara do motivo da falha | O usuário pode entender apenas que o botão Salvar não funcionou | Exibir mensagem objetiva de sucesso ou erro | Aplicar tratamento com `try/catch`, registrar o erro técnico e mostrar uma mensagem como: “Não foi possível salvar o lançamento. Verifique os campos e tente novamente.” | Alta |
| Movimento/lançamento | A navegação após salvar não respeita necessariamente a origem | O sistema abre sempre a consulta de movimentos | Retornar à tela imediatamente anterior ou à lista relacionada ao registro | Registrar a tela de origem e, após salvar, fechar o formulário, atualizar os dados e retornar à origem | Alta |
| Cadastro rápido de item, fornecedor ou motorista | O retorno ao lançamento é incompleto | O sistema tenta retornar sem preservar formalmente todo o contexto | Retornar ao lançamento com os dados já digitados | Criar um contexto temporário contendo tela de origem, grupo, veículo, campos preenchidos e item cadastrado | Alta |
| Cadastro rápido | Salvar, cancelar, fechar, usar `Esc` ou Voltar podem levar a destinos diferentes | Cada comando pode executar uma navegação distinta | Todos os comandos devem retornar ao mesmo ponto de origem | Centralizar essas ações em uma única rotina de fechamento e retorno | Alta |
| Cadastro de alerta | O alerta não salva porque o veículo não entra na coleta do formulário | O campo `vehicleId` está desabilitado e não é incluído no `FormData` | O campo pode ficar bloqueado visualmente, mas seu valor deve ser enviado | Usar `readonly`, criar um campo oculto ou adicionar explicitamente o `vehicleId` ao objeto antes da validação | Crítica |
| Exclusão de alerta manual | A exclusão precisa ter confirmação e atualização uniforme | A ação depende do tipo de alerta e da rotina atual | Confirmar, excluir, atualizar a lista e informar o resultado | Padronizar a exclusão com confirmação, mensagem de sucesso e atualização imediata da tela | Alta |
| Exclusão de alerta técnico | O botão Excluir não é apresentado | Alertas técnicos somente podem ser ativados ou desativados | Alertas automáticos normalmente não são apagados, porque podem ser recriados pelas regras do veículo | Manter sem exclusão física e substituir a ação por “Dispensar alerta”, “Desativar” ou “Ocultar” | Média |
| Alerta técnico personalizado | Não há forma de encerrar um alerta que não se aplica mais | O alerta permanece disponível sem uma ação equivalente à exclusão | Permitir dispensar a ocorrência sem eliminar a regra técnica | Criar a ação “Dispensar alerta”, registrando data, veículo e motivo; permitir que um novo alerta surja no próximo ciclo | Média |
| Retorno após salvar alerta | Não existe restauração formal da tela anterior | O formulário fecha e os dados são atualizados | Retornar à lista de alertas ou à tela que abriu o cadastro | Registrar a origem, fechar o formulário, atualizar os alertas e restaurar a tela anterior | Alta |
| Relatório Executivo | O botão Fechar pode não funcionar no Android | O relatório usa `window.close()`, que pode falhar quando ocupa a própria WebView | Usar navegação interna controlada no Android e fechamento de janela na Web | Na Web, fechar a janela separada; no Android, abrir o relatório em tela ou modal interno com botão Voltar controlado | Alta |
| Relatório Executivo | O fechamento depende do histórico do navegador | O histórico pode não conter uma tela anterior válida | O aplicativo deve registrar internamente a origem do relatório | Salvar a tela de origem antes de abrir o relatório e retornar diretamente a ela | Alta |
| Botão do relatório | O texto “Gerar PDF” não identifica o conteúdo | A ação parece uma geração genérica de arquivo | Informar o conteúdo e o formato | Alterar o texto para **“Relatório Executivo PDF”** | Média |
| Botão da planilha | O nome deve diferenciar claramente a planilha do relatório em PDF | Atualmente aparece “Exportar XLSX” | Informar o conteúdo e o formato da exportação | Manter “Exportar XLSX” ou padronizar como **“Relatório Executivo XLSX”** | Baixa |
| Web e Android | Os mesmos problemas afetam as duas plataformas | As cópias do código estão sincronizadas | Corrigir na fonte principal e sincronizar os destinos | Alterar a fonte oficial, atualizar `www` e executar a sincronização do Capacitor para o Android | Crítica |
| Confirmação de salvamento | A permanência do formulário aberto gera dúvida sobre a gravação | Não existe confirmação visual uniforme | Confirmar a gravação e retornar automaticamente | Exibir “Lançamento salvo com sucesso”, atualizar os dados e voltar à tela anterior | Alta |

## 3. Fluxo padrão recomendado

Todas as rotinas de movimentos, lançamentos, alertas e cadastros rápidos devem seguir o mesmo fluxo:

1. Validar os campos obrigatórios.
2. Montar o objeto completo, incluindo valores de campos bloqueados.
3. Salvar os dados.
4. Confirmar que a persistência foi concluída.
5. Exibir uma mensagem breve de sucesso.
6. Executar recálculos e atualizações complementares com tratamento de erros.
7. Atualizar a lista ou tela de origem.
8. Fechar o formulário.
9. Retornar à tela anterior.

Resumo do padrão:

> **Validar → Salvar → Confirmar → Atualizar → Retornar**

## 4. Regras específicas de navegação

### 4.1 Movimentos e lançamentos

- Após salvar, retornar à tela que abriu o formulário.
- A lista de movimentos deve ser atualizada antes de reaparecer.
- Se ocorrer erro na gravação, o formulário deve permanecer aberto e preservar os dados digitados.
- Se o registro for salvo, mas uma atualização complementar falhar, o sistema deve informar que o lançamento foi salvo e registrar separadamente a falha complementar.

### 4.2 Cadastros rápidos

- Item, fornecedor e motorista devem retornar ao lançamento de origem.
- Os dados do lançamento já preenchidos devem ser preservados.
- O novo cadastro deve aparecer selecionado ou disponível imediatamente.
- Salvar, Cancelar, Fechar, `Esc` e Voltar devem usar a mesma rotina de retorno.

### 4.3 Alertas

- Alertas manuais podem ser excluídos após confirmação.
- Alertas técnicos automáticos não devem ser apagados fisicamente.
- Para alertas técnicos, devem ser oferecidas as ações “Dispensar”, “Desativar” ou “Ocultar”.
- Depois de salvar, excluir ou dispensar, a lista deve ser atualizada e a tela anterior restaurada.

### 4.4 Relatório Executivo

- Na versão Web, o relatório pode usar janela separada, desde que o botão Fechar consiga encerrá-la.
- No Android, o relatório deve ser exibido em uma tela ou modal interno.
- O botão Fechar deve retornar diretamente à tela que abriu o relatório.
- O botão de geração deve ser identificado como **“Relatório Executivo PDF”**.
- Se adotada a padronização completa, o botão da planilha deve ser identificado como **“Relatório Executivo XLSX”**.

## 5. Ordem recomendada de implantação

| Etapa | Correção | Justificativa |
|---|---|---|
| 1 | Corrigir o envio de `vehicleId` no cadastro de alerta | Impede diretamente o salvamento |
| 2 | Reestruturar o salvamento de movimentos e lançamentos | Protege a persistência dos dados principais |
| 3 | Implantar tratamento de erros e mensagens de confirmação | Evita dúvida sobre o resultado das ações |
| 4 | Criar o controle centralizado de tela de origem | Padroniza o retorno após salvar, cancelar ou fechar |
| 5 | Corrigir o fluxo dos cadastros rápidos | Preserva o lançamento em andamento |
| 6 | Padronizar exclusão e dispensa de alertas | Diferencia registros manuais de regras técnicas |
| 7 | Corrigir o fechamento do Relatório Executivo | Resolve a incompatibilidade com a WebView Android |
| 8 | Atualizar os textos dos botões | Melhora a identificação das funções |
| 9 | Sincronizar Web e Android | Garante o mesmo comportamento nas duas plataformas |
| 10 | Executar testes funcionais e de regressão | Confirma que as correções não afetaram outras rotinas |

## 6. Critérios de aceite

A implementação será considerada concluída quando:

- movimentos e lançamentos forem salvos sem perda de dados;
- erros complementares não anularem um registro já persistido;
- o aplicativo informar claramente sucesso ou falha;
- o usuário retornar à tela de origem depois de salvar;
- cadastros rápidos preservarem o lançamento em andamento;
- alertas forem salvos com o veículo correto;
- alertas manuais puderem ser excluídos com confirmação;
- alertas técnicos puderem ser dispensados ou desativados;
- o botão Fechar do Relatório Executivo funcionar na Web e no Android;
- o botão apresentar o texto “Relatório Executivo PDF”;
- as versões Web e Android apresentarem o mesmo comportamento;
- os testes de inclusão, alteração, exclusão, cancelamento e retorno forem aprovados.

## 7. Testes mínimos recomendados

| Teste | Resultado esperado |
|---|---|
| Salvar novo movimento | Gravar, confirmar, atualizar a lista e retornar à tela anterior |
| Alterar movimento existente | Manter o identificador, gravar as alterações e retornar |
| Forçar falha complementar após salvar | Preservar o registro salvo e informar a falha complementar |
| Cadastrar item durante lançamento | Voltar ao lançamento com os dados anteriores preservados |
| Cancelar cadastro rápido | Voltar ao lançamento sem perder os campos preenchidos |
| Salvar alerta | Gravar com o `vehicleId` correto |
| Excluir alerta manual | Solicitar confirmação, excluir e atualizar a lista |
| Dispensar alerta técnico | Registrar a dispensa sem apagar a regra técnica |
| Fechar Relatório Executivo na Web | Fechar a janela ou retornar corretamente |
| Fechar Relatório Executivo no Android | Fechar a tela interna e voltar à origem |
| Conferir botões | Exibir “Relatório Executivo PDF” e o texto definido para XLSX |

## 8. Conclusão

A correção deve priorizar a confiabilidade do salvamento e a previsibilidade da navegação. O usuário precisa ter certeza de que o registro foi gravado e deve retornar ao ponto de origem sem perder informações.

Para alertas técnicos, a solução mais segura é manter a regra automática e permitir que a ocorrência seja dispensada ou desativada, em vez de realizar exclusão definitiva.

A implementação deve ser feita primeiramente na fonte principal do MYCAR+ e, após os testes, sincronizada com as versões Web e Android.
