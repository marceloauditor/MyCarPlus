const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.resolve(__dirname, '..');
const packagePreview = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const semver = String(packagePreview.version || '').trim();
const match = semver.match(/^(\d+)\.(\d+)\.(\d+)$/);
if (!match) {
  console.error('package.json possui versão inválida. Use o formato X.Y.Z.');
  process.exit(1);
}
// O package.json normaliza 6.00.0 para 6.0.0. A versão de exibição oficial
// deve ser obtida de APP_VERSION para preservar dois dígitos após o ponto.
const appPreview = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const appMatch = appPreview.match(/APP_VERSION\s*=\s*["'](\d+)\.(\d+)["']/);
if (!appMatch) {
  console.error('APP_VERSION não foi localizada em app.js.');
  process.exit(1);
}
const appVersion = `${appMatch[1]}.${appMatch[2]}`;
const major = appMatch[1];
const minorDisplay = appMatch[2].padStart(2, '0');
const androidVersionName = `${major}.${minorDisplay}.0`;
const expected = {
  semver,
  app: appVersion,
  androidVersionName,
  versionCode: `${major}${minorDisplay}`,
  cache: `mycar-plus-v${major}-${minorDisplay}`,
  batch: `ATUALIZAR_MYCAR_V${major}_${minorDisplay}_KEY.bat`,
  zip: `MYCAR_PLUS_V${major}_${minorDisplay}_KEY.zip`,
};
const failures = [];

function read(rel) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) {
    failures.push(`Arquivo ausente: ${rel}`);
    return '';
  }
  return fs.readFileSync(file, 'utf8');
}
function assert(condition, message) {
  if (!condition) failures.push(message);
}
function hash(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

const pkg = JSON.parse(read('package.json') || '{}');
const app = read('app.js');
const reportManager = read('report-manager.js');
const db = read('mycarplus-db.js');
const html = read('index.html');
const styles = read('styles.css');
const sw = read('sw.js');
const gradle = read('android/app/build.gradle');
const batch = read(expected.batch);

assert(pkg.version === expected.semver, `package.json deve estar em ${expected.semver}.`);
assert(new RegExp(`APP_VERSION\\s*=\\s*["']${expected.app.replace('.', '\\.')}`).test(app), `APP_VERSION deve ser ${expected.app}.`);
assert(html.includes(`v${expected.app}`), `Versão visível v${expected.app} ausente.`);
assert(html.includes(`<strong>Versão:</strong> ${expected.app}`), `Versão ${expected.app} ausente na tela Sobre.`);
assert(new RegExp(`versionCode\\s+${expected.versionCode}\\b`).test(gradle), `versionCode deve ser ${expected.versionCode}.`);
assert(gradle.includes(`versionName "${expected.androidVersionName}"`), `versionName deve ser ${expected.androidVersionName}.`);
assert(sw.includes(expected.cache), `Cache PWA deve ser ${expected.cache}.`);

// Consolidação V6.09.
assert(!html.includes('class="home-vehicle-head compact"') && !html.includes('<small>Veículo</small>'), 'Identificação duplicada de veículo ainda aparece na página inicial.');
assert(/class="mycar-history-card"/.test(app) && /<span>Histórico<\/span>/.test(app), 'Cartão final de histórico em duas linhas ausente.');
assert(/function\s+formatHistoryDuration\s*\(/.test(app), 'Cálculo dinâmico do histórico do veículo ausente.');
assert(/<b>Placa:<\/b>/.test(app) && /<b>Histórico no MyCar\+:<\/b>/.test(app), 'Placa e histórico não foram incluídos nos dois relatórios.');
assert(/num\(value,\s*3\)/.test(app) && /executive\.consumption\.general\.total_history\.consumption_km_l,3/.test(app), 'Consumo dos relatórios deve usar três casas decimais.');
assert(html.includes('class="about-identity-row"') && html.includes('class="about-app-logo"') && html.includes(`about-logo.png?v=${expected.versionCode}`) && html.includes(`icon-192.png?v=${expected.versionCode}`), 'Logotipo resiliente ao lado do desenvolvedor ausente na tela Informações.');
assert(styles.includes('.mycar-history-card') && /flex-direction:\s*column/.test(styles) && /white-space:\s*normal/.test(styles), 'Cartão de histórico não está configurado em duas linhas com quebra segura.');
const reportLogoMatch = app.match(/REPORT_LOGO_DATA_URI\s*=\s*"data:image\/png;base64,([^"]+)"/);
assert(Boolean(reportLogoMatch), 'Logotipo embutido dos relatórios ausente.');
if (reportLogoMatch) {
  const decodedLogo = Buffer.from(reportLogoMatch[1], 'base64');
  assert(decodedLogo.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])), 'Logotipo embutido dos relatórios não é PNG válido.');
  const officialLogo = fs.readFileSync(path.join(root, 'report-logo.png'));
  assert(decodedLogo.equals(officialLogo), 'Logotipo embutido não corresponde ao report-logo.png oficial.');
  assert(decodedLogo.length < 60000, 'Logotipo embutido não foi otimizado para compartilhamento seguro.');
}
assert(fs.existsSync(path.join(root, 'about-logo.png')), 'about-logo.png ausente.');
assert(sw.includes('about-logo.png'), 'about-logo.png ausente do cache PWA.');

