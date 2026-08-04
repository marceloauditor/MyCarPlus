import { getApps, initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import {
  initializeAppCheck,
  ReCaptchaV3Provider,
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app-check.js";
import {
  getAI,
  getGenerativeModel,
  GoogleAIBackend,
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-ai.js";

let model;
let initializationError;

function initializeAiLogic() {
  try {
    const config = window.FIREBASE_CONFIG;
    const siteKey = String(window.MYCAR_RECAPTCHA_SITE_KEY || "").trim();
    if (!config?.projectId || !siteKey) throw new Error("Firebase AI Logic ou App Check não configurado.");
    const app = getApps()[0] || initializeApp(config);
    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(siteKey),
      isTokenAutoRefreshEnabled: true,
    });
    const ai = getAI(app, { backend: new GoogleAIBackend() });
    model = getGenerativeModel(ai, {
      model: window.MYCAR_AI_MODEL || "gemini-3.5-flash",
      generationConfig: { responseMimeType: "application/json", temperature: 0.15 },
    });
  } catch (error) {
    initializationError = error;
    console.error("Firebase AI Logic:", error);
  }
}

function extractJsonObject(text) {
  const clean = String(text || "").trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try { return JSON.parse(clean); } catch (_) {}
  const first = clean.indexOf("{");
  const last = clean.lastIndexOf("}");
  if (first >= 0 && last > first) return JSON.parse(clean.slice(first, last + 1));
  throw new Error("A análise retornou conteúdo sem JSON válido.");
}

function normalizeAnomaly(item) {
  if (typeof item === "string") return { level: "Atenção", description: item.trim(), evidence: "" };
  return {
    level: ["Crítico", "Atenção", "Informativo"].includes(item?.level) ? item.level : "Atenção",
    description: String(item?.description || item?.text || "").trim(),
    evidence: String(item?.evidence || "").trim(),
  };
}

function normalizeRecommendation(item, index) {
  if (typeof item === "string") return {
    priority: index === 0 ? "Média" : "Baixa", recommendation: item.trim(), evidence: "", impact: "Melhoria operacional",
  };
  return {
    priority: ["Alta", "Média", "Baixa"].includes(item?.priority) ? item.priority : "Média",
    recommendation: String(item?.recommendation || item?.text || "").trim(),
    evidence: String(item?.evidence || "").trim(),
    impact: String(item?.impact || "").trim(),
  };
}

function parseReport(text) {
  const report = extractJsonObject(text);
  const textKeys = ["executive_summary", "fuel_analysis", "cost_analysis", "maintenance_analysis", "supplier_analysis", "limitations"];
  textKeys.forEach((key) => { report[key] = String(report[key] || "").trim(); });
  report.anomalies = (Array.isArray(report.anomalies) ? report.anomalies : []).map(normalizeAnomaly).filter((item) => item.description);
  report.recommendations = (Array.isArray(report.recommendations) ? report.recommendations : []).map(normalizeRecommendation).filter((item) => item.recommendation);
  if (!report.executive_summary || !report.cost_analysis || !report.limitations) throw new Error("A análise retornou um formato incompleto.");
  return report;
}

function friendlyAiLimitation(reason = "") {
  const message = String(reason || "").toLowerCase();
  if (message.includes("429") || message.includes("quota") || message.includes("rate limit")) return "A interpretação por Inteligência Artificial não estava disponível porque o limite temporário do serviço foi atingido. Os indicadores locais foram processados normalmente.";
  if (message.includes("network") || message.includes("fetch") || message.includes("internet") || message.includes("timeout")) return "A interpretação por Inteligência Artificial não estava disponível por falha temporária de conexão. Os indicadores locais foram processados normalmente.";
  return "A interpretação por Inteligência Artificial não estava disponível nesta tentativa. Os indicadores locais foram processados normalmente.";
}

function localFallbackReport(indicators, reason = "") {
  const movements = Number(indicators?.sample?.movements || 0);
  const complete = Number(indicators?.sample?.complete_refuels || 0);
  const incomplete = Number(indicators?.sample?.incomplete_refuels || 0);
  const activeAlerts = (indicators?.alert_snapshot || []).filter((item) => item.active);
  const supplierMissing = Number(indicators?.quality?.missing_supplier || 0);
  const recommendations = [];
  if (activeAlerts.length) recommendations.push({ priority: "Alta", recommendation: "Revisar os alertas de manutenção ativos do veículo.", evidence: "executive_report.maintenance.alerts", impact: "Redução de risco de manutenção" });
  if (incomplete) recommendations.push({ priority: "Média", recommendation: "Completar os próximos registros de abastecimento para elevar a confiabilidade do consumo.", evidence: "sample.incomplete_refuels", impact: "Melhoria da qualidade dos indicadores" });
  recommendations.push({ priority: "Baixa", recommendation: "Manter hodômetro, valores, competências e datas atualizados em cada lançamento.", evidence: "executive_report.confidence.basis", impact: "Aprimoramento dos registros" });
  return {
    executive_summary: `Análise local com ${movements} movimento(s). A interpretação por IA não pôde ser concluída nesta tentativa.`,
    fuel_analysis: complete ? `Há ${complete} abastecimento(s) completo(s) apto(s) ao cálculo de consumo e ${incomplete} incompleto(s) mantido(s) apenas nos custos.` : "A amostra não possui abastecimentos completos suficientes para interpretar o consumo em km/L.",
    cost_analysis: "Os valores, custos por grupo, custo por quilômetro, rateios por competência e projeções foram calculados diretamente pelo MyCar+.",
    anomalies: activeAlerts.map((item) => ({ level: /vencid/i.test(`${item.status} ${item.forecast}`) ? "Crítico" : "Atenção", description: `${item.description}: ${item.status} — ${item.forecast}`, evidence: "executive_report.maintenance.alerts" })),
    maintenance_analysis: activeAlerts.length ? `Existem ${activeAlerts.length} alerta(s) ativo(s) que devem ser revisados.` : "Não foram identificados alertas ativos no período analisado.",
    supplier_analysis: supplierMissing ? `Fornecedores não informados: ${supplierMissing} registro(s). Relevância: Baixa. Essa ausência é apenas cadastral.` : "Fornecedores não informados: 0 registro(s). Relevância: Baixa.",
    recommendations,
    limitations: friendlyAiLimitation(reason),
    confidence: indicators?.executive_report?.confidence?.label || "Baixa",
    fallback: true,
  };
}

function combinedText(item) {
  if (typeof item === "string") return item;
  return `${item?.description || ""} ${item?.recommendation || ""} ${item?.evidence || ""}`;
}

function evidenceExists(indicators, evidence) {
  const path = String(evidence || "").trim().split(/[;,]/)[0].replace(/\[(\d+)\]/g, ".$1");
  if (!/^(executive_report|sample|vehicle|quality|fuel|usage|financial|costs_by_group|alert_snapshot)(?:\.|$)/.test(path)) return false;
  let current = indicators;
  for (const part of path.split(".").filter(Boolean)) {
    if (current == null || !(part in Object(current))) return false;
    current = current[part];
  }
  return current !== undefined && current !== null;
}

window.mycarAiAnalyze = async (indicators) => {
  if (initializationError) return localFallbackReport(indicators, initializationError.message);
  if (!model) return localFallbackReport(indicators, "Firebase AI Logic não inicializado.");

  const focusNames = {
    completa: "análise completa",
    combustivel: "combustível e consumo",
    custos: "custos, despesas e rateios",
    manutencao: "manutenções e alertas",
    fornecedores: "qualidade cadastral de fornecedores",
  };
  const focus = focusNames[indicators?.analysis_type] || "análise completa";
  const prompt = `Você é um analista de gestão veicular. Responda em português do Brasil, com linguagem objetiva e prudente.
Os dados em executive_report são os mesmos indicadores estruturados usados pelo Relatório Executivo do MyCar+. Use-os como fonte principal e não recalcule totais por métodos diferentes.
FOCO SOLICITADO: ${focus}. Nas seções fora do foco, seja breve.

REGRAS OBRIGATÓRIAS:
1. Use somente números, fatos e relações presentes nos indicadores. Não invente diagnóstico mecânico, causa, intenção, competência, parcela ou vigência.
2. Não mencione possível duplicidade, pagamento dividido ou repetido sem registro em executive_report.evidence.exact_duplicate_candidates. Datas próximas ou valores altos não constituem evidência.
3. IPVA, licenciamento e seguros são despesas periódicas. Analise rateio e competência quando informados e não os classifique automaticamente como anomalia.
4. Uma recomendação sobre combustível deve ser limitada ao período analisado, citar custo por km e representatividade da amostra e evitar ordem permanente como “sempre abasteça”.
5. Não classifique manutenção como preventiva ou corretiva sem campo explícito. Use os alertas cadastrados, status e histórico fornecidos.
6. Fornecedor é opcional. Sua ausência é apenas cadastral, tem relevância Baixa e não afeta custos, consumo, quilometragem, manutenção ou alertas.
7. Todo ponto de atenção e toda recomendação deve trazer evidence com o caminho ou indicador que a sustenta. Sem evidência suficiente, omita o ponto.
8. A prioridade deve decorrer do risco ou impacto evidenciado, nunca da posição na lista.
9. A confiança é calculada pelo aplicativo em executive_report.confidence; não crie outra classificação.
10. Abastecimentos incompletos entram nos custos, mas não no consumo em km/L.

Retorne exclusivamente JSON válido, sem markdown, com estas chaves:
executive_summary (string), fuel_analysis (string), cost_analysis (string),
anomalies (array de objetos com level: "Crítico"|"Atenção"|"Informativo", description e evidence),
maintenance_analysis (string), supplier_analysis (string),
recommendations (array de objetos com priority: "Alta"|"Média"|"Baixa", recommendation, evidence e impact),
limitations (string).

INDICADORES:
${JSON.stringify(indicators)}`;

  let lastError;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const request = attempt === 1 ? prompt : `${prompt}\n\nCORREÇÃO OBRIGATÓRIA: retorne somente um objeto JSON completo, sem texto antes ou depois.`;
      const result = await model.generateContent(request);
      const report = parseReport(result.response.text());
      const supplierMissing = Number(indicators?.quality?.missing_supplier || 0);
      report.supplier_analysis = supplierMissing ? `Fornecedores não informados: ${supplierMissing} registro(s). Relevância: Baixa. Essa ausência é apenas cadastral e não interfere nos indicadores do veículo.` : "Fornecedores não informados: 0 registro(s). Relevância: Baixa.";
      const supplierPattern = /fornecedor(?:es)?|supplier/i;
      report.anomalies = report.anomalies.filter((item) => !supplierPattern.test(combinedText(item)));
      report.recommendations = report.recommendations.filter((item) => !supplierPattern.test(combinedText(item)));
      const hasExactDuplicates = Boolean(indicators?.quality?.exact_duplicate_candidates?.length);
      if (!hasExactDuplicates) {
        const duplicatePattern = /duplic(?:idade|ado|ada|ação)|pagamento\s+(?:dividido|repetido)/i;
        report.anomalies = report.anomalies.filter((item) => !duplicatePattern.test(combinedText(item)));
        report.recommendations = report.recommendations.filter((item) => !duplicatePattern.test(combinedText(item)));
      }
      report.anomalies = report.anomalies.filter((item) => evidenceExists(indicators, item.evidence)).slice(0, 6);
      report.recommendations = report.recommendations.filter((item) => evidenceExists(indicators, item.evidence)).slice(0, 5);
      report.confidence = indicators?.executive_report?.confidence?.label || "Baixa";
      return report;
    } catch (error) {
      lastError = error;
      console.warn(`Tentativa ${attempt} da análise inteligente falhou:`, error);
    }
  }
  return localFallbackReport(indicators, lastError?.message || "Resposta inválida do serviço de IA.");
};

initializeAiLogic();
