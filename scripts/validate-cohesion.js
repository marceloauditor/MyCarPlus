const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.resolve(__dirname, '..');
const expected = {
  semver: '5.54.0',
  app: '5.54',
  versionCode: '554',
  cache: 'mycar-plus-v5-54',
};
const failures = [];
const notices = [];

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
assert(pkg.version === expected.semver, `package.json deve estar em ${expected.semver}.`);
assert(pkg.scripts && pkg.scripts['validate:cohesion'], 'Script validate:cohesion ausente no package.json.');
const capacitorConfig = JSON.parse(read('capacitor.config.json') || '{}');
const statusBarConfig = capacitorConfig.plugins && capacitorConfig.plugins.StatusBar;
assert(statusBarConfig && statusBarConfig.overlaysWebView === false, 'StatusBar deve manter overlaysWebView=false.');
assert(statusBarConfig && statusBarConfig.style === 'LIGHT', 'StatusBar deve usar ícones claros sobre o fundo azul.');
const androidCapacitorConfig = JSON.parse(read('android/app/src/main/assets/capacitor.config.json') || '{}');
assert(JSON.stringify(androidCapacitorConfig.plugins?.StatusBar || {}) === JSON.stringify(statusBarConfig || {}), 'Configuração StatusBar divergente nos assets Android.');

