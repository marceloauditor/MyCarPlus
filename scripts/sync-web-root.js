const fs = require("fs");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..");
const webRoot = path.join(projectRoot, "www");

const files = [
  "index.html", "styles.css", "report-manager.js", "app.js", "mycarplus-db.js", "cloud.js",
  "ai-logic.js", "firebase-config.js", "jszip.min.js", "manifest.webmanifest",
  "package.json", "package-lock.json", "capacitor.config.json", "sw.js", "icon.svg", "icon-16.png", "icon-32.png", "icon-48.png", "icon-72.png", "icon-96.png", "icon-128.png", "icon-144.png", "icon-180.png", "icon-192.png", "icon-256.png", "icon-384.png",
  "icon-512.png", "mycar-plus-logo.png", "desenvolvedor.png", "about-logo.png"
];
const directories = ["data"];

function removeIfExists(target) {
  if (fs.existsSync(target)) fs.rmSync(target, { recursive: true, force: true });
}
function copyEntry(source, target) {
  const stat = fs.statSync(source);
  if (stat.isDirectory()) {
    fs.mkdirSync(target, { recursive: true });
    for (const name of fs.readdirSync(source)) {
      copyEntry(path.join(source, name), path.join(target, name));
    }
  } else {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(source, target);
  }
}

fs.mkdirSync(webRoot, { recursive: true });

for (const name of [...files, ...directories]) {
  const source = path.join(projectRoot, name);
  const target = path.join(webRoot, name);
  if (!fs.existsSync(source)) {
    throw new Error(`Arquivo obrigatório ausente na fonte oficial: ${name}`);
  }
  removeIfExists(target);
  copyEntry(source, target);
}

for (const stale of [
  "validation.css", "mycar-plus-identidade.png", "README.md",
  "FIREBASE_SETUP.md", "FIREBASE_AI_SETUP.md", "firestore.rules"
]) {
  removeIfExists(path.join(webRoot, stale));
}

console.log("Fonte oficial sincronizada: raiz → www.");
