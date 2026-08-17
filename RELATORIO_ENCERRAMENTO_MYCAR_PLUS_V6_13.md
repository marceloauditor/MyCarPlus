# RELATÓRIO DE ENCERRAMENTO DO PROJETO — MYCAR+ V6.13

**Data de encerramento:** 17/08/2026  
**Versão final:** APP 6.13 · npm 6.13.0 · Android 613 / 6.13.0  
**Base oficial para futuras manutenções:** V6.13

## 1. Objetivo do projeto

O MyCar+ foi desenvolvido para controle pessoal de veículos, reunindo abastecimentos, consumo de combustível, manutenção, despesas administrativas, receitas, rateios por competência, alertas técnicos, indicadores, gráficos, relatórios e sincronização online.

## 2. Situação final

O projeto encontra-se concluído e estabilizado. A V6.13 consolida os ajustes finais de apresentação e de tendência do Painel Inteligente sem alterar a estrutura de dados ou as regras centrais de gravação e sincronização.

## 3. Ajustes finais da V6.13

- A seção **Tendências** do Painel Inteligente passa a apresentar **Consumo**, **Custo por km** e **Custo mensal**.
- A informação de Distância permanece disponível em outras áreas de utilização e deixa de ocupar uma posição de tendência.
- O cálculo de tendência do Custo mensal foi centralizado em `indicator-calculations.js`, por meio de `monthlyCostTrend()`.
- O cálculo compara duas janelas consecutivas de igual duração e mede a variação percentual do custo mensal líquido.
- Em **Composição dos Grupos**, Receitas são mostradas entre parênteses, em vez de sinal negativo, mantendo a dedução matemática no Custo líquido.

## 4. Arquitetura consolidada

- Web/PWA e Android com Capacitor.
- Firebase modular para autenticação, Firestore, App Check e recursos de IA.
- Armazenamento local protegido, isolamento por Conta Google e sincronização com tratamento de conflitos.
- Motor matemático central em `indicator-calculations.js`.
- Relatório Executivo, Análise Inteligente, gráficos e painel alimentados por regras centralizadas.
- Rateio por competência restrito aos grupos previstos.
- Alertas técnicos no modelo vigente, sem dependência do modelo legado.

## 5. Validações obrigatórias da base final

O pacote V6.13 mantém validações automáticas para:

- indicadores e fórmulas;
- centralização do motor matemático;
- gravação local, fila, isolamento por UID e tombstones;
- coesão entre raiz, `www` e ativos Android;
- versão de APP, npm, Android e cache PWA;
- integridade do BAT;
- manifesto SHA-256 do pacote;
- execução da validação de coesão sem deixar arquivo diagnóstico residual na raiz do projeto.

O atualizador somente deve prosseguir para build, commit e envio ao GitHub quando as validações previstas forem aprovadas.

## 6. Regra de manutenção futura

Qualquer correção, melhoria ou nova funcionalidade posterior deve partir da **V6.13**, preservando o motor central de cálculos e evitando fórmulas duplicadas em telas, relatórios ou gráficos. Mudanças de regra matemática devem ser implementadas primeiro no motor central e acompanhadas de teste automático.

## 7. Encerramento

Com a emissão da V6.13, o desenvolvimento planejado do MyCar+ é considerado encerrado. O sistema passa ao regime de uso e manutenção eventual, com a V6.13 registrada como referência técnica oficial do projeto.