// Análise Inteligente Veicular V6.09.
assert(/function\s+buildExecutiveIntelligenceData\s*\(/.test(app), 'Motor estruturado dos indicadores do Relatório Executivo não foi criado para a IA.');
assert(/executive_report:\s*executiveReport/.test(app), 'Indicadores estruturados do Relatório Executivo não são enviados à IA.');
assert(/schema_version:\s*2/.test(app), 'Schema 2 da Análise Inteligente ausente.');
assert(/exact_duplicate_candidates/.test(app + read('ai-logic.js')), 'Evidência objetiva de duplicidade ausente.');
assert(!/avgValue\s*\*\s*2\.5/.test(app), 'Regra antiga de valor atípico pela média global ainda está ativa.');
assert(/dates_or_high_values_alone_do_not_prove_duplicate/.test(app), 'Regra de proibição de inferência de duplicidade não foi enviada.');
assert(/Não mencione possível duplicidade/.test(read('ai-logic.js')), 'Prompt ainda permite inferência de duplicidade sem evidência.');
assert(/function\s+evidenceExists\s*\(/.test(read('ai-logic.js')), 'Validação local dos caminhos de evidência ausente.');
assert(/AUTOMOTIVE_TIPS/.test(app) && /9\. Dica MyCar\+/.test(app), 'Biblioteca ou seção final Dica MyCar+ ausente.');
assert(/Análise Inteligente de Gestão Veicular/.test(app + html), 'Nova identidade da Análise Inteligente ausente.');
assert(!/<small>Saúde veicular<\/small>/.test(app), 'Pontuação genérica de saúde veicular ainda aparece na análise.');
assert(/<small>Status de manutenção<\/small>/.test(app), 'Status de manutenção não substituiu a pontuação genérica.');
assert(/Confiança dos dados/.test(app), 'Confiança local dos dados não aparece na análise.');
assert(!html.includes('id="aiType"') && !html.includes('Tipo de análise') && !html.includes('Análise desejada'), 'Seletor de tipo da Análise Inteligente ainda está presente.');
assert(!app.includes('$("#aiType")') && !app.includes('analysis_type: analysisType'), 'Código ainda lê um tipo de análise selecionável.');
assert(!read('ai-logic.js').includes('FOCO SOLICITADO') && !read('ai-logic.js').includes('focusNames'), 'Prompt ainda contém foco variável.');
assert(read('ai-logic.js').includes('A análise é sempre completa'), 'Prompt não fixa a análise completa.');
assert(/analysis_scope:\s*"completa"/.test(app), 'Escopo completo não foi fixado nos indicadores executivos.');
assert(app.includes('style="background-color:#fff!important;background-image:none!important;color:#000!important;opacity:1!important;color-scheme:light"'), 'Proteção inline branca e preta da Dica MyCar+ ausente.');
assert(app.includes('background-color:#fff!important') && app.includes('color:#000!important'), 'Relatório compartilhado sem branco puro e preto puro.');
assert(styles.includes('html[data-theme="dark"] .ai-tip-section .ai-tip-card'), 'Dica MyCar+ sem seletor específico para tema escuro.');
assert(styles.includes('background-color:#fff!important') && styles.includes('background-image:none!important'), 'Dica MyCar+ sem superfície branca real.');
assert(styles.includes('-webkit-text-fill-color:#000!important'), 'Dica MyCar+ sem proteção de texto preto no Android WebView.');
assert(styles.includes('backdrop-filter:none!important'), 'Dica MyCar+ ainda permite efeito de transparência.');
assert(sw.includes('url.pathname.endsWith("/styles.css")'), 'styles.css não usa atualização network-first.');
assert(html.includes('styles.css?v=609') && html.includes('app.js?v=609'), 'Cache-busting visual V6.09 ausente.');
assert(!/ai-tip-card[^}]*#f8fbfd/i.test(app + styles), 'Cor quase branca antiga ainda aplicada à Dica MyCar+.');


// Exclusividade do novo modelo de alertas.
assert(!/TECHNICAL_ITEMS|technicalParameters|alertHistory|Historico_Alertas|Parametros_Tecnicos|technicalKey|chave_tecnica/.test(app + db), 'O modelo antigo de alertas ainda está presente no código.');
assert(/function\s+migrateToNewAlertModel\s*\(/.test(app), 'Migração para o novo modelo ausente.');
assert(/modelVersion:\s*2/.test(app), 'Alertas novos não estão marcados com modelVersion 2.');
assert(/mycar_alert_history_v1/.test(app) && /removeItem/.test(app), 'Limpeza da base antiga de histórico não foi programada.');
assert(/mycar_technical_parameters_v1/.test(app) && /removeItem/.test(app), 'Limpeza da base antiga de parâmetros não foi programada.');
assert(/ALERTAS TÉCNICOS — NOVO MODELO/.test(db), 'Exportação XLSX não usa o novo modelo de alertas.');
assert(!/addSheet\("Historico_Alertas"|addSheet\("Parametros_Tecnicos"/.test(db), 'Exportação ainda cria planilhas antigas.');

// Regra do Relatório Executivo.
assert(/const registeredItems = new Map\(registers/.test(app), 'Relatório não parte do Cadastro de Itens.');
assert(/item\.modelVersion === 2 && registeredItems\.has\(item\.itemId\)/.test(app), 'Relatório não exige alerta novo vinculado a item cadastrado.');
assert(!/essentialNames/.test(app), 'Lista fixa antiga de manutenções ainda existe.');
assert(/Nenhum item do cadastro possui alerta do novo modelo/.test(app), 'Mensagem de ausência de alertas novos não foi definida.');
assert(/Manutenções com alertas cadastrados/.test(app), 'Título corrigido da seção de manutenção ausente.');

// Painel e formulário atuais.
assert(/data-alert-view/.test(app), 'Ação Consultar ausente.');
assert(/data-alert-edit/.test(app), 'Ação Alterar ausente.');
assert(/data-alert-delete/.test(app), 'Ação Excluir ausente.');
assert(/function\s+setAlertFormMode\s*\(/.test(app), 'Modo consulta somente leitura ausente.');
assert(html.includes('technical-alert-dialog'), 'Tela do novo alerta técnico ausente.');
assert(styles.includes('alert-panel-card'), 'Estilos do painel de alertas ausentes.');
assert(!html.includes('technicalHistoryList'), 'Histórico antigo ainda está visível na tela.');
assert(!html.includes('id="netTotal"'), 'Resumo azul repetido ainda está na tela inicial.');
assert(!html.includes('id="costKm"') && !html.includes('id="dailyKm"') && !html.includes('id="avgConsumption"') && !html.includes('id="dailyCost"'), 'Cards repetidos ainda estão na tela inicial.');
assert(!html.includes('id="lastConsumption"') && !html.includes('id="lastDistance"'), 'Indicadores externos antigos ainda estão na tela inicial.');
assert(/<strong>Painel inteligente<\/strong>/.test(app) && !/Análise automática|Painel inteligente do veículo/.test(app), 'Título simplificado do Painel inteligente não foi aplicado.');
assert(/Custo por km[\s\S]*Custo por dia[\s\S]*Custo mensal[\s\S]*Custo total líquido[\s\S]*Consumo médio[\s\S]*Último consumo/.test(app), 'Os seis cartões não estão na ordem aprovada.');
assert(/class="insight-trends-primary"/.test(app) && app.indexOf('insight-trends-primary') < app.indexOf('insight-grid-secondary'), 'Tendências devem aparecer antes das seções complementares.');
assert(!/<h3>Destaques<\/h3>/.test(app), 'O cartão Destaques ainda está presente.');
assert(/<h3>Composição dos Grupos<\/h3>/.test(app) && /<h3>Utilização<\/h3>/.test(app) && /MyCar Score/.test(app), 'Composição dos Grupos, Utilização e MyCar Score devem permanecer abaixo de Tendências.');
assert(/insight-grid-score-first/.test(app) && /insight-score-card/.test(app) && /insight-grid-composition-wide/.test(app + styles), 'Estrutura da inversão Score/Composição ausente.');
assert(app.indexOf('MyCar Score') < app.indexOf('<h3>Composição dos Grupos</h3>') && app.indexOf('<h3>Utilização</h3>') < app.indexOf('<h3>Composição dos Grupos</h3>'), 'MyCar Score e Utilização devem aparecer antes da Composição dos Grupos.');
assert(/insight-metrics-six/.test(app + styles) && /max-height:720px/.test(styles), 'Modo compacto dos seis indicadores ausente.');

// Gráficos, período efetivo, manual, tela Sobre e painel — versão atual.
assert(/movementCount:\s*0/.test(app) && /movementCount\s*>\s*0\s*\?\s*item\.net\s*\/\s*bucket\.days\s*:\s*null/.test(app), 'Custo médio diário ainda converte período sem movimento em zero.');
assert(/legendCols\s*=\s*w\s*<\s*460\s*\?\s*2/.test(app) && /name:"Custo líquido"/.test(app), 'Legenda responsiva do custo líquido ausente.');
assert((html.match(/class="vehicle-static-summary"/g) || []).length >= 2 && styles.includes('.vehicle-static-summary'), 'Identificação compacta do veículo não foi aplicada a Relatórios e Gráficos.');
assert(/slice\(0,5\)/.test(app) && html.includes('5 itens com maior valor acumulado'), 'Ranking não foi limitado aos 5 maiores itens.');
assert(/consolidatedLabels\s*=\s*\[\.\.\.labels,\s*"Total dos custos"\]/.test(app) && /perKmLabels:\s*consolidatedLabels/.test(app), 'Barra consolidada Total dos custos ausente.');
assert(/consolidatedColors\s*=\s*\["#246b9e",\s*"#246b9e",\s*"#246b9e",\s*"#f28b0c"\]/.test(app) && /perKmColors:\s*consolidatedColors/.test(app), 'Barra consolidada não está configurada em laranja.');
assert(/function\s+resolveEffectivePeriod\s*\(/.test(app) && /function\s+applyEffectivePeriodToFields\s*\(/.test(app), 'Tratamento centralizado do período efetivo ausente.');
assert(/effectivePeriodMessage\(effective\)/.test(app) && /Período ajustado:/.test(app), 'Mensagem de ajuste do período aos registros ausente.');
assert(/function\s+calculateNiceAxis\s*\(/.test(app) && /measureText\(label\)/.test(app), 'Escala adaptativa ou margem dinâmica do eixo Y ausente.');
assert(/drawOdometerChart\(\$\("#chartOdometer"\),\s*odometer\)/.test(app) && /calculateNiceAxis\(data\.yMin,\s*data\.yMax,\s*5\)/.test(app), 'Gráfico do hodômetro não ativou a escala adaptativa específica.');
assert(html.includes('Altere o período no final da página.'), 'Instrução compacta da tela de gráficos ausente.');
assert(html.includes('class="about-title-icon"') && html.includes('<h2>Informações</h2>'), 'Novo cabeçalho da tela Sobre ausente.');
assert(html.includes('class="about-info-stack"') && html.includes('class="about-contact-link"'), 'Desenvolvedor e contato não foram reorganizados na tela Sobre.');
assert(/white-space:\s*nowrap!important/.test(styles) && /font-size:clamp\(10\.5px,3\.2vw,13px\)/.test(styles), 'E-mail da tela Sobre ainda pode quebrar ou não possui fonte responsiva.');
assert(/function\s+odometerGlobalLabelIndexes\s*\(/.test(app) && /function\s+drawOdometerChart\s*\(/.test(app), 'Seleção global de início, meio e fim do hodômetro ausente.');
assert(!/odometerReferencePointsByYear/.test(app) && !/yearGroups/.test(app), 'O hodômetro ainda utiliza três referências por ano.');
assert(/labelIndexes,/.test(app) && /odometerMonthLabel/.test(app), 'Meses e anos globais não foram implementados no hodômetro.');
assert(html.includes('<strong>Desenvolvedor:</strong>') && html.includes('class="about-developer-name"'), 'Nome cursivo do desenvolvedor ou dois-pontos ausente.');
assert(/Segoe Script/.test(styles) && /about-developer-name[^}]*font-style:\s*italic/.test(styles), 'Fonte cursiva e itálica do desenvolvedor ausente.');
assert(html.includes('<strong>Contato:</strong>') && html.includes('href="mailto:marcelo.auditortl@gmail.com"'), 'Contato com dois-pontos ou link mailto ausente.');
assert(/perDayLabels:\s*consolidatedLabels/.test(app) && /perDayColors:\s*consolidatedColors/.test(app), 'Quarta barra laranja ausente no custo médio diário por grupo.');
assert(/totalLabels:\s*consolidatedLabels/.test(app) && /totalValues:\s*\[\.\.\.totals,\s*totalCosts\]/.test(app), 'Quarta barra total ausente no custo total por grupo.');
assert(html.includes('Custo médio diário por grupo e total') && html.includes('Custos por grupo e total consolidado'), 'Títulos dos gráficos consolidados não foram atualizados.');
assert(/start\.setMonth\(start\.getMonth\(\) - 12\)/.test(app), 'Gráficos não usam o último ano como período padrão.');
assert(html.includes('Padrão: período do último ano, ajustado aos registros disponíveis.'), 'Texto do período padrão anual ausente.');
assert(!/<section class=\"manual-cover\">/.test(app) && /<main class=\"manual\">/.test(app), 'A capa separada do Manual de Ajuda ainda está presente.');
assert(/Desenvolvedor/.test(app) && /Criação do sistema/.test(app) && /Geração do documento/.test(app), 'Metadados completos do manual ausentes.');
assert(/manual-brand[\s\S]*REPORT_LOGO_DATA_URI/.test(app), 'Logotipo do app ausente no cabeçalho do manual.');
assert(/function\s+fuelSeriesIdentity\s*\(/.test(app) && /function\s+drawFuelConsumptionChart\s*\(/.test(app), 'Gráfico multilinha de consumo ausente.');
assert(/key:\s*"geral"[\s\S]*color:\s*fuelSeriesColor\("geral"\)[\s\S]*showPointValues:\s*true/.test(app), 'Linha Geral ou valores fixos da linha geral ausentes.');
assert(/if \(key === "geral"\) return "#d94b4b"/.test(app), 'Linha Geral deve ser vermelha.');
assert(/if \(key === "gasolina"\) return "#f28b0c"/.test(app), 'Linha Gasolina deve ser laranja.');
assert(/if \(key === "etanol"\) return "#246b9e"/.test(app), 'Linha Etanol deve ser azul.');
assert(/if \(key === "diesel"\) return "#1f8a70"/.test(app), 'Linha Diesel deve ser verde.');
assert(/showPointValues:\s*false/.test(app), 'Linhas específicas não devem mostrar valores fixos nos pontos.');
assert(!/Álcool|álcool|Alcool|alcool/.test(app + html), 'A interface não deve utilizar a palavra substituída por Etanol.');

// Lançamentos compactos e seletores em folha inferior — versão atual.
assert(html.includes('entry-dialog-one-screen') && styles.includes('entry-top-grid'), 'Tela compacta de lançamento em uma única visualização ausente.');
assert(/entry-top-grid[\s\S]*entry-date-field[\s\S]*entry-current-km-field/.test(html), 'Data e hodômetro atual não estão no novo formato de dois campos.');
assert(/Último hodômetro:[\s\S]*id="lastKm"/.test(html), 'Último hodômetro não está apresentado como informação auxiliar menor.');
assert(html.includes('id="tankCompleteField"') && html.includes('id="addMovementItem"'), 'Opção Completo ou botão para outro combustível ausente.');
assert(/> Completo<\/span>/.test(html) && /Adicionar outro combustível/.test(html), 'Texto compacto Completo ou ação Adicionar outro combustível ausente.');
assert(!/Tanque completo|Padrão: completo/.test(html), 'Textos antigos do tanque completo ainda estão visíveis.');
assert(/normalizeText\(r\.item\)\.includes\("etanol"\)/.test(app), 'Etanol não está configurado como combustível inicial preferencial.');
assert(/row\.preco > 0 && row\.valor >= 0/.test(app), 'Abastecimento ainda não aceita valor total zero.');
assert(/function\s+localDateISO\s*\(/.test(app) && /: localDateISO\(\);/.test(app), 'Data local do lançamento não foi corrigida.');
assert(/data-context-type="FORMA_PAGAMENTO"/.test(html) && /entryContextNewLabel/.test(app), 'Seleção contextual da forma de pagamento ausente.');
assert(/context-bottom-sheet/.test(html + styles) && /context-register-new/.test(html + styles), 'Folha inferior com ação Cadastrar novo ausente.');
assert(/data-context-type="MOTORISTA"/.test(html) && /newButton\.hidden = type === "MOTORISTA"/.test(app), 'Motorista deve permitir somente seleção, sem cadastro rápido.');
assert(!/entry-quick-add|data-register-type="MOTORISTA"/.test(html), 'Botões de mais isolados ainda estão visíveis nos campos do lançamento.');
assert(/SALVAR LANÇAMENTO/.test(html), 'Botão exclusivo SALVAR LANÇAMENTO ausente.');
assert(!/coverFile = await state\.coverFactory/.test(reportManager), 'Gerenciador ainda gera capa separada para relatórios.');
assert(!/Selecione uma opção cadastrada\./.test(app), 'A instrução redundante ainda aparece nas listas de seleção dos lançamentos.');
assert(/if \(group === "MANUTENÇÃO"\) return "＋ Incluir novo item de manutenção"/.test(app), 'Cadastro rápido de tipo de manutenção ausente.');
assert(/if \(group === "ADMINISTRATIVO"\) return "＋ Incluir novo item administrativo"/.test(app), 'Cadastro rápido de item administrativo ausente.');
assert(/return "＋ Incluir novo tipo de receita"/.test(app), 'Cadastro rápido de tipo de receita ausente.');
assert(/type === "FORNECEDOR"[\s\S]*Incluir novo fornecedor/.test(app), 'Cadastro rápido de fornecedor ausente nas telas de lançamento.');
assert(/selectorList\.appendChild\(newButton\)/.test(app), 'A ação verde de inclusão não está posicionada ao final da lista rolável.');
assert(/context-register-new[^}]*border:\s*1px solid #23b36f/.test(styles) && /background:\s*rgba\(35,179,111,\.14\)/.test(styles), 'Destaque verde da ação Incluir novo ausente.');
assert(/valueTextColor:\s*"#111111"/.test(app) && /options\.valueTextColor \|\| "#ffffff"/.test(app), 'Valores das barras do Relatório Executivo não foram fixados em preto.');
assert(/Relatório Executivo contínuo/.test(app) && /<main class="report">/.test(app), 'Relatório Executivo contínuo ausente.');
assert(!/Página 1 de 2|Página 2 de 2/.test(app), 'Relatório Executivo ainda possui paginação fixa em duas páginas.');
assert(/Indicadores principais de consumo/.test(app) && /Somente etanol/.test(app) && /Somente gasolina/.test(app), 'Cards de consumo geral, Etanol e Gasolina ausentes.');
assert(/Média diária[\s\S]*Média mensal[\s\S]*Último ano[\s\S]*Total acumulado/.test(app), 'Indicadores financeiros diário, mensal, anual e total ausentes.');
assert(/Custo líquido por km[\s\S]*Custo líquido diário[\s\S]*Custo líquido mensal[\s\S]*Custo líquido total/.test(app), 'Quatro cartões totalizadores de custo líquido ausentes ou fora da ordem.');
assert(/net-totalizers/.test(app) && /net-totalizer/.test(app), 'Estrutura dos cartões totalizadores líquidos ausente.');
assert(/item-rate-button/.test(app + styles) && /rateio_qtd_meses/.test(app), 'Rateio por item de Manutenção e Administrativo ausente.');
assert(/Custos por Competência/.test(app) && /competenceDetails/.test(app), 'Seção de custos por competência ausente no Relatório Executivo.');
assert(/group === "RECEITA" \? "Pagador"/.test(app), 'Fornecedor não foi renomeado para Pagador no lançamento de Receita.');
assert(/rateio_competencia_inicial/.test(db) && /rateio_valor_base_centavos/.test(db), 'Campos de rateio ausentes na exportação/importação XLSX.');
assert(/net-totalizers \.net-totalizer\{border:2px solid var\(--red\)/.test(app), 'Bordas vermelhas dos totalizadores líquidos ausentes.');
assert(app.indexOf('${financialCards}') < app.indexOf('${netTotalizerCards}') && app.indexOf('${netTotalizerCards}') < app.indexOf('Despesas do período'), 'Totalizadores líquidos devem ficar após Receitas e antes de Despesas do período.');
assert(/periodNetDaily\s*=\s*periodNet\s*\/\s*inclusiveDays/.test(app) && /periodNetMonthly\s*=\s*periodNetDaily\s*\*\s*30\.44/.test(app), 'Cálculos diário e mensal do custo líquido não seguem a proposta aprovada.');
assert(/chartCards = \[/.test(app) && /Cinco itens com maior valor acumulado/.test(app), 'Conjunto completo de gráficos do aplicativo ausente no Executivo.');
assert(/slice\(0, 3\)/.test(app), 'Últimos lançamentos por grupo não estão limitados aos três mais recentes.');
assert(app.indexOf('Últimos lançamentos por grupo') < app.indexOf('Manutenções com alertas cadastrados'), 'Últimos lançamentos por grupo devem aparecer antes das manutenções com alertas cadastrados.');
assert(/window\.myCarHandleAndroidBack/.test(app), 'Ponte JavaScript de navegação do botão Voltar ausente.');

// Relatórios e compartilhamento.
assert(/openReportDocument\s*\(/.test(app), 'Visualizador interno de relatórios ausente.');
assert(/MyCarReportManager/.test(app) && /mycar-share-report-html/.test(reportManager), 'Gerenciador central de compartilhamento ausente.');
assert(/id="reportShareButton"[^>]*>Compartilhar</.test(app), 'Botão Compartilhar do Executivo ausente.');
assert(/id="aiReportShare"[^>]*>Compartilhar</.test(app), 'Botão Compartilhar da IA ausente.');
assert(/id="reportPrintButton"[^>]*>Imprimir</.test(app), 'Botão Imprimir do Executivo ausente.');
assert(/id="aiReportPrint"[^>]*>Imprimir</.test(app), 'Botão Imprimir da IA ausente.');
assert(/function printHtml\(\)\{var html=printableDocument\(\)/.test(app), 'Impressão do Executivo não usa o HTML completo.');
assert(/MyCarReportManager\.print\('RELATORIO_EXECUTIVO_MYCAR_PLUS',html\)/.test(app), 'Executivo não usa o gerenciador central de impressão.');
assert(/MyCarReportManager\.print\('ANALISE_INTELIGENTE_MYCAR_PLUS',html\)/.test(app), 'Análise Inteligente não usa o gerenciador central de impressão.');
assert(/bridge\.printHtml\(reportName, reportHtml\)/.test(reportManager), 'Gerenciador central não chama a ponte nativa printHtml.');

// Android.
const mainActivity = read('android/app/src/main/java/br/com/marceloauditor/mycarplus/MainActivity.java');
assert(/public void shareHtml\(String jobName, String html\)/.test(mainActivity), 'Ponte nativa shareHtml ausente.');
assert(/Intent\.ACTION_SEND/.test(mainActivity), 'Compartilhamento Android ACTION_SEND ausente.');
assert(/Intent\.ACTION_SEND_MULTIPLE/.test(mainActivity), 'Compartilhamento múltiplo Android ausente.');
assert(/shareHtmlWithCover/.test(mainActivity), 'Ponte nativa shareHtmlWithCover ausente.');
assert(/public void onDestroy\(\)/.test(mainActivity), 'onDestroy deve ser público.');
assert(/getOnBackPressedDispatcher\(\)\.addCallback/.test(mainActivity), 'Tratamento nativo do botão Voltar Android ausente.');
assert(/finishAffinity\(\)/.test(mainActivity), 'Encerramento nativo do app Android ausente.');
assert(/Pressione novamente para sair do MyCar\+\./.test(mainActivity), 'Confirmação nativa em dois toques ausente.');
assert(/composition-cost-card/.test(app + styles) && /Composição dos Grupos/.test(app), 'Card Composição dos Grupos ausente.');
assert(/label:\s*"Receitas"/.test(app) && /netCost\s*=\s*totalExpenses\s*-\s*totalIncome/.test(app), 'Receitas ou fórmula do custo líquido ausente.');
assert(!/% de dedução|>dedução</.test(app), 'A palavra “dedução” ainda aparece no card Composição dos Grupos.');
assert(/label: "Abastecimento"[\s\S]*label: "Administrativo"[\s\S]*label: "Manutenção"/.test(app), 'Grupos do card não estão em ordem alfabética.');
assert(!/% das despesas/.test(app), 'A observação “das despesas” ainda aparece no card.');
assert(/<span>Custo líquido<\/span>/.test(app) && /Nenhum lançamento financeiro registrado no período/.test(app), 'Total líquido ou estado vazio do card de composição ausente.');

// BAT.
assert(batch.includes(`set "VERSAO=${expected.app}"`), `BAT não está configurado para ${expected.app}.`);
assert(batch.includes(expected.zip), `BAT não procura o ZIP ${expected.zip}.`);
assert(batch.includes('validate:cohesion'), 'BAT não executa a validação de coesão.');
assert(!/powershell(?:\.exe)?[^\r\n]*-File/i.test(batch), 'BAT depende de PS1 externo.');

// A validação da versão atual verifica somente a coesão funcional.
// A organizacao historica da pasta real nao e alterada por este script.

const syncedFiles = [
  'index.html','styles.css','report-manager.js','app.js','mycarplus-db.js','cloud.js','ai-logic.js',
  'firebase-config.js','jszip.min.js','manifest.webmanifest','package.json','package-lock.json','capacitor.config.json','sw.js','icon.svg',
  'icon-16.png','icon-32.png','icon-48.png','icon-72.png','icon-96.png','icon-128.png','icon-144.png','icon-180.png','icon-192.png','icon-256.png','icon-384.png','icon-512.png','mycar-plus-logo.png','desenvolvedor.png','about-logo.png',
  'data/MyCarPlus.xlsx',
];
for (const rel of syncedFiles) {
  const source = path.join(root, rel);
  const web = path.join(root, 'www', rel);
  const android = path.join(root, 'android/app/src/main/assets/public', rel);
  if (![source, web, android].every(fs.existsSync)) {
    failures.push(`Cópia ausente na cadeia raiz → www → Android: ${rel}`);
    continue;
  }
  const sourceHash = hash(source);
  assert(hash(web) === sourceHash, `www divergente: ${rel}`);
  assert(hash(android) === sourceHash, `Android divergente: ${rel}`);
}

if (failures.length) {
  console.error('\nVALIDAÇÃO DE COESÃO: REPROVADA');
  failures.forEach((failure, index) => console.error(`${index + 1}. ${failure}`));
  process.exit(1);
}
console.log('VALIDAÇÃO DE COESÃO: APROVADA');
console.log(`Versão: ${expected.semver} | Android code: ${expected.versionCode} | Cache: ${expected.cache}`);
console.log(`${syncedFiles.length} arquivos conferidos na cadeia raiz → www → Android.`);
