# Roteiro — Firebase como base oficial do MyCar+

## 1. Objetivo

Transformar o Firestore na fonte oficial dos dados do usuário. Uma instalação ou atualização do aplicativo nunca poderá substituir dados remotos por conteúdo do XLSX incluído no pacote. O dataset será apenas modelo inicial, compatibilidade de importação/exportação e fonte de cadastros técnicos versionados.

## 2. Regra de prioridade

1. Após o login, consultar o Firestore antes de qualquer envio.
2. Se já houver base remota, baixar e aplicar essa base no aplicativo.
3. Se não houver base remota, inicializar uma única vez com o dataset e registrar a inicialização.
4. Executar migrações incrementais da estrutura, sem recriar ou substituir a base.
5. Enviar inclusões, alterações e exclusões por registro.
6. Nunca usar o dataset empacotado para restaurar automaticamente uma base existente.

## 3. Estrutura recomendada no Firestore

```text
users/{uid}/vehicles/{id}
users/{uid}/movements/{id}
users/{uid}/registers/{id}
users/{uid}/drivers/{id}
users/{uid}/suppliers/{id}
users/{uid}/paymentMethods/{id}
users/{uid}/alerts/{id}
users/{uid}/metadata/sync
users/{uid}/tombstones/{id}
```

O documento `users/{uid}/app/state` atual deverá permanecer como cópia de transição até a migração ser validada.

## 4. Padrão de campos Firebase e dataset

No Firebase, manter os nomes usados pelo aplicativo em `camelCase`. No XLSX, manter cabeçalhos técnicos em `snake_case`. A conversão será feita exclusivamente no módulo `mycarplus-db.js`, evitando que nomes de planilha sejam usados diretamente na lógica do aplicativo.

| Entidade | Firebase/app | Dataset XLSX |
|---|---|---|
| Movimento | `vehicleId` ou compatível `veiculo_id` | `veiculo_id` |
| Movimento | `driverId` ou compatível `motorista_id` | `motorista_id` |
| Movimento | `supplierId` ou compatível `fornecedor_id` | `fornecedor_id` |
| Movimento | `dateTime` ou compatível `data_hora` | `data_hora` |
| Movimento | `odometerKm` ou compatível `hodometro_km` | `hodometro_km` |
| Movimento | `itemId` ou compatível `item_id` | `item_id` |
| Movimento | `quantityLiters` ou compatível `quantidade_litros` | `quantidade_litros` |
| Movimento | `unitPrice` ou compatível `preco_unitario` | `preco_unitario` |
| Veículo | `yearManufacture`/`anoFabricacao` | `ano_fabricacao` |
| Veículo | `initialOdometerKm`/`kmInicial` | `hodometro_inicial_km` |
| Alerta | `modelVersion` | `modelo_versao` |
| Alerta | `vehicleId` | `veiculo_id` |
| Alerta | `itemId` | `item_id` |
| Alerta | `description` | `descricao` |
| Alerta | `criterion` | `criterio` |
| Alerta | `baseDate` | `data_base` |
| Alerta | `baseKm` | `km_base` |
| Alerta | `recurrenceMonths` | `vida_util_meses` |
| Alerta | `recurrenceKm` | `vida_util_km` |
| Alerta | `dueDate` | `data_prevista` |
| Alerta | `dueKm` | `km_previsto` |
| Alerta | `leadDays` | `antecedencia_dias` |
| Alerta | `leadKm` | `antecedencia_km` |
| Alerta | `statusMode` | `status` |
| Alerta | `active` | `ativo` |
| Alerta | `observations` | `observacao` |

Antes da migração definitiva será criado um normalizador que aceite os nomes atuais e grave apenas o padrão novo. Isso evita perda de dados antigos.

## 5. Metadados obrigatórios por registro

```javascript
{
  id: "identificador-estavel",
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
  updatedByDevice: "device-id",
  schemaVersion: 1,
  deleted: false
}
```

Exclusões deverão ser lógicas (`deleted: true`) e registradas em `tombstones`, impedindo que um aparelho antigo recrie o registro.

## 6. Migração segura do documento atual

1. Exportar um XLSX e um JSON de segurança.
2. Ler `users/{uid}/app/state` sem alterá-lo.
3. Normalizar IDs e campos.
4. Gravar as novas coleções em lotes pequenos com operação de inclusão/mesclagem.
5. Comparar quantidades e IDs entre origem e destino.
6. Registrar em `metadata/sync`: `schemaVersion`, `appVersion`, `migrationStatus`, `migratedAt` e totais por coleção.
7. Somente ativar a nova sincronização quando a conferência resultar sem divergências.
8. Preservar o documento antigo durante o período de validação e nunca apagá-lo automaticamente.

## 7. Fluxo na instalação ou atualização

```text
ABRIR APP → LOGIN → CONSULTAR metadata/sync
  ├─ Base remota existente → BAIXAR FIREBASE → MIGRAR ESTRUTURA → ABRIR APP
  └─ Base remota ausente   → CARREGAR DATASET UMA VEZ → CRIAR FIREBASE → ABRIR APP
```

Nenhuma rotina de inicialização poderá chamar envio completo antes dessa decisão.

## 8. Alterações no código

- Substituir `ref.set(estadoCompleto)` por gravações individualizadas com `set(..., {merge:true})` ou transações.
- Substituir `applyState()` destrutivo por mesclagem controlada por ID e `updatedAt`.
- Criar fila offline de operações pendentes.
- Fazer o Firebase atualizar a base local por listeners ou sincronização incremental.
- Criar migrações numeradas e idempotentes: executar novamente não pode duplicar nem apagar dados.
- Separar migração de estrutura de migração de conteúdo técnico.
- Proibir que o dataset sobrescreva registros criados pelo usuário.

## 9. Configuração no Firebase Console

1. Manter o projeto e a autenticação Google existentes.
2. Atualizar as regras do Firestore para restringir cada caminho ao `uid` autenticado.
3. Criar índices somente quando o console indicar necessidade para consultas por `updatedAt`, `vehicleId` e `deleted`.
4. Confirmar os domínios autorizados da versão web.
5. Publicar as regras antes de liberar a versão migradora.
6. Não é necessário mudar do plano gratuito Spark para este desenho.

## 10. Testes obrigatórios

- Atualizar o APK sem desinstalar e conferir que os dados remotos prevalecem.
- Instalar em aparelho limpo e conferir que o Firebase preenche o aplicativo.
- Alterar um registro na Web e recebê-lo no Android.
- Alterar um registro no Android e recebê-lo na Web.
- Trabalhar sem internet e sincronizar depois.
- Excluir um registro e confirmar que outro aparelho não o recria.
- Executar a migração duas vezes e confirmar ausência de duplicidade.
- Comparar os totais de todas as coleções antes e depois.
- Validar XLSX: somente `Movimentacoes` filtrada; demais guias completas, inclusive `Alertas`.

## 11. Implantação em etapas

1. **Versão preparatória:** normalizadores, backup, metadados e leitura Firebase primeiro.
2. **Versão migradora:** criação das coleções e conferência automática.
3. **Versão oficial:** sincronização individual por registro.
4. **Período de estabilidade:** manter o documento antigo somente para recuperação.
5. **Encerramento:** bloquear gravação no documento antigo; eventual exclusão apenas após backup e autorização expressa.

## 12. Critério de aprovação

A implantação estará concluída quando uma instalação limpa receber integralmente os dados do Firestore, nenhuma atualização enviar o dataset sobre uma base existente, as operações offline forem reconciliadas sem perda e os totais por coleção coincidirem com o backup de origem.
