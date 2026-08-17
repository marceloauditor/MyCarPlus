# RELATÓRIO DE ENCERRAMENTO DO PROJETO — MYCAR+ V6.14

**Data de encerramento:** 17/08/2026  
**Versão final:** APP 6.14 · npm 6.14.0 · Android 614 / 6.14.0  
**Base oficial para futuras manutenções:** V6.14

## 1. Objetivo do projeto

O MyCar+ foi desenvolvido para controle pessoal de veículos, reunindo abastecimentos, consumo e eficiência de combustível, manutenção, despesas administrativas, receitas, rateios por competência, alertas técnicos, indicadores, gráficos, relatórios e sincronização online.

## 2. Situação final

O projeto encontra-se concluído e estabilizado. A V6.14 consolida os últimos ajustes de clareza e apresentação do Painel Inteligente e da Composição dos Grupos, sem alterar a estrutura de dados nem as regras centrais de gravação e sincronização.

## 3. Ajustes finais da V6.14

- Na seção **Tendências**, o indicador anteriormente denominado **Consumo** passa a ser apresentado como **Eficiência**.
- A fórmula não foi alterada: continua medindo a evolução do rendimento em km/L pelo motor central de indicadores.
- A nomenclatura Eficiência elimina a ambiguidade de interpretar “consumo caiu” como redução de combustível gasto; no painel, queda de eficiência significa percorrer menos quilômetros por litro.
- Tendências permanecem compostas por **Eficiência**, **Custo por km** e **Custo mensal**.
- O cálculo de tendência do Custo mensal permanece centralizado em `indicator-calculations.js`, por meio de `monthlyCostTrend()`.
- Em **Composição dos Grupos**, Receitas continuam mostradas entre parênteses, em vez de sinal negativo, preservando a dedução matemática no Custo líquido.
- No celular, os valores de Abastecimento, Administrativo, Manutenção, Receitas e Custo líquido passam a usar alinhamento uniforme à direita.

## 4. Arquitetura consolidada

- Web/PWA e Android com Capacitor.
- Firebase modular para autenticação, Firestore, App Check e recursos de IA.
- Armazenamento local protegido, isolamento por Conta Google e sincronização com tratamento de conflitos.
- Motor matemático central em `indicator-calculations.js`.
- Relatório Executivo, Análise Inteligente, gráficos e painel alimentados por regras centralizadas.
- Rateio por competência restrito aos grupos previstos.
- Alertas técnicos no modelo vigente, sem dependência do modelo legado.

## 5. Validações obrigatórias da base final

O pacote V6.14 mantém validações automáticas para:

- indicadores e fórmulas;
- centralização do motor matemático;
- nomenclatura **Eficiência** na tendência de km/L;
- tendência centralizada de Custo mensal;
- apresentação de Receitas entre parênteses;
- alinhamento móvel da Composição dos Grupos;
- gravação local, fila, isolamento por UID e tombstones;
- coesão entre raiz, `www` e ativos Android;
- versão de APP, npm, Android e cache PWA;
- integridade do BAT;
- manifesto SHA-256 do pacote.

O atualizador somente deve prosseguir para build, commit e envio ao GitHub quando as validações previstas forem aprovadas.

## 6. Regra de manutenção futura

Qualquer correção, melhoria ou nova funcionalidade posterior deve partir da **V6.14**, preservando o motor central de cálculos e evitando fórmulas duplicadas em telas, relatórios ou gráficos. Mudanças de regra matemática devem ser implementadas primeiro no motor central e acompanhadas de teste automático.

## 7. Encerramento

Com a emissão da V6.14, o desenvolvimento planejado do MyCar+ é considerado encerrado. O sistema passa ao regime de uso e manutenção eventual, com a V6.14 registrada como referência técnica oficial do projeto.
