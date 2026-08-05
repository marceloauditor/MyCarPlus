const fs = require("fs");
const path = require("path");
const projectRoot = path.resolve(__dirname, "..");
const webRoot = path.join(projectRoot, "www");
const androidRoot = path.join(projectRoot, "android", "app", "src", "main", "assets", "public");

const files = [
  "index.html", "styles.css", "report-manager.js", "indicator-calculations.js", "app.js", "mycarplus-db.js",
  "cloud.js", "ai-logic.js", "firebase-config.js", "jszip.min.js", "manifest.webmanifest", "sw.js",
  "icon-16.png", "icon-32.png", "icon-48.png", "icon-72.png", "icon-96.png", "icon-128.png",
  "icon-144.png", "icon-180.png", "icon-192.png", "icon-256.png", "icon-384.png", "icon-512.png",
  "desenvolvedor.png", "about-logo.png", "data/MyCarPlus.xlsx",
];

function resetDirectory(target) { fs.rmSync(target, { recursive: true, force: true }); fs.mkdirSync(target, { recursive: true }); }
function copy(relative, targetRoot) {
  const source = path.join(projectRoot, relative); const target = path.join(targetRoot, relative);
  if (!fs.existsSync(source)) throw new Error(`Arquivo obrigatório ausente: ${relative}`);
  fs.mkdirSync(path.dirname(target), { recursive: true }); fs.copyFileSync(source, target);
}

resetDirectory(webRoot);
files.forEach((relative) => copy(relative, webRoot));
resetDirectory(androidRoot);
files.forEach((relative) => copy(relative, androidRoot));
console.log(`Fonte oficial sincronizada: raiz → www → Android (${files.length} arquivos).`);
