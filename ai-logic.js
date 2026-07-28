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
    if (!config?.projectId || !siteKey) {
      throw new Error("Firebase AI Logic ou App Check não configurado.");
    }

    const app = getApps()[0] || initializeApp(config);
    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(siteKey),
      isTokenAutoRefreshEnabled: true,
    });
    const ai = getAI(app, { backend: new GoogleAIBackend() });
    model = getGenerativeModel(ai, {
      model: window.MYCAR_AI_MODEL || "gemini-3.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.2,
      },
    });
  } catch (error) {
    initializationError = error;
    console.error("Firebase AI Logic:", error);
  }
}

function extractJsonObject(text) {
  const clean = String(text || "")
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  try { return JSON.parse(clean); } catch (_) {}
  const first = clean.indexOf("{");
  const last = clean.lastIndexOf("}");
  if (first >= 0 && last > first) return JSON.parse(clean.slice(first, last + 1));
  throw new Error("A análise retornou conteúdo sem JSON válido.");
}

function parseReport(text) {
  const report = extractJsonObject(text);
  const textKeys = [
    "executive_summary", "fuel_analysis", "cost_analysis",
    "maintenance_analysis", "supplier_analysis", "limitations",
  ];
  textKeys.forEach((key) => { report[key] = String(report[key] || "").trim(); });
  report.anomalies = Array.isArray(report.anomalies)
    ? report.anomalies.map(String).filter(Boolean) : [];
  report.recommendations = Array.isArray(report.recommendations)
    ? report.recommendations.map(String).filter(Boolean) : [];
  report.confidence = ["Baixa", "Média", "Alta"].includes(report.confidence)
    ? report.confidence : "Baixa";
  if (!report.executive_summary || !report.cost_analysis || !report.limitations) {
    throw new Error("A análise retornou um formato incompleto.");
  }
  return report;
}


function friendlyAiLimitation(reason = "") {
  const message = String(reason || "").toLowerCase();
  if (message.includes("429") || message.includes("quota") || message.includes("rate limit")) {
    return "A interpretação por Inteligência Artificial não estava disponível porque o limite temporário de utilização do serviço foi atingido. Os cálculos e indicadores locais foram processados normalmente. Tente novamente mais tarde.";
  }
  if (message.includes("network") || message.includes("fetch") || message.includes("internet") || message.includes("timeout")) {
    return "A interpretação por Inteligência Artificial não estava disponível por falha temporária de conexão. Os cálculos e indicadores locais foram processados normalmente.";
  }
  return "A interpretação por Inteligência Artificial não estava disponível nesta tentativa. Os cálculos e indicadores locais foram processados normalmente.";
}

function localFallbackReport(indicators, reason = "") {
  const movements = Number(indicators?.sample?.movements || 0);
  const complete = Number(indicators?.sample?.complete_refuels || 0);
  const incomplete = Number(indicators?.sample?.incomplete_refuels || 0);
  const activeAlerts = (indicators?.alert_snapshot || []).filter((a) => a.active);
  const supplierMissing = Number(indicators?.quality?.missing_supplier || 0);
  const recommendations = [];
  if (activeAlerts.length) recommendations.push("Revisar e tratar os alertas ativos do veículo.");
  if (incomplete) recommendations.push("Completar os próximos registros de abastecimento para elevar a confiabilidade do consumo.");
  if (supplierMissing) recommendations.push("Informar o fornecedor quando disponível para melhorar a análise de custos.");
  recommendations.push("Manter hodômetro, valores e datas atualizados em cada lançamento.");
  return {
    executive_summary: `Relatório calculado localmente com ${movements} movimento(s). A interpretação por IA não pôde ser concluída nesta tentativa.`,
    fuel_analysis: complete
      ? `Há ${complete} abastecimento(s) completo(s) apto(s) ao cálculo de consumo e ${incomplete} incompleto(s) mantido(s) apenas nos custos.`
      : "A amostra não possui abastecimentos completos suficientes para interpretar o consumo em km/L.",
    cost_analysis: "Os valores, custos por grupo, custo por quilômetro e projeções exibidos foram calculados diretamente pelo MyCar+.",
    anomalies: activeAlerts.map((a) => `${a.description}: ${a.status} — ${a.forecast}`),
    maintenance_analysis: activeAlerts.length
      ? `Existem ${activeAlerts.length} alerta(s) ativo(s) que devem ser revisados.`
      : "Não foram identificados alertas ativos no período analisado.",
    supplier_analysis: supplierMissing
      ? `${supplierMissing} registro(s) não possuem fornecedor informado; os demais indicadores permanecem válidos.`
      : "Os registros analisados possuem informação de fornecedor quando aplicável.",
    recommendations,
    limitations: friendlyAiLimitation(reason),
    confidence: "Baixa",
    fallback: true,
  };
}
window.mycarAiAnalyze = async (indicators) => {
  if (initializationError) return localFallbackReport(indicators, initializationError.message);
  if (!model) return localFallbackReport(indicators, "Firebase AI Logic não inicializado.");

  const prompt = `Você é um analista veicular sênior. Responda em português do Brasil, com linguagem executiva, objetiva e use somente os indicadores fornecidos.
Não invente números, diagnósticos mecânicos ou causalidade. Informe quando a amostra for insuficiente.
Abastecimentos incompletos entram nos custos, mas não no consumo em km/L.
O fornecedor é opcional. Se estiver ausente ou a qualidade dessa informação for baixa,
registre isso somente na análise de fornecedores e nas limitações, sem invalidar os demais indicadores.
Quando houver consumo de referência cidade/estrada no veículo, compare o consumo apurado com essa faixa,
sem afirmar qual foi o tipo de percurso.
Retorne exclusivamente JSON válido, sem markdown, com estas chaves:
executive_summary (string), fuel_analysis (string), cost_analysis (string),
anomalies (array de strings), maintenance_analysis (string),
supplier_analysis (string), recommendations (array de strings em ordem de prioridade, começando pela ação mais urgente),
limitations (string) e confidence ("Baixa", "Média" ou "Alta").

INDICADORES:
${JSON.stringify(indicators)}`;

  let lastError;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const request = attempt === 1
        ? prompt
        : `${prompt}\n\nCORREÇÃO OBRIGATÓRIA: a resposta anterior não pôde ser validada. Retorne somente um objeto JSON completo, sem qualquer texto antes ou depois.`;
      const result = await model.generateContent(request);
      return parseReport(result.response.text());
    } catch (error) {
      lastError = error;
      console.warn(`Tentativa ${attempt} da análise inteligente falhou:`, error);
    }
  }
  return localFallbackReport(indicators, lastError?.message || "Resposta inválida do serviço de IA.");
};

initializeAiLogic();
