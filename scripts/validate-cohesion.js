const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.resolve(__dirname, '..');
const expected = {
  semver: '5.42.0',
  app: '5.42',
  versionCode: '542',
  cache: 'mycar-plus-v5-42',
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

const app = read('app.js');
assert(new RegExp(`APP_VERSION\\s*=\\s*["']${expected.app.replace('.', '\\.')}`).test(app), `APP_VERSION deve ser ${expected.app}.`);
assert(/data\.vehicleId\s*=\s*f\.vehicleId\.value/.test(app), 'Cadastro de alerta não coleta explicitamente o vehicleId bloqueado.');
assert(/function\s+deleteAlert\s*\(/.test(app), 'Rotina de exclusão de alerta técnico ausente.');
assert(/histórico técnico (será|foi) preservado|histórico técnico foi preservado/i.test(app), 'Mensagem de preservação do histórico técnico ausente.');
assert(/function\s+restoreDataState\s*\(/.test(app), 'Restauração transacional do estado ausente.');
assert(/openReportDocument\s*\(/.test(app), 'Visualizador interno de relatórios ausente.');
assert(!/canOperate\s*&&\s*!a\.technicalKey/.test(app), 'Ainda existe bloqueio de exclusão para alertas técnicos.');
assert(!/confirm\(["']Excluir este alerta\?/.test(app), 'Ainda existe confirmação genérica antiga de exclusão de alerta.');

const html = read('index.html');
assert(html.includes(`v${expected.app}`), `Versão visível v${expected.app} ausente no index.html.`);
assert(html.includes(`<strong>Versão:</strong> ${expected.app}`), `Versão ${expected.app} ausente na tela Sobre.`);
assert(html.includes('Relatório Executivo PDF'), 'Nome padronizado do botão Relatório Executivo PDF ausente.');
assert(html.includes('Exportar dados XLSX'), 'Nome padronizado do botão Exportar dados XLSX ausente.');
assert(html.includes('technicalHistoryList'), 'Seção de histórico técnico visível ausente.');
assert(html.includes('reportViewerDialog'), 'Visualizador interno de relatório ausente no HTML.');

const ids = [...html.matchAll(/\bid=["']([^"']+)["']/g)].map((m) => m[1]);
const duplicateIds = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
assert(duplicateIds.length === 0, `IDs duplicados no index.html: ${duplicateIds.join(', ')}`);

const sw = read('sw.js');
assert(sw.includes(expected.cache), `Cache PWA deve ser ${expected.cache}.`);
const gradle = read('android/app/build.gradle');
assert(new RegExp(`versionCode\\s+${expected.versionCode}\\b`).test(gradle), `Android versionCode deve ser ${expected.versionCode}.`);
assert(gradle.includes(`versionName "${expected.semver}"`), `Android versionName deve ser ${expected.semver}.`);

const batch = 'ATUALIZAR_MYCAR_V5_42_WEB_ANDROID.bat';
const batchText = read(batch);
assert(batchText.includes('set "VERSAO=5.42"'), 'BAT não possui a variável VERSAO=5.42.');
assert(batchText.includes('MYCAR_PLUS_V5_42_MASTER.zip'), 'BAT não espera o ZIP oficial V5.42.');
assert(batchText.includes('validate:cohesion'), 'BAT não executa a validação de coesão.');
assert(!fs.existsSync(path.join(root, 'ATUALIZAR_MYCAR_V5_41_WEB_ANDROID.bat')), 'BAT operacional antigo V5.41 ainda está na raiz.');

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
