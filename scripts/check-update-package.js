"use strict";
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const cp = require("child_process");
const args = Object.fromEntries(process.argv.slice(2).map((value, index, all) => value.startsWith("--") ? [value.slice(2), all[index + 1] && !all[index + 1].startsWith("--") ? all[index + 1] : true] : null).filter(Boolean));
const root = path.resolve(String(args.root || path.resolve(__dirname, "..")));
const mode = String(args.mode || "package");
const diagnostic = path.resolve(String(args.diagnostic || path.join(root, "DIAGNOSTICO_MONTAGEM_V6_12.txt")));
const logFile = args.log ? path.resolve(String(args.log)) : null;
const results = [];
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
const exists = (rel) => fs.existsSync(path.join(root, rel));
const sha = (rel) => crypto.createHash("sha256").update(fs.readFileSync(path.join(root, rel))).digest("hex");
const requireCond = (condition, message) => { if (!condition) throw new Error(message); };
const same = (a, b) => requireCond(sha(a) === sha(b), `${a} diverge de ${b}`);
function check(code, title, fn) { try { const detail = fn() || "OK"; results.push({ code, title, ok: true, detail }); } catch (error) { results.push({ code, title, ok: false, detail: error.message }); } }

check("CHK-ROOT-001", "Pasta raiz", () => { requireCond(exists("package.json"), "package.json ausente"); return root; });
check("CHK-VERSION-001", "Versões", () => {
  const pkg = JSON.parse(read("package.json")); const lock = JSON.parse(read("package-lock.json")); const app = read("app.js"); const gradle = read("android/app/build.gradle");
  requireCond(pkg.version === "6.12.0" && lock.version === "6.12.0" && lock.packages?.[""]?.version === "6.12.0", "npm deve estar em 6.12.0");
  requireCond(/APP_VERSION\s*=\s*"6\.12"/.test(app), "APP_VERSION 6.12 ausente");
  requireCond(/versionCode\s+612\b/.test(gradle) && gradle.includes('versionName "6.12.0"'), "Android deve estar em 612/6.12.0");
  return "APP 6.12 · npm 6.12.0 · Android 612";
});
check("CHK-PWA-001", "PWA e modo offline", () => {
  const sw = read("sw.js"), html = read("index.html");
  requireCond(sw.includes('mycar-plus-v6-12'), "cache V6.12 ausente");
  requireCond(sw.includes('"indicator-calculations.js"') && sw.includes('"data/MyCarPlus.xlsx"'), "motor ou XLSX fora do APP_SHELL");
  requireCond(sw.includes('www.gstatic.com') && sw.includes('/firebasejs/12.16.0/'), "SDK Firebase não protegido por cache runtime");
  requireCond(html.includes('indicator-calculations.js?v=612') && html.includes('app.js?v=612') && !html.includes('firebase-app-compat'), "HTML/cache-busting incompatível");
  return "motor, XLSX e Firebase runtime protegidos";
});
check("CHK-STARTUP-001", "Inicialização sem tela preta", () => {
  const app = read("app.js");
  requireCond(app.includes("renderAll();\n  evaluateAlerts(true);") && app.includes("hideSplashAfterFirstPanelPaint"), "painel não é renderizado antes de ocultar o splash");
  requireCond(!app.includes('window.addEventListener("load", () => setTimeout(() => document.getElementById("splashScreen")'), "ocultação antiga por temporizador ainda presente");
  return "dados locais renderizados antes da retirada do splash";
});
check("CHK-PERIOD-001", "Período padrão unificado", () => {
  const app = read("app.js"), html = read("index.html");
  requireCond(app.includes("defaultAnalysisRangeForVehicle") && app.includes('start: bounds.first || "", end: currentLocalIsoDate()'), "regra primeiro movimento/data atual ausente");
  requireCond(app.includes("function reportDefaultRange()") && app.includes("function chartDefaultRange()") && app.includes("defaultAnalysisRangeForVehicle(vehicle)"), "Relatório, IA e gráficos não compartilham a regra");
  requireCond(html.includes("Padrão: primeiro movimento do veículo até a data atual."), "orientação visual do período não atualizada");
  return "Executivo, Inteligência e gráficos alinhados";
});
check("CHK-FIREBASE-001", "Firebase modular único", () => {
  const cloud = read("cloud.js"), ai = read("ai-logic.js"), html = read("index.html");
  requireCond(!html.includes("10.12.5") && !cloud.includes("firebase.auth()") && !cloud.includes("firebase.firestore()"), "SDK compat antigo ainda presente");
  requireCond((cloud.match(/firebasejs\/12\.16\.0/g) || []).length >= 3 && ai.includes("firebasejs/12.16.0"), "SDK modular 12.16.0 não unificado");
  requireCond(cloud.includes("persistentLocalCache") && cloud.includes("serverTimestamp"), "persistência modular ou timestamp do servidor ausente");
  return "Auth, Firestore, App Check e IA na geração modular 12.16.0";
});
check("CHK-SAVE-001", "Gravação transacional", () => {
  const app = read("app.js"), cloud = read("cloud.js");
  requireCond(app.includes("commitLocalState") && cloud.includes("mycar_cloud_journal_v1") && cloud.includes("recoverJournal") && cloud.includes("rebuildPendingFromDiff"), "diário/fila/reconstrução incompletos");
  requireCond(cloud.includes("put(journalKey") && cloud.includes("remove(journalKey)"), "diário não envolve a persistência");
  return "estado, diário e fila protegidos";
});
check("CHK-ACCOUNT-001", "Isolamento por Conta Google", () => {
  const app = read("app.js"), cloud = read("cloud.js");
  requireCond(app.includes("dataStorageKey(table, namespace") && app.includes("activateNamespace") && cloud.includes("hasNamespaceData(uid)"), "namespace por usuário ausente");
  requireCond(cloud.includes("Esta Conta Google ainda não possui uma base") && cloud.includes('activateNamespace?.("local")'), "confirmação de conta vazia ou proteção no logout ausente");
  return "espaços locais separados por UID";
});
check("CHK-CONFLICT-001", "Conflitos entre aparelhos", () => {
  const cloud = read("cloud.js");
  requireCond(cloud.includes("foundConflicts") && cloud.includes("resolveConflicts") && cloud.includes("baseVersion"), "controle de conflitos incompleto");
  requireCond(cloud.includes("serverUpdatedAt"), "timestamp confirmado pelo servidor ausente");
  return "conflitos preservados para decisão";
});
check("CHK-SYNC-001", "Sincronização eficiente", () => {
  const cloud = read("cloud.js");
  requireCond(cloud.includes("5 * 60 * 1000") && !cloud.includes("INTERVAL = 30000"), "varredura antiga de 30 segundos ainda presente");
  requireCond(cloud.includes("onSnapshot") && cloud.includes("pendingCount()"), "listeners ou sincronização sob demanda ausentes");
  requireCond(cloud.includes("TOMBSTONE_RETENTION_MS") && cloud.includes("cleanupTombstones"), "limpeza de tombstones ausente");
  return "listeners em tempo real e contingência espaçada";
});
check("CHK-ALERT-001", "Somente alertas atuais", () => {
  const app = read("app.js"), cloud = read("cloud.js");
  requireCond(!app.includes("function migrateToNewAlertModel") && !app.includes('localStorage.setItem("mycar_alert_model"'), "migração antiga de alertas ainda ativa");
  requireCond(app.includes("item.modelVersion === 2") && cloud.includes("purgeLegacyAlerts") && cloud.includes("modelo antigo removido"), "filtro/limpeza do modelo antigo ausente");
  return "modelo antigo eliminado local e remotamente";
});
check("CHK-DATA-001", "Estrutura de dados final", () => {
  const app = read("app.js"), db = read("mycarplus-db.js"), calc = read("indicator-calculations.js");
  requireCond(!read("index.html").includes("incluirIndicadores") && !app.includes("d.incluirIndicadores") && !db.includes('"incluir_indicadores"'), "campo incluir_indicadores ainda operacional");
  requireCond(calc.includes('normalize(movement?.tanque_completo) === "SIM"'), "consumo não exige tanque completo SIM");
  requireCond(exists("data/MyCarPlus.xlsx") && !exists("data/MyCarPlus.restyled.xlsx") && !exists("data/MyCarPlus.restyled.xlsx.inspect.ndjson"), "arquivos de dados duplicados");
  return "campo sem efeito removido e tanque completo estrito";
});
check("CHK-CLEAN-001", "Código e ativos sem resíduos", () => {
  const app = read("app.js"), report = read("report-manager.js");
  for (const name of ["parseCSV", "movementKey", "weightedFuelConsumption", "categoryCostTable", "drawGroupedChart", "chartSeriesFor", "yearlyFor", "drawMonthlyChart", "closeReportViewer", "createReportCoverFile", "shareReportHtmlFromViewer"]) requireCond(!new RegExp(`function\\s+${name}\\s*\\(`).test(app), `função órfã: ${name}`);
  requireCond(!/function\s+fileToBase64\s*\(/.test(report), "fileToBase64 órfã");
  requireCond(!exists("icon.svg") && !exists("mycar-plus-logo.png"), "ativos sem uso ainda presentes");
  return "funções e ativos órfãos removidos";
});
check("CHK-RULES-001", "Regras do Firestore", () => {
  const rules = read("firebase/firestore.rules");
  requireCond(rules.includes("validCommon") && rules.includes("schemaVersion >= 11") && rules.includes("request.resource.data.id == recordId"), "validação estrutural insuficiente");
  return "proprietário, ID, versão e esquema validados";
});
check("CHK-CALC-001", "Indicadores e centralização", () => {
  for (const script of ["scripts/validate-indicators.js", "scripts/validate-formula-centralization.js"]) {
    const run = cp.spawnSync(process.execPath, [path.join(root, script)], { cwd: root, encoding: "utf8" });
    requireCond(run.status === 0, (run.stderr || run.stdout || script).trim());
  }
  return "motor matemático aprovado";
});
check("CHK-STORAGE-001", "Gravação e fila local", () => {
  const script = "scripts/validate-storage-sync.js";
  const run = cp.spawnSync(process.execPath, [path.join(root, script)], { cwd: root, encoding: "utf8" });
  requireCond(run.status === 0, (run.stderr || run.stdout || script).trim());
  return "transação, isolamento, versões e tombstones aprovados";
});
const publicFiles = ["index.html","styles.css","report-manager.js","indicator-calculations.js","app.js","mycarplus-db.js","cloud.js","ai-logic.js","firebase-config.js","jszip.min.js","manifest.webmanifest","sw.js","icon-16.png","icon-32.png","icon-48.png","icon-72.png","icon-96.png","icon-128.png","icon-144.png","icon-180.png","icon-192.png","icon-256.png","icon-384.png","icon-512.png","desenvolvedor.png","about-logo.png","data/MyCarPlus.xlsx"];
check("CHK-COHESION-001", "Raiz, Web e Android", () => {
  for (const rel of publicFiles) { requireCond(exists(rel) && exists(path.join("www", rel)) && exists(path.join("android/app/src/main/assets/public", rel)), `arquivo ausente: ${rel}`); same(rel, path.join("www", rel)); same(rel, path.join("android/app/src/main/assets/public", rel)); }
  for (const stale of ["package.json","package-lock.json","capacitor.config.json","icon.svg","mycar-plus-logo.png","data/MyCarPlus.restyled.xlsx","data/MyCarPlus.restyled.xlsx.inspect.ndjson"]) requireCond(!exists(path.join("www", stale)) && !exists(path.join("android/app/src/main/assets/public", stale)), `resíduo público: ${stale}`);
  return `${publicFiles.length} arquivos idênticos`;
});
check("CHK-BAT-001", "BAT V6.12", () => {
  const rel = "ATUALIZAR_MYCAR_V6_12_KEY.bat"; requireCond(exists(rel), "BAT ausente"); const text = read(rel); const bytes = fs.readFileSync(path.join(root, rel));
  requireCond(text.includes('set "VERSAO=6.12"') && text.includes("MYCAR_PLUS_V6_12_KEY.zip"), "nomes/versão do BAT incorretos");
  for (const stale of ["CORRECAO_BAT_V5_70.txt","VALIDACAO_PACOTE_V5_70_TREE.txt","validation.css","icon.svg","mycar-plus-logo.png","PACKAGE_REVISION.txt","MyCarPlus.restyled.xlsx","MyCarPlus.restyled.xlsx.inspect.ndjson"]) requireCond(text.includes(stale), `limpeza ausente no BAT: ${stale}`);
  requireCond(!(bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf), "BAT contém BOM");
  for (let i = 0; i < bytes.length; i += 1) if (bytes[i] === 0x0a) requireCond(i > 0 && bytes[i - 1] === 0x0d, `LF sem CR na posição ${i}`);
  return "ASCII/UTF-8 sem BOM e CRLF íntegro";
});
check("CHK-MANIFEST-001", "Manifesto SHA-256", () => {
  if (mode === "installed") return "dispensado após instalação";
  const rel = "MANIFEST_SHA256_V6_12.txt"; requireCond(exists(rel), "manifesto ausente");
  const lines = read(rel).split(/\r?\n/).filter((line) => /^[a-f0-9]{64}\s+\*/i.test(line)); requireCond(lines.length > 30, "manifesto incompleto");
  for (const line of lines) { const match = line.match(/^([a-f0-9]{64})\s+\*(.+)$/i); requireCond(exists(match[2]), `ausente: ${match[2]}`); requireCond(sha(match[2]) === match[1].toLowerCase(), `hash divergente: ${match[2]}`); }
  return `${lines.length} hashes conferidos`;
});

const failed = results.filter((item) => !item.ok);
const lines = ["============================================================", "DIAGNÓSTICO DE MONTAGEM E ATUALIZAÇÃO — MYCAR+ V6.12", `Modo: ${mode}`, `Raiz: ${root}`, "============================================================", ...results.map((item) => `[${item.code}][${item.ok ? "OK" : "ERRO"}] ${item.title} — ${item.detail}`), "============================================================", failed.length ? `RESULTADO: REPROVADO — ${failed.length} falha(s).` : `RESULTADO: APROVADO — ${results.length} verificações.`, "============================================================"];
fs.writeFileSync(diagnostic, lines.join("\r\n") + "\r\n"); if (logFile) fs.appendFileSync(logFile, lines.join("\r\n") + "\r\n"); console.log(lines.join("\n")); process.exit(failed.length ? 1 : 0);
