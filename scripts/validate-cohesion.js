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
  batch: `ATUALIZAR_MYCAR_V${match[1]}_${match[2]}_WEB_ANDROID.bat`,
  zip: `MYCAR_PLUS_V${match[1]}_${match[2]}_MASTER.zip`,
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
assert(html.includes('id="lastConsumption"') && html.includes('id="lastDistance"'), 'Indicadores exclusivos da tela inicial devem permanecer.');

// Relatórios e compartilhamento.
assert(/openReportDocument\s*\(/.test(app), 'Visualizador interno de relatórios ausente.');
assert(/mycar-share-report-html/.test(app), 'Compartilhamento HTML ausente.');
assert(/id="reportShareButton"[^>]*>Compartilhar</.test(app), 'Botão Compartilhar do Executivo ausente.');
assert(/id="aiReportShare"[^>]*>Compartilhar</.test(app), 'Botão Compartilhar da IA ausente.');
assert(/id="reportPrintButton"[^>]*>Imprimir</.test(app), 'Botão Imprimir do Executivo ausente.');
assert(/id="aiReportPrint"[^>]*>Imprimir</.test(app), 'Botão Imprimir da IA ausente.');

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
for (const oldVersion of ['41','42','43','44','45','46','47','48','49','50','51','52','53','54']) {
  assert(!fs.existsSync(path.join(root, `ATUALIZAR_MYCAR_V5_${oldVersion}_WEB_ANDROID.bat`)), `BAT antigo V5.${oldVersion} ainda está na raiz.`);
}

const syncedFiles = [
  'index.html','styles.css','app.js','mycarplus-db.js','cloud.js','ai-logic.js',
  'firebase-config.js','jszip.min.js','manifest.webmanifest','sw.js','icon.svg',
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
