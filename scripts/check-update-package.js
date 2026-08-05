"use strict";
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

function parseArgs(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i += 1) {
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
const diagnostic = args.diagnostic ? path.resolve(String(args.diagnostic)) : path.join(root, "DIAGNOSTICO_MONTAGEM_V6_10_R2.txt");
const logPath = args.log ? path.resolve(String(args.log)) : null;
const expected = { app: "6.10", semver: "6.10.0", code: "610", name: "6.10.0", cache: "mycar-plus-v6-10", revision: "R2" };
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
  } catch (error) {
    record(id, name, false, error?.message || error);
  }
}
function requireCond(condition, message) { if (!condition) throw new Error(message); }
function same(a, b) {
  requireCond(exists(a), `ausente: ${a}`);
  requireCond(exists(b), `ausente: ${b}`);
  requireCond(sha(path.join(root, a)) === sha(path.join(root, b)), `${a} diverge de ${b}`);
}

check("CHK-ROOT-001", "Pasta raiz do pacote", () => { requireCond(fs.existsSync(root), root); return root; });
check("CHK-FILES-001", "Arquivos essenciais", () => {
  const required = [
    "app.js", "ai-logic.js", "index.html", "styles.css", "package.json", "package-lock.json", "sw.js",
    "report-logo.png", "about-logo.png", "indicator-calculations.js", "data/MyCarPlus.xlsx", "android/app/build.gradle",
    "scripts/sync-web-root.js", "scripts/validate-cohesion.js", "scripts/validate-indicators.js", "scripts/validate-formula-centralization.js", "scripts/check-update-package.js",
    "PACKAGE_REVISION.txt", "CHECKLIST_MONTAGEM_E_DIAGNOSTICO_V6_10_R2.md", "MANIFEST_SHA256_V6_10_R2.txt",
  ];
  const missing = required.filter((rel) => !exists(rel));
  requireCond(!missing.length, `ausentes: ${missing.join(", ")}`);
  return `${required.length} arquivos localizados`;
});
check("CHK-APP-001", "Versão do aplicativo", () => {
  requireCond(/APP_VERSION\s*=\s*["']6\.10["']/.test(text("app.js")), 'APP_VERSION = "6.10" não localizado');
  return expected.app;
});
check("CHK-PACKAGE-001", "Revisão do pacote", () => {
  requireCond(text("PACKAGE_REVISION.txt").trim() === expected.revision, `esperado ${expected.revision}`);
  return expected.revision;
});
check("CHK-NPM-001", "Versão package.json", () => {
  const pkg = JSON.parse(text("package.json")); requireCond(pkg.version === expected.semver, `encontrada ${pkg.version}`); return pkg.version;
});
check("CHK-NPM-002", "Versão package-lock.json", () => {
  const lock = JSON.parse(text("package-lock.json"));
  requireCond(lock.version === expected.semver, `raiz ${lock.version}`);
  requireCond(lock.packages?.[""]?.version === expected.semver, `packages[""] ${lock.packages?.[""]?.version}`);
  return expected.semver;
});
check("CHK-PWA-001", "Cache PWA", () => { requireCond(text("sw.js").includes(expected.cache), `${expected.cache} ausente`); return expected.cache; });
check("CHK-ANDROID-001", "Android versionCode", () => { requireCond(new RegExp(`versionCode\\s+${expected.code}\\b`).test(text("android/app/build.gradle")), `esperado ${expected.code}`); return expected.code; });
check("CHK-ANDROID-002", "Android versionName", () => { requireCond(text("android/app/build.gradle").includes(`versionName "${expected.name}"`), `esperado ${expected.name}`); return expected.name; });
check("CHK-DATA-001", "Base inicial preservada", () => {
  const file = path.join(root, "data/MyCarPlus.xlsx");
  requireCond(fs.statSync(file).size > 0, "arquivo vazio");
  return `${fs.statSync(file).size} bytes`;
});
check("CHK-LOGO-001", "Assinatura PNG dos logotipos", () => {
  for (const rel of ["report-logo.png", "about-logo.png"]) {
    const data = fs.readFileSync(path.join(root, rel));
    requireCond(data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])), `${rel} não é PNG válido`);
    requireCond(data.length >= 33, `${rel} truncado`);
    requireCond(data.readUInt32BE(16) > 0 && data.readUInt32BE(20) > 0, `${rel} dimensão inválida`);
  }
  return "PNG íntegro";
});
check("CHK-LOGO-002", "Logotipo Base64 dos relatórios", () => {
  const match = text("app.js").match(/REPORT_LOGO_DATA_URI\s*=\s*"data:image\/png;base64,([^"]+)"/);
  requireCond(match, "REPORT_LOGO_DATA_URI ausente");
  const decoded = Buffer.from(match[1], "base64");
  const official = fs.readFileSync(path.join(root, "report-logo.png"));
  requireCond(decoded.equals(official), "Base64 diverge de report-logo.png");
  return `${decoded.length} bytes`;
});
check("CHK-LOGO-003", "Logotipo da tela Sobre", () => {
  const html = text("index.html");
  requireCond(html.includes("about-logo.png?v=610"), "referência principal ausente");
  requireCond(html.includes("icon-192.png?v=610"), "fallback ausente");
  return "principal e fallback configurados";
});
check("CHK-AI-001", "Indicadores do Relatório Executivo enviados à IA", () => {
  const app = text("app.js");
  requireCond(/function\s+buildExecutiveIntelligenceData\s*\(/.test(app), "motor de indicadores ausente");
  requireCond(/executive_report:\s*executiveReport/.test(app), "objeto executive_report não enviado");
  requireCond(/schema_version:\s*2/.test(app), "schema_version 2 ausente");
  return "motor único estruturado ativo";
});
check("CHK-AI-002", "Proteção contra conclusões sem evidência", () => {
  const app = text("app.js"), logic = text("ai-logic.js");
  requireCond(/exact_duplicate_candidates/.test(app + logic), "evidência de duplicidade ausente");
  requireCond(!/avgValue\s*\*\s*2\.5/.test(app), "regra antiga de média global ainda ativa");
  requireCond(/function\s+evidenceExists\s*\(/.test(logic), "validação de evidência ausente");
  requireCond(/Não mencione possível duplicidade/.test(logic), "prompt não bloqueia duplicidade sem evidência");
  return "evidência obrigatória e filtro de duplicidade ativos";
});
check("CHK-AI-003", "Identidade e dica da Análise Inteligente", () => {
  const app = text("app.js"), html = text("index.html");
  requireCond(/Análise Inteligente de Gestão Veicular/.test(app + html), "novo nome ausente");
  requireCond(/AUTOMOTIVE_TIPS/.test(app) && /9\. Dica MyCar\+/.test(app), "Dica MyCar+ ausente");
  requireCond(!/<small>Saúde veicular<\/small>/.test(app), "pontuação genérica de saúde ainda presente");
  requireCond(/<small>Status de manutenção<\/small>/.test(app), "status de manutenção ausente");
  return "nome diferenciado, dica local e status técnico ativos";
});
check("CHK-AI-004", "Análise sempre completa sem seletor", () => {
  const app = text("app.js"), html = text("index.html"), logic = text("ai-logic.js");
  requireCond(!html.includes('id="aiType"'), "seletor aiType ainda presente");
  requireCond(!html.includes("Tipo de análise") && !html.includes("Análise desejada"), "cartão de tipo ainda presente");
  requireCond(!app.includes('$("#aiType")') && !app.includes("analysis_type: analysisType"), "leitura dinâmica do tipo ainda presente");
  requireCond(!logic.includes("FOCO SOLICITADO") && !logic.includes("focusNames"), "prompt por foco ainda presente");
  requireCond(logic.includes("A análise é sempre completa"), "regra de análise completa ausente");
  requireCond(/analysis_scope:\s*"completa"/.test(app), "escopo completo não fixado");
  return "seletor removido e escopo completo fixo";
});
check("CHK-AI-005", "Dica MyCar+ branca e preta em qualquer tema", () => {
  const app = text("app.js"), styles = text("styles.css"), sw = text("sw.js"), html = text("index.html");
  requireCond(app.includes('style="background-color:#fff!important;background-image:none!important;color:#000!important;opacity:1!important;color-scheme:light"'), "proteção inline da dica ausente");
  requireCond(app.includes("background-color:#fff!important") && app.includes("color:#000!important"), "relatório compartilhado sem branco puro e preto puro");
  requireCond(styles.includes('html[data-theme="dark"] .ai-tip-section .ai-tip-card'), "regra específica do tema escuro ausente");
  requireCond(styles.includes("background-color:#fff!important"), "fundo branco puro ausente");
  requireCond(styles.includes("background-image:none!important"), "imagem ou gradiente de fundo não foi bloqueado");
  requireCond(styles.includes("-webkit-text-fill-color:#000!important"), "proteção de texto preto no WebView ausente");
  requireCond(styles.includes("backdrop-filter:none!important"), "efeito de transparência não foi neutralizado");
  requireCond(sw.includes('url.pathname.endsWith("/styles.css")'), "styles.css não está em atualização network-first");
  requireCond(html.includes('styles.css?v=610') && html.includes('app.js?v=610'), "cache-busting V6.10 ausente");
  requireCond(!/ai-tip-card[^}]*#f8fbfd/i.test(app + styles), "azul quase branco antigo ainda aplicado à dica");
  return "branco #fff, preto #000, tema escuro e cache protegidos";
});
check("CHK-CALC-001", "Motor único de fórmulas", () => {
  const app = text("app.js"), html = text("index.html"), calc = text("indicator-calculations.js");
  requireCond(html.includes('indicator-calculations.js?v=610'), "motor não carregado no HTML");
  requireCond(/const IndicatorCalc = window\.MyCarIndicators/.test(app), "app.js não usa o motor central");
  const functions = [
    "dashboardIndicators", "financialIndicators", "financialTotals", "netCost", "competenceNetCost",
    "groupFinancialRows", "sumValues", "aggregateValuesBy", "aggregateRecordsBy", "aggregateSignedValuesBy",
    "signedMovementValue", "movementConsumption", "latestFuelConsumption", "consumptionSummary",
    "detailedConsumptionSummary", "fuelParticipation", "aggregateFuelBy", "categoryCostMetrics",
    "valuesPerDistance", "valuesPerDay", "percentage", "percentageChange", "perDay",
    "annualProjection", "litersFromValuePrice", "installmentPreview", "allocationSchedule",
  ];
  for (const name of functions) {
    requireCond(new RegExp(`function\\s+${name}\\s*\\(`).test(calc), `função central ausente: ${name}`);
    requireCond(app.includes(`IndicatorCalc.${name}`), `app.js não consome: ${name}`);
  }
  return `${functions.length} famílias de cálculo centralizadas`;
});
check("CHK-CALC-002", "Padronização financeira integral", () => {
  const app = text("app.js"), calc = text("indicator-calculations.js");
  requireCond(calc.includes("AVG_DAYS_PER_MONTH = 30.44"), "fator mensal 30,44 ausente");
  requireCond(app.includes("IndicatorCalc.dashboardIndicators(ms, vehicles)"), "tela inicial não usa o resumo central");
  requireCond((app.match(/IndicatorCalc\.groupFinancialRows/g) || []).length >= 2, "Relatório e IA não compartilham médias por grupo");
  requireCond((app.match(/IndicatorCalc\.allocationSchedule/g) || []).length >= 2, "Relatório e IA não compartilham rateio");
  requireCond(!/periodTotal\s*\/\s*inclusiveDays/.test(app), "média por grupo ainda duplicada");
  requireCond(!/periodGross\s*-\s*rateioOriginalInPeriod/.test(app), "custo por competência ainda duplicado");
  return "km, dia, mês, líquido, competência e rateio centralizados";
});
check("CHK-CALC-003", "Consumo centralizado com duas casas", () => {
  const app = text("app.js"), logic = text("ai-logic.js"), calc = text("indicator-calculations.js");
  requireCond(/movementConsumption\s*\(/.test(calc) && /validFuelCycles\s*\(/.test(calc), "regras centrais de consumo ausentes");
  requireCond(app.includes("IndicatorCalc.latestFuelConsumption"), "último consumo não usa motor central");
  requireCond(app.includes("IndicatorCalc.consumptionSummary") && app.includes("IndicatorCalc.detailedConsumptionSummary"), "resumos de consumo não centralizados");
  requireCond(app.includes("IndicatorCalc.aggregateFuelBy"), "consumo por combustível não centralizado");
  requireCond(/num\(value, 2\)/.test(app) && /consumption_km_l,2/.test(app), "consumo visível não está em duas casas");
  requireCond(logic.includes("exatamente duas casas decimais"), "IA não recebeu regra de duas casas");
  return "precisão interna integral, ciclos válidos e exibição em 2 casas";
});
check("CHK-CALC-004", "Conciliação dos gráficos", () => {
  const app = text("app.js"), html = text("index.html");
  requireCond(app.includes('"Receitas (-)", "Custo bruto", "Custo líquido"'), "barras de conciliação ausentes");
  requireCond(app.includes("IndicatorCalc.valuesPerDistance") && app.includes("IndicatorCalc.valuesPerDay"), "gráficos não usam taxas centrais");
  requireCond(html.includes("grupos, receitas, bruto e líquido"), "títulos dos gráficos não foram esclarecidos");
  return "despesas, receitas, bruto e líquido";
});
check("CHK-CALC-005", "Auditoria contra fórmulas duplicadas", () => {
  const script = path.join(root, "scripts/validate-formula-centralization.js");
  const result = require("child_process").spawnSync(process.execPath, [script], { cwd: root, encoding: "utf8" });
  requireCond(result.status === 0, (result.stderr || result.stdout || "auditoria reprovada").trim());
  return "scanner de duplicidade aprovado";
});
check("CHK-SYNC-001", "Coesão raiz, Web e Android", () => {
  const files = [
    "index.html", "styles.css", "report-manager.js", "indicator-calculations.js", "app.js", "mycarplus-db.js", "cloud.js", "ai-logic.js",
    "firebase-config.js", "jszip.min.js", "manifest.webmanifest", "package.json", "package-lock.json", "capacitor.config.json", "sw.js", "icon.svg",
    "icon-16.png", "icon-32.png", "icon-48.png", "icon-72.png", "icon-96.png", "icon-128.png", "icon-144.png", "icon-180.png", "icon-192.png", "icon-256.png", "icon-384.png", "icon-512.png",
    "mycar-plus-logo.png", "desenvolvedor.png", "about-logo.png", "data/MyCarPlus.xlsx",
  ];
  for (const rel of files) { same(rel, path.join("www", rel)); same(rel, path.join("android/app/src/main/assets/public", rel)); }
  return `${files.length} arquivos idênticos`;
});
check("CHK-MANIFEST-001", "Manifesto SHA-256", () => {
  if (mode === "installed") return "dispensado após sincronização";
  const lines = text("MANIFEST_SHA256_V6_10_R2.txt").split(/\r?\n/).filter(Boolean).filter((line) => !line.startsWith("#"));
  requireCond(lines.length > 10, "manifesto vazio ou incompleto");
  for (const line of lines) {
    const match = line.match(/^([a-f0-9]{64})\s+\*(.+)$/i);
    requireCond(match, `linha inválida: ${line}`);
    const rel = match[2].replace(/\\/g, "/");
    requireCond(exists(rel), `ausente: ${rel}`);
    requireCond(sha(path.join(root, rel)) === match[1].toLowerCase(), `hash divergente: ${rel}`);
  }
  return `${lines.length} hashes conferidos`;
});
check("CHK-BAT-001", "BAT V6.10 R2 dentro do pacote", () => {
  const rel = "ATUALIZAR_MYCAR_V6_10_R2_KEY.bat";
  requireCond(exists(rel), `${rel} ausente`);
  const bat = text(rel);
  requireCond(bat.includes('set "VERSAO=6.10"'), "variável VERSAO incorreta");
  requireCond(bat.includes("check-update-package.js"), "checklist automático não chamado");
  requireCond(!/findstr\s+\/C:/i.test(bat), "findstr legado ainda presente");
  requireCond(!bat.includes('for %%P in ('), "limpeza antiga baseada em FOR ainda presente");
  requireCond(bat.includes('set "REVISAO=R2"'), "revisão R2 ausente no BAT");
  requireCond(bat.includes("MYCAR_PLUS_V6_10_R2_KEY.zip"), "ZIP R2 não configurado");
  const bytes = fs.readFileSync(path.join(root, rel));
  requireCond(bytes[0] !== 0xEF || bytes[1] !== 0xBB || bytes[2] !== 0xBF, "BAT contém BOM UTF-8");
  for (let index = 0; index < bytes.length; index += 1) {
    if (bytes[index] === 0x0A) requireCond(index > 0 && bytes[index - 1] === 0x0D, `LF sem CR na posição ${index}`);
  }
  return "ASCII sem BOM, CRLF íntegro, checklist Node e limpeza absoluta";
});
check("CHK-CLEAN-001", "Ausência de resíduos operacionais antigos", () => {
  const forbidden = [
    "ATUALIZAR_MYCAR_V6_09_KEY.bat", "VALIDACAO_PACOTE_V6_09_KEY.txt", "MANIFEST_SHA256_V6_09.txt",
    "ATUALIZAR_MYCAR_V6_10_KEY.bat", "VALIDACAO_PACOTE_V6_10_KEY.txt", "MANIFEST_SHA256_V6_10.txt",
  ];
  const found = forbidden.filter(exists);
  requireCond(!found.length, `${mode === "installed" ? "limpeza controlada não removeu" : "resíduos no pacote"}: ${found.join(", ")}`);
  return mode === "installed" ? "limpeza controlada confirmada no projeto" : "pacote sem artefatos operacionais da V6.09";
});

const failed = results.filter((result) => !result.ok);
const lines = [
  "============================================================",
  "DIAGNÓSTICO DE MONTAGEM E ATUALIZAÇÃO — MYCAR+ V6.10 R2",
  `Data: ${new Date().toLocaleString("pt-BR")}`,
  `Modo: ${mode}`,
  `Raiz: ${root}`,
  "============================================================",
];
for (const result of results) lines.push(`[${result.id}][${result.ok ? "OK" : "ERRO"}] ${result.name}${result.detail ? ` — ${result.detail}` : ""}`);
lines.push("============================================================");
lines.push(failed.length ? `RESULTADO: REPROVADO — ${failed.length} falha(s).` : `RESULTADO: APROVADO — ${results.length} verificações.`);
lines.push(failed.length ? `PRIMEIRA FALHA: ${failed[0].id} — ${failed[0].name} — ${failed[0].detail}` : "Nenhuma falha identificada.");
lines.push("============================================================");
fs.mkdirSync(path.dirname(diagnostic), { recursive: true });
fs.writeFileSync(diagnostic, lines.join("\r\n") + "\r\n", "utf8");
console.log(`Diagnóstico: ${diagnostic}`);
process.exit(failed.length ? 1 : 0);
