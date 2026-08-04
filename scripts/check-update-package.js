"use strict";
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

function parseArgs(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i++) {
    const key = argv[i];
    if (!key.startsWith("--")) continue;
    const name = key.slice(2);
    const value = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[++i] : true;
    out[name] = value;
  }
  return out;
}
const args = parseArgs(process.argv);
const root = path.resolve(String(args.root || path.resolve(__dirname, "..")));
const mode = String(args.mode || "package").toLowerCase();
const diagnostic = args.diagnostic ? path.resolve(String(args.diagnostic)) : path.join(root, "DIAGNOSTICO_MONTAGEM_V6_06.txt");
const logPath = args.log ? path.resolve(String(args.log)) : null;
const expected = { app: "6.06", semver: "6.6.0", code: "606", name: "6.06.0", cache: "mycar-plus-v6-06" };
const results = [];

function sha(file) { return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex"); }
function text(rel) { return fs.readFileSync(path.join(root, rel), "utf8"); }
function exists(rel) { return fs.existsSync(path.join(root, rel)); }
function record(id, name, ok, detail) {
  results.push({ id, name, ok, detail: String(detail || "") });
  const line = `[${id}][${ok ? "OK" : "ERRO"}] ${name}${detail ? ` — ${detail}` : ""}`;
  console.log(line);
  if (logPath) fs.appendFileSync(logPath, line + "\r\n", "utf8");
}
function check(id, name, fn) {
  try {
    const detail = fn();
    record(id, name, true, detail === true || detail == null ? "" : detail);
  } catch (err) {
    record(id, name, false, err && err.message ? err.message : err);
  }
}
function requireCond(cond, msg) { if (!cond) throw new Error(msg); }
function same(a,b) { requireCond(exists(a), `ausente: ${a}`); requireCond(exists(b), `ausente: ${b}`); requireCond(sha(path.join(root,a)) === sha(path.join(root,b)), `${a} diverge de ${b}`); }

check("CHK-ROOT-001", "Pasta raiz do pacote", () => { requireCond(fs.existsSync(root), root); return root; });
check("CHK-FILES-001", "Arquivos essenciais", () => {
  const required = ["app.js","index.html","styles.css","package.json","package-lock.json","sw.js","report-logo.png","about-logo.png","data/MyCarPlus.xlsx","android/app/build.gradle","scripts/sync-web-root.js","scripts/validate-cohesion.js","scripts/check-update-package.js","CHECKLIST_MONTAGEM_E_DIAGNOSTICO_V6_06.md","MANIFEST_SHA256_V6_06.txt"];
  const missing = required.filter(rel => !exists(rel));
  requireCond(!missing.length, `ausentes: ${missing.join(", ")}`);
  return `${required.length} arquivos localizados`;
});
check("CHK-APP-001", "Versão do aplicativo", () => {
  requireCond(/APP_VERSION\s*=\s*["']6\.06["']/.test(text("app.js")), 'APP_VERSION = "6.06" não localizado');
  return expected.app;
});
check("CHK-NPM-001", "Versão package.json", () => {
  const pkg = JSON.parse(text("package.json")); requireCond(pkg.version === expected.semver, `encontrada ${pkg.version}`); return pkg.version;
});
check("CHK-NPM-002", "Versão package-lock.json", () => {
  const lock = JSON.parse(text("package-lock.json"));
  requireCond(lock.version === expected.semver, `raiz ${lock.version}`);
  requireCond(lock.packages && lock.packages[""] && lock.packages[""].version === expected.semver, `packages[\"\"] ${lock.packages?.[""]?.version}`);
  return expected.semver;
});
check("CHK-PWA-001", "Cache PWA", () => { requireCond(text("sw.js").includes(expected.cache), `${expected.cache} ausente`); return expected.cache; });
check("CHK-ANDROID-001", "Android versionCode", () => { requireCond(new RegExp(`versionCode\\s+${expected.code}\\b`).test(text("android/app/build.gradle")), `esperado ${expected.code}`); return expected.code; });
check("CHK-ANDROID-002", "Android versionName", () => { requireCond(text("android/app/build.gradle").includes(`versionName "${expected.name}"`), `esperado ${expected.name}`); return expected.name; });
check("CHK-DATA-001", "Base inicial preservada", () => { const p=path.join(root,"data/MyCarPlus.xlsx"); requireCond(fs.statSync(p).size > 0, "arquivo vazio"); return `${fs.statSync(p).size} bytes`; });
check("CHK-LOGO-001", "Assinatura PNG do logotipo", () => {
  for (const rel of ["report-logo.png","about-logo.png"]) {
    const b=fs.readFileSync(path.join(root,rel)); requireCond(b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])), `${rel} não é PNG válido`);
    requireCond(b.length >= 33, `${rel} truncado`);
    const w=b.readUInt32BE(16), h=b.readUInt32BE(20); requireCond(w>0 && h>0, `${rel} dimensão inválida`);
  }
  return "PNG íntegro";
});
check("CHK-LOGO-002", "Logotipo Base64 dos relatórios", () => {
  const m=text("app.js").match(/REPORT_LOGO_DATA_URI\s*=\s*"data:image\/png;base64,([^"]+)"/);
  requireCond(m, "REPORT_LOGO_DATA_URI ausente");
  const decoded=Buffer.from(m[1],"base64"), official=fs.readFileSync(path.join(root,"report-logo.png"));
  requireCond(decoded.equals(official), "Base64 diverge de report-logo.png"); return `${decoded.length} bytes`;
});
check("CHK-LOGO-003", "Logotipo da tela Sobre", () => {
  const html=text("index.html"); requireCond(html.includes("about-logo.png?v=606"), "referência principal ausente"); requireCond(html.includes("icon-192.png?v=606"), "fallback ausente"); return "principal e fallback configurados";
});
check("CHK-SYNC-001", "Coesão raiz, Web e Android", () => {
  const files=["index.html","styles.css","report-manager.js","app.js","mycarplus-db.js","cloud.js","ai-logic.js","firebase-config.js","jszip.min.js","manifest.webmanifest","package.json","package-lock.json","capacitor.config.json","sw.js","icon.svg","icon-16.png","icon-32.png","icon-48.png","icon-72.png","icon-96.png","icon-128.png","icon-144.png","icon-180.png","icon-192.png","icon-256.png","icon-384.png","icon-512.png","mycar-plus-logo.png","desenvolvedor.png","about-logo.png","data/MyCarPlus.xlsx"];
  for (const rel of files) { same(rel, path.join("www",rel)); same(rel, path.join("android/app/src/main/assets/public",rel)); }
  return `${files.length} arquivos idênticos`;
});
check("CHK-MANIFEST-001", "Manifesto SHA-256", () => {
  if (mode === "installed") return "dispensado após sincronização";
  const lines=text("MANIFEST_SHA256_V6_06.txt").split(/\r?\n/).filter(Boolean).filter(x=>!x.startsWith("#"));
  requireCond(lines.length > 10, "manifesto vazio ou incompleto");
  for (const line of lines) {
    const m=line.match(/^([a-f0-9]{64})\s+\*(.+)$/i); requireCond(m, `linha inválida: ${line}`);
    const rel=m[2].replace(/\\/g,"/"); requireCond(exists(rel), `ausente: ${rel}`); requireCond(sha(path.join(root,rel))===m[1].toLowerCase(), `hash divergente: ${rel}`);
  }
  return `${lines.length} hashes conferidos`;
});
check("CHK-BAT-001", "BAT V6.06 R2 dentro do pacote", () => {
  const rel="ATUALIZAR_MYCAR_V6_06_KEY_R2.bat"; requireCond(exists(rel), `${rel} ausente`); const bat=text(rel);
  requireCond(bat.includes('set "VERSAO=6.06"'), "variável VERSAO incorreta");
  requireCond(bat.includes("check-update-package.js"), "checklist automático não chamado");
  requireCond(!/findstr\s+\/C:/i.test(bat), "findstr legado ainda presente");
  requireCond(bat.includes('set "REVISAO_ATUALIZADOR=R2"'), "revisão R2 do atualizador ausente");
  requireCond(!bat.includes('for %%P in ('), "limpeza antiga baseada em FOR ainda presente");
  return "sem findstr; checklist Node ativo; limpeza R2";
});
check("CHK-CLEAN-001", "Ausência de resíduos operacionais antigos", () => {
  const forbidden=["ATUALIZAR_MYCAR_V6_05_KEY.bat","VALIDACAO_PACOTE_V6_05_KEY.txt"];
  const found=forbidden.filter(exists);
  requireCond(!found.length, `${mode === "installed" ? "limpeza controlada não removeu" : "resíduos no pacote"}: ${found.join(", ")}`);
  return mode === "installed"
    ? "limpeza controlada confirmada no projeto"
    : "pacote sem artefatos operacionais da V6.05";
});

const failed=results.filter(r=>!r.ok);
const lines=[];
lines.push("============================================================");
lines.push("DIAGNÓSTICO DE MONTAGEM E ATUALIZAÇÃO — MYCAR+ V6.06");
lines.push(`Data: ${new Date().toLocaleString("pt-BR")}`);
lines.push(`Modo: ${mode}`);
lines.push(`Raiz: ${root}`);
lines.push("============================================================");
for (const r of results) lines.push(`[${r.id}][${r.ok?"OK":"ERRO"}] ${r.name}${r.detail?` — ${r.detail}`:""}`);
lines.push("============================================================");
lines.push(failed.length ? `RESULTADO: REPROVADO — ${failed.length} falha(s).` : `RESULTADO: APROVADO — ${results.length} verificações.`);
lines.push(failed.length ? `PRIMEIRA FALHA: ${failed[0].id} — ${failed[0].name} — ${failed[0].detail}` : "Nenhuma falha identificada.");
lines.push("============================================================");
fs.mkdirSync(path.dirname(diagnostic), {recursive:true});
fs.writeFileSync(diagnostic, lines.join("\r\n")+"\r\n", "utf8");
console.log(`Diagnóstico: ${diagnostic}`);
process.exit(failed.length ? 1 : 0);
