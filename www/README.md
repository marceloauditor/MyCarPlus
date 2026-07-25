# MyCar+ Web/PWA V5.23 — Capacitor

## Movimento com vários itens

- Um movimento pertence a um único Grupo.
- O botão verde `+` adiciona itens do mesmo Grupo.
- O botão `×` remove apenas o item selecionado.
- Com vários itens, o Grupo fica bloqueado.
- Os relatórios e gráficos continuam analisando cada item separadamente.
- As consultas e os seletores cadastrais são exibidos em ordem alfabética.
- Movimentos antigos são migrados automaticamente como movimentos de um item.

Aplicativo para gestão de consumo de combustível, manutenção, gastos administrativos e receitas de veículos.

Na V5.21, o aplicativo preserva integralmente a consolidação da V5.20 e conecta
o PWA ao projeto Firebase `mycarplus-3180a`, com login Google, Firestore,
App Check/reCAPTCHA v3 e Firebase AI Logic/Gemini.
Abaixo dela são exibidos somente os dados do veículo selecionado. Relatórios e
gráficos herdam automaticamente essa escolha, e os veículos ativos e inativos
permanecem disponíveis para consulta.

## Modelo de classificação

O MyCar+ utiliza somente dois níveis:

- **Grupo:** Combustível, Manutenção, Administrativo ou Receita.
- **Item de lançamento:** identificação específica do movimento, como Etanol, Gasolina, Troca de óleo, IPVA ou Reembolso.

A natureza financeira é determinada automaticamente: Receita reduz o custo líquido; os demais grupos compõem as despesas.

## Banco e sincronização

- Firebase/Firestore como banco online principal.
- Armazenamento local para funcionamento e continuidade no dispositivo.
- `data/MyCarPlus.xlsx` como dataset oficial de importação, exportação e segurança.
- Migração automática dos registros anteriores para o modelo Grupo + Item.
- Esquema de sincronização: versão 6.
- GPS opcional por ação do usuário, com sugestão do fornecedor cadastrado mais próximo em até 150 metros.
- Coordenadas gravadas nos movimentos e fornecedores e incluídas no `MyCarPlus.xlsx`.
- Não há rastreamento contínuo nem dependência de API paga de mapas.
- Gestão de dados com backup seletivo, restauração por substituição e exclusão protegida.
- Gestão de dados acessível diretamente pelo menu técnico, antes de Sobre o MyCar+.
- Movimentos de veículos inativos disponíveis somente para consulta.
- Um único Item Padrão permitido em cada Grupo.

## Interface e análises

- Formulários compactos e responsivos.
- Menu técnico organizado em Operação, Sistema e Suporte.
- Configurações centralizadas de aparência, raio do GPS e veículo em uso.
- Central de Cadastros em tela inteira.
- Relatórios e gráficos agrupados por Grupo e Item.
- Filtros por veículo, grupo, período e pesquisa.
- Consumo real e consumo de referência por motorização.
- Exportação completa em XLSX e relatório para PDF.
- Central de Alertas com alertas técnicos de óleo e bateria, recorrência e histórico.
- Relatório PDF do histórico técnico e abas de alertas no XLSX.
- MyCar+ Intelligence com veículo e período obrigatórios, indicadores
  consolidados, interpretação por IA e relatório pronto para PDF.
- A análise por IA exige internet e utiliza o Firebase AI Logic protegido pelo
  App Check. Nenhuma chave secreta do Gemini ou do reCAPTCHA fica no PWA.

Desenvolvedor: Marcelo Ribeiro  
Criação: julho de 2026