const app = read('app.js');
assert(new RegExp(`APP_VERSION\\s*=\\s*["']${expected.app.replace('.', '\\.')}`).test(app), `APP_VERSION deve ser ${expected.app}.`);
assert(/data\.vehicleId\s*=\s*f\.vehicleId\.value/.test(app), 'Cadastro de alerta não coleta explicitamente o vehicleId bloqueado.');
assert(/function\s+deleteAlert\s*\(/.test(app), 'Rotina de exclusão de alerta técnico ausente.');
assert(/histórico técnico (será|foi) preservado|histórico técnico foi preservado/i.test(app), 'Mensagem de preservação do histórico técnico ausente.');
assert(/function\s+restoreDataState\s*\(/.test(app), 'Restauração transacional do estado ausente.');
assert(/function\s+sameMovement\s*\(/.test(app), 'Comparação normalizada de IDs de movimentos ausente.');
assert(/o\.movimento_id\s*=\s*String\(/.test(app), 'Normalização textual do movimento_id ausente.');
assert(/currentRows\s*=\s*id\s*\?\s*movements\.filter\(\(m\)\s*=>\s*sameMovement\(m, id\)\)/.test(app), 'Edição ainda não usa comparação normalizada de movimento.');
assert(!/Veículo inativo: seus movimentos estão disponíveis somente para consulta e não podem ser alterados/.test(app), 'Bloqueio indevido de alteração histórica de veículo inativo ainda existe.');
assert(/function\s+movementDateTimeForEdit\s*\(/.test(app), 'Preservação do horário original na edição de movimentos ausente.');
assert(/referenceOrder\s*=\s*current/.test(app), 'Validação sequencial de hodômetro por horário e ordem ausente.');
assert(/data_hora:\s*movementDateTimeForEdit\(d\.data, current\)/.test(app), 'Edição ainda substitui indevidamente o horário histórico do movimento.');

assert(/openReportDocument\s*\(/.test(app), 'Visualizador interno de relatórios ausente.');
assert(/mycar-share-report-html/.test(app), 'Mensageria de compartilhamento HTML ausente nos relatórios.');
assert(/bridge\.shareHtml\(jobName, html\)/.test(app), 'Aplicativo não encaminha o HTML à ponte nativa de compartilhamento.');
assert(/id="reportCloseButton"[^>]*>Fechar</.test(app), 'Botão Fechar do Relatório Executivo ausente.');
assert(/id="reportShareButton"[^>]*>Compartilhar</.test(app), 'Botão Compartilhar do Relatório Executivo ausente.');
assert(/id="aiReportClose"[^>]*>Fechar</.test(app), 'Botão Fechar do relatório de inteligência ausente.');
assert(/id="aiReportShare"[^>]*>Compartilhar</.test(app), 'Botão Compartilhar do relatório de inteligência ausente.');
assert(!/reportPrintButton|aiReportPrint/.test(app), 'Botão Imprimir ainda existe no Relatório Executivo ou de Inteligência.');
assert(!/id="reportPdfButton"|id="aiReportPdf"/.test(app), 'Botão antigo Salvar PDF ainda existe nos relatórios principais.');
assert(/class="responsive-table"/.test(app), 'Relatório Executivo não possui tabelas responsivas para celular.');
assert(/data-label="Situação técnica"/.test(app), 'Tabela de manutenção não possui rótulos móveis.');
assert(/\.ai-action-table td::before/.test(app), 'Plano de ação da Inteligência não possui formatação móvel.');
assert(/configureNativeStatusBar/.test(app), 'Configuração nativa da barra de status ausente.');
assert(!/canOperate\s*&&\s*!a\.technicalKey/.test(app), 'Ainda existe bloqueio de exclusão para alertas técnicos.');
assert(!/confirm\(["']Excluir este alerta\?/.test(app), 'Ainda existe confirmação genérica antiga de exclusão de alerta.');
assert(/function\s+normalizeAlertRecord\s*\(/.test(app), 'Normalização dos alertas de manutenção ausente.');
assert(/data\.group\s*=\s*["']MANUTENÇÃO["']/.test(app), 'Cadastro de alerta não fixa o grupo MANUTENÇÃO.');
assert(/group:\s*["']MANUTENÇÃO["'][\s\S]{0,900}technical:\s*true/.test(app), 'Alertas gravados não estão padronizados como técnicos de manutenção.');
assert(/não apagará[\s\S]*histórico técnico/i.test(app), 'Confirmação de exclusão não esclarece a preservação do histórico.');
assert(/data-alert-view/.test(app), 'Ação Consultar do novo painel de alertas ausente.');
assert(/data-alert-edit/.test(app), 'Ação Alterar do novo painel de alertas ausente.');
assert(/data-alert-delete/.test(app), 'Ação Excluir do novo painel de alertas ausente.');
assert(/function\s+setAlertFormMode\s*\(/.test(app), 'Modo Consultar somente leitura ausente.');
assert(!/data-alert-complete/.test(app), 'Ação antiga Concluir ainda aparece na listagem de alertas.');
assert(!/data-alert-toggle/.test(app), 'Ação antiga Ativar/Desativar ainda aparece na listagem de alertas.');

const html = read('index.html');
assert(html.includes(`v${expected.app}`), `Versão visível v${expected.app} ausente no index.html.`);
assert(html.includes(`<strong>Versão:</strong> ${expected.app}`), `Versão ${expected.app} ausente na tela Sobre.`);
assert(html.includes('Gerar Relatório Executivo'), 'Botão Gerar Relatório Executivo ausente.');
assert(!html.includes('id="exportAiPdf"'), 'Botão externo redundante de PDF da Inteligência ainda existe.');
assert(!html.includes('Visualização interna'), 'Cabeçalho redundante do visualizador interno ainda existe.');
assert(html.includes('Exportar dados XLSX'), 'Nome padronizado do botão Exportar dados XLSX ausente.');
assert(!html.includes('technicalHistoryList'), 'Histórico técnico antigo ainda está visível na tela de alertas.');
assert(html.includes('reportViewerDialog'), 'Visualizador interno de relatório ausente no HTML.');
assert(html.includes('Alertas Técnicos'), 'Título Alertas Técnicos ausente.');
assert(html.includes('alert-selected-vehicle'), 'Cartão do veículo selecionado ausente no painel.');
assert(html.includes('alert-new-button'), 'Botão vermelho Novo alerta técnico ausente.');
assert(html.includes('alert-panel-list'), 'Nova relação compacta de alertas ausente.');
assert(!html.includes('alertSummary'), 'Resumo antigo por status ainda existe na tela.');
assert(!html.includes('id="alertStatus"'), 'Filtro antigo de status ainda existe na tela.');
assert(!html.includes('id="alertVehicle"'), 'Seletor antigo de veículo ainda existe na tela.');
assert(!html.includes('technicalPdf'), 'Botão antigo de relatório técnico ainda existe na tela.');
assert(/name="group"[^>]*disabled/.test(html), 'Grupo do alerta não está bloqueado em MANUTENÇÃO.');


assert(html.includes('technical-alert-dialog'), 'Nova tela visual de Alerta Técnico ausente.');
const styles = read('styles.css');
assert(styles.includes('alert-panel-card'), 'Estilos do novo painel compacto ausentes.');
assert(styles.includes('font-size:10.5px') || styles.includes('font-size:11.5px'), 'Tipografia compacta dos alertas não foi aplicada.');
assert(styles.includes('width:calc(100vw - 16px)'), 'Formulário de alerta não está delimitado na tela móvel.');
assert(styles.includes('alert-line-icon'), 'Ícones vetoriais consistentes ausentes.');
assert(html.includes('data-alert-criterion="DATE"') && html.includes('data-alert-criterion="KM"') && html.includes('data-alert-criterion="BOTH"'), 'Seleção Data/KM/Data e KM ausente.');
assert(html.includes('name="baseDate"') && html.includes('name="baseKm"'), 'Base de cálculo do alerta ausente.');
assert(html.includes('alertForecastDate') && html.includes('alertForecastKm'), 'Previsão automática da próxima troca ausente.');
assert(html.includes('name="observations"'), 'Campo Observações do alerta ausente.');
assert(/function\s+updateAlertForecastPreview\s*\(/.test(app), 'Cálculo visual da previsão do alerta ausente.');
assert(/function\s+alertBaseForItem\s*\(/.test(app), 'Busca da base pelo último lançamento do item ausente.');
assert(/baseDate,\s*baseKm,\s*dueDate,\s*dueKm/.test(app), 'Persistência da base e previsão do alerta ausente.');

const ids = [...html.matchAll(/\bid=["']([^"']+)["']/g)].map((m) => m[1]);
const duplicateIds = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
assert(duplicateIds.length === 0, `IDs duplicados no index.html: ${duplicateIds.join(', ')}`);

const sw = read('sw.js');
assert(sw.includes(expected.cache), `Cache PWA deve ser ${expected.cache}.`);
const gradle = read('android/app/build.gradle');
assert(new RegExp(`versionCode\\s+${expected.versionCode}\\b`).test(gradle), `Android versionCode deve ser ${expected.versionCode}.`);
assert(gradle.includes(`versionName "${expected.semver}"`), `Android versionName deve ser ${expected.semver}.`);


const mainActivity = read('android/app/src/main/java/br/com/marceloauditor/mycarplus/MainActivity.java');
assert(/public void printHtml\(String jobName, String html\)/.test(mainActivity), 'Ponte nativa printHtml de compatibilidade ausente no Android.');
assert(/public void shareHtml\(String jobName, String html\)/.test(mainActivity), 'Ponte nativa shareHtml ausente no Android.');
assert(!/shareHtmlAsPdf|PdfDocument/.test(mainActivity), 'Código antigo de compartilhamento em PDF ainda existe no Android.');
assert(/Intent\.ACTION_SEND/.test(mainActivity), 'Compartilhamento nativo ACTION_SEND ausente.');
assert(/FileProvider\.getUriForFile/.test(mainActivity), 'Compartilhamento não usa FileProvider.');
assert(/setType\("text\/html"\)/.test(mainActivity), 'Compartilhamento nativo não usa o tipo text/html.');
assert(/MediaSize\.ISO_A4/.test(mainActivity), 'Geração nativa não fixa papel A4.');
assert(/public void onDestroy\(\)/.test(mainActivity), 'onDestroy do MainActivity deve permanecer público.');
assert(!/from pathlib import Path/.test(mainActivity), 'MainActivity.java contém código Python indevido.');
const androidStyles = read('android/app/src/main/res/values/styles.xml');
assert(/windowOptOutEdgeToEdgeEnforcement/.test(androidStyles), 'Proteção contra sobreposição da barra de status ausente.');
const filePaths = read('android/app/src/main/res/xml/file_paths.xml');
assert(/name="shared_reports"/.test(filePaths), 'FileProvider não possui caminho de cache para relatórios compartilhados.');

const batch = 'ATUALIZAR_MYCAR_V5_54_WEB_ANDROID.bat';
const batchText = read(batch);
assert(batchText.includes('set "VERSAO=5.54"'), 'BAT não possui a variável VERSAO=5.54.');
assert(batchText.includes('MYCAR_PLUS_V5_54_MASTER.zip'), 'BAT não espera o ZIP oficial V5.52.');
assert(batchText.includes('MYCAR_PLUS_V5_54_MASTER*.zip'), 'BAT não aceita nomes automáticos como (1) no ZIP baixado.');
assert(batchText.includes('validate:cohesion'), 'BAT não executa a validação de coesão.');
assert(!/powershell(?:\.exe)?[^\r\n]*-File[^\r\n]*APLICAR_ATUALIZACAO_MYCAR_V5_52\.ps1/i.test(batchText), 'BAT ainda depende de script PS1 externo.');
assert(batchText.includes('autocontido') || batchText.includes('Autocontido'), 'BAT não informa que é autocontido.');
for (const oldVersion of ['41', '42', '43', '44', '45', '46', '47', '48', '49', '50', '51']) {
  assert(!fs.existsSync(path.join(root, `ATUALIZAR_MYCAR_V5_${oldVersion}_WEB_ANDROID.bat`)), `BAT operacional antigo V5.${oldVersion} ainda está na raiz.`);
}

const syncedFiles = [
  'index.html', 'styles.css', 'app.js', 'mycarplus-db.js', 'cloud.js',
  'ai-logic.js', 'firebase-config.js', 'jszip.min.js', 'manifest.webmanifest',
  'sw.js', 'icon.svg', 'icon-32.png', 'icon-180.png', 'icon-192.png',
  'icon-512.png', 'desenvolvedor.png', 'data/MyCarPlus.xlsx',
];
for (const rel of syncedFiles) {
  const source = path.join(root, rel);
  const web = path.join(root, 'www', rel);
  const android = path.join(root, 'android/app/src/main/assets/public', rel);
  if (![source, web, android].every(fs.existsSync)) {
    failures.push(`Cópia ausente na cadeia raiz → www → Android: ${rel}`);
    continue;
  }
  const h = hash(source);
  assert(hash(web) === h, `www divergente da fonte oficial: ${rel}`);
  assert(hash(android) === h, `Android divergente da fonte oficial: ${rel}`);
}

const forbiddenInRuntime = [
  ['www/README.md', 'Arquivo documental indevido dentro de www.'],
  ['android/app/src/main/assets/public/README.md', 'Arquivo documental indevido nos assets Android.'],
];
for (const [rel, message] of forbiddenInRuntime) {
  if (fs.existsSync(path.join(root, rel))) notices.push(message);
}

if (failures.length) {
  console.error('\nVALIDAÇÃO DE COESÃO: REPROVADA');
  failures.forEach((failure, index) => console.error(`${index + 1}. ${failure}`));
  if (notices.length) notices.forEach((notice) => console.warn(`Aviso: ${notice}`));
  process.exit(1);
}
console.log('VALIDAÇÃO DE COESÃO: APROVADA');
console.log(`Versão: ${expected.semver} | Android code: ${expected.versionCode} | Cache: ${expected.cache}`);
console.log(`${syncedFiles.length} arquivos conferidos na cadeia raiz → www → Android.`);
if (notices.length) notices.forEach((notice) => console.warn(`Aviso: ${notice}`));
