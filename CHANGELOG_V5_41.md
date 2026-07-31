# MyCar+ V5.41

## Correção funcional dos relatórios

- Corrigidos os botões Fechar, Imprimir e Salvar PDF do Relatório Executivo.
- Corrigidos os botões Fechar, Imprimir e Salvar PDF do Relatório de Inteligência.
- Removida a dependência de eventos `onclick` embutidos nos relatórios.
- Adicionados eventos JavaScript registrados após a criação das páginas.
- Adicionada ponte nativa Android `MyCarNative` com uso do `PrintManager`.
- No Android, Imprimir e Salvar PDF abrem o diálogo nativo, que permite selecionar uma impressora ou “Salvar como PDF”.
- Mantidos os dois relatórios como módulos independentes.
- Atualizadas as versões Web/PWA e Android para 5.41 / 5.41.0 / versionCode 541.
- Manual de atualização revisado para exigir a manutenção do BAT versionado em todas as futuras versões.
- Arquivo `ATUALIZAR_MYCAR_V5_41_WEB_ANDROID.bat` incluído na raiz da fonte.

## Ajuste planejado — novo cadastro de alertas técnicos

> Especificação aprovada para implantação em versão posterior. Esta seção documenta a solução definida e não significa que a funcionalidade já esteja implantada na V5.41.

### Regra geral

- Todos os alertas passarão a ser técnicos e configurados pelo usuário.
- O usuário poderá incluir, alterar e excluir qualquer alerta.
- Não existirão alertas obrigatórios nem recriação automática de alertas excluídos.
- O alerta será vinculado obrigatoriamente ao veículo e ao item de manutenção por identificadores (`vehicleId` e `itemId`).
- A durabilidade em quilômetros, tempo ou ambos será sempre informada pelo usuário no cadastro do alerta.
- O sistema não aplicará duração fixa ou padrão para óleo, bateria, pastilhas, correias, filtros ou qualquer outro item.
- O cadastro geral do item permanecerá simples; a política de manutenção ficará concentrada no alerta.

### Programação automática

1. Ao salvar ou recalcular um alerta, o sistema deverá procurar o último lançamento de manutenção do mesmo `vehicleId + itemId`.
2. Se encontrar, utilizará a data e o hodômetro desse lançamento como base.
3. Se não encontrar, exibirá aviso informando que não existe manutenção anterior cadastrada para o item.
4. Após a confirmação, utilizará a data atual e o hodômetro atual do veículo como início do controle.
5. A próxima manutenção será calculada pelas fórmulas:

```text
Próximo KM = KM-base + durabilidade em KM
Próxima data = data-base + durabilidade em tempo
```

6. Quando os dois critérios existirem, o alerta será controlado pelo limite que ocorrer primeiro.
7. Um novo lançamento do mesmo item e veículo passará a ser automaticamente a base do ciclo seguinte.
8. Se o usuário alterar a durabilidade, a programação futura será recalculada.
9. O hodômetro inicial do veículo não deverá ser utilizado automaticamente como base quando não houver manutenção anterior.

### Informações apresentadas na tela

- Veículo.
- Item de manutenção.
- Durabilidade em quilômetros.
- Durabilidade em meses ou anos, convertida de forma consistente para o cálculo.
- Antecedência do aviso em quilômetros e/ou dias.
- Última manutenção identificada, com data e hodômetro.
- Origem da base utilizada.
- Próxima data e próximo hodômetro previstos.
- Situação do alerta: em dia, próximo do vencimento, vencido, inativo ou sem base confirmada.

Quando não existir manutenção anterior, a tela deverá apresentar:

> Não foi encontrada manutenção anterior deste item. A programação será iniciada utilizando a data atual e o hodômetro atual do veículo.

### Alteração da data e do hodômetro

- O usuário poderá informar a data e o hodômetro reais ao concluir uma manutenção.
- O histórico técnico deverá permitir a correção posterior desses dados.
- A alteração da base deverá recalcular imediatamente a próxima programação.
- O hodômetro informado deverá ser validado em relação aos lançamentos anteriores e posteriores do mesmo veículo.
- Se a base informada gerar uma previsão já vencida, o sistema deverá alertar, mostrar o atraso em dias e/ou quilômetros, solicitar confirmação e permitir o salvamento com situação `VENCIDO`.

### Exclusão do alerta

Antes de excluir, o sistema deverá exibir:

> **Excluir alerta técnico?**  
> Este alerta é utilizado para programar e acompanhar futuras manutenções. A exclusão interromperá apenas o monitoramento desse item. O histórico técnico e os lançamentos realizados serão preservados. Deseja continuar?

Botões:

- `Cancelar`
- `Excluir alerta`

A exclusão deverá remover somente a configuração do alerta e sua programação futura. Não poderá excluir movimentos, valores financeiros ou históricos técnicos reais.

### Histórico e dados de teste

- O histórico técnico atualmente existente na V5.41 foi criado apenas para testes e poderá ser limpo integralmente durante a migração.
- Depois da implantação, os novos históricos reais deverão ser preservados mesmo quando o alerta correspondente for excluído.
- A exclusão de um alerta não poderá produzir exclusão em cascata no histórico nem nos movimentos.

### Estrutura proposta do banco

Atualizar o documento `users/{uid}/app/state` para `schemaVersion: 8`, preservando os demais dados.

Exemplo de alerta:

```json
{
  "id": "alerta_001",
  "vehicleId": "vei_001",
  "itemId": "item_oleo",
  "recurrenceKm": 10000,
  "recurrenceMonths": 6,
  "warningKm": 500,
  "warningDays": 30,
  "baseKm": 50000,
  "baseDate": "2026-07-30",
  "baseSource": "CURRENT_START",
  "baseMovementId": null,
  "dueKm": 60000,
  "dueDate": "2027-01-30",
  "active": true
}
```

Origens admitidas para a base:

- `MOVEMENT`: última manutenção localizada nos movimentos.
- `USER_INFORMED`: manutenção anterior informada pelo usuário.
- `CURRENT_START`: controle iniciado com a data e o hodômetro atuais.

### Migração

- Converter os alertas existentes para o novo formato, quando aplicável.
- Remover a lógica exclusiva e obrigatória de `OIL` e `BATTERY`.
- Permitir a seleção de qualquer item do grupo de manutenção.
- Eliminar durabilidades automáticas predefinidas.
- Preservar movimentos e valores financeiros.
- Limpar somente o histórico técnico de teste existente.
- Manter compatibilidade temporária de leitura com `technicalParameters` durante a transição.
- Impedir a recriação automática de alertas excluídos.
- Aplicar a mesma regra no armazenamento local e no Firebase.
