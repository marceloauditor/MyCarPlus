# MyCar+ V5.58 — Firebase como base oficial por registro

## Objetivo

Eliminar a substituição indevida de dados entre Web e Android, tornando o Firebase a base oficial do MyCar+.

## Estrutura implantada

A sincronização deixou de gravar todo o aplicativo em um único documento. Cada tabela passa a ser armazenada em uma coleção própria e cada item em um documento individual:

- `users/{uid}/movements/{id}`
- `users/{uid}/registers/{id}`
- `users/{uid}/drivers/{id}`
- `users/{uid}/vehicles/{id}`
- `users/{uid}/suppliers/{id}`
- `users/{uid}/paymentMethods/{id}`
- `users/{uid}/alerts/{id}`

## Campos de controle

Todos os registros recebem:

- `id`
- `sequencial`
- `createdAt`
- `updatedAt`
- `updatedBy`
- `version`
- `deletedAt`
- `schemaVersion`

O campo `syncStatus` permanece apenas no armazenamento local do aparelho ou navegador.

## Regras de sincronização

1. O app consulta o Firebase antes de enviar alterações.
2. A comparação é feita por registro e por versão.
3. Alterações de tabelas diferentes não se substituem.
4. Exclusões são registradas por `deletedAt`, evitando reaparecimento ou perda silenciosa.
5. A fila pendente passou para `mycar_cloud_pending_v2`.
6. O estado confirmado passou para `mycar_cloud_baseline_v2`.
7. Web e Android utilizam o mesmo algoritmo.

## Migração automática

No primeiro login da V5.58:

1. o app verifica se a nova estrutura já existe;
2. lê o documento legado `users/{uid}/app/state`;
3. converte todas as tabelas para documentos individuais;
4. preserva os dados existentes;
5. registra a versão do esquema em `users/{uid}/_meta/schema`;
6. mantém o documento legado como contingência, sem sobrescrevê-lo.

## Segurança

As regras do Firestore foram atualizadas para permitir que cada usuário autenticado acesse exclusivamente os documentos localizados abaixo de `users/{uid}`.

## Versões

- Aplicação: 5.58
- Pacote: 5.58.0
- Android `versionCode`: 558
- Cache PWA: `mycar-plus-v5-58`
