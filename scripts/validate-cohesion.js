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
const appVersion = `${match[1]}.${match[2]}`;
const expected = {
  semver,
  app: appVersion,
  versionCode: `${match[1]}${match[2].padStart(2, '0')}`,
  cache: `mycar-plus-v${match[1]}-${match[2]}`,
  batch: `ATUALIZAR_MYCAR_V${match[1]}_${match[2]}_KEY.bat`,
  zip: `MYCAR_PLUS_V${match[1]}_${match[2]}_KEY.zip`,
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
assert(gradle.includes(`versionName "${expected.semver}"`), `versionName deve ser ${expected.semver}.`);
assert(sw.includes(expected.cache), `Cache PWA deve ser ${expected.cache}.`);

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
assert(/<h3>Composição dos custos<\/h3>/.test(app) && /<h3>Utilização<\/h3>/.test(app) && /MyCar Score/.test(app), 'Composição, Utilização e MyCar Score devem permanecer abaixo de Tendências.');
assert(/insight-grid-score-first/.test(app) && /insight-score-card/.test(app) && /insight-grid-composition-wide/.test(app + styles), 'Estrutura da inversão Score/Composição ausente.');
assert(app.indexOf('MyCar Score') < app.indexOf('<h3>Composição dos custos</h3>') && app.indexOf('<h3>Utilização</h3>') < app.indexOf('<h3>Composição dos custos</h3>'), 'MyCar Score e Utilização devem aparecer antes da Composição dos custos.');
assert(/insight-metrics-six/.test(app + styles) && /max-height:720px/.test(styles), 'Modo compacto dos seis indicadores ausente.');

// Gráficos, período efetivo, manual, tela Sobre e painel — V5.80.
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

// Lançamentos compactos e seletores em folha inferior — V5.80.
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

// Relatórios e compartilhamento.
assert(/openReportDocument\s*\(/.test(app), 'Visualizador interno de relatórios ausente.');
assert(/MyCarReportManager/.test(app) && /mycar-share-report-html/.test(reportManager), 'Gerenciador central de compartilhamento ausente.');
assert(/id="reportShareButton"[^>]*>Compartilhar</.test(app), 'Botão Compartilhar do Executivo ausente.');
assert(/id="aiReportShare"[^>]*>Compartilhar</.test(app), 'Botão Compartilhar da IA ausente.');
assert(/id="reportPrintButton"[^>]*>Imprimir</.test(app), 'Botão Imprimir do Executivo ausente.');
assert(/id="aiReportPrint"[^>]*>Imprimir</.test(app), 'Botão Imprimir da IA ausente.');
assert(/function printHtml\(\)\{var html=printableDocument\(\)/.test(app), 'Impressão do Executivo não usa o HTML completo.');
assert(/MyCarReportManager\.print\('RELATORIO_EXECUTIVO_MYCAR_PLUS',html\)/.test(app), 'Executivo não usa o gerenciador central de impressão.');
assert(/MyCarReportManager\.print\('RELATORIO_IA_MYCAR_PLUS',html\)/.test(app), 'Relatório IA não usa o gerenciador central de impressão.');
assert(/bridge\.printHtml\(reportName, reportHtml\)/.test(reportManager), 'Gerenciador central não chama a ponte nativa printHtml.');

// Android.
const mainActivity = read('android/app/src/main/java/br/com/marceloauditor/mycarplus/MainActivity.java');
assert(/public void shareHtml\(String jobName, String html\)/.test(mainActivity), 'Ponte nativa shareHtml ausente.');
assert(/Intent\.ACTION_SEND/.test(mainActivity), 'Compartilhamento Android ACTION_SEND ausente.');
assert(/Intent\.ACTION_SEND_MULTIPLE/.test(mainActivity), 'Compartilhamento múltiplo Android ausente.');
assert(/shareHtmlWithCover/.test(mainActivity), 'Ponte nativa shareHtmlWithCover ausente.');
assert(/public void onDestroy\(\)/.test(mainActivity), 'onDestroy deve ser público.');

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
  'icon-16.png','icon-32.png','icon-48.png','icon-72.png','icon-96.png','icon-128.png','icon-144.png','icon-180.png','icon-192.png','icon-256.png','icon-384.png','icon-512.png','mycar-plus-logo.png','desenvolvedor.png',
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
