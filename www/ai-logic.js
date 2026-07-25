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

function parseReport(text) {
  const clean = String(text || "")
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  const report = JSON.parse(clean);
  const required = [
    "executive_summary",
    "fuel_analysis",
    "cost_analysis",
    "anomalies",
    "maintenance_analysis",
    "supplier_analysis",
    "recommendations",
    "limitations",
    "confidence",
  ];
  if (!required.every((key) => Object.prototype.hasOwnProperty.call(report, key))) {
    throw new Error("A análise retornou um formato incompleto.");
  }
  report.anomalies = Array.isArray(report.anomalies) ? report.anomalies : [];
  report.recommendations = Array.isArray(report.recommendations) ? report.recommendations : [];
  return report;
}

window.mycarAiAnalyze = async (indicators) => {
  if (initializationError) throw initializationError;
  if (!model) throw new Error("O Firebase AI Logic ainda não foi inicializado.");

  const prompt = `Você é um analista veicular. Responda em português do Brasil e use somente os indicadores fornecidos.
Não invente números, diagnósticos mecânicos ou causalidade. Informe quando a amostra for insuficiente.
Abastecimentos incompletos entram nos custos, mas não no consumo em km/L.
Retorne exclusivamente JSON válido, sem markdown, com estas chaves:
executive_summary (string), fuel_analysis (string), cost_analysis (string),
anomalies (array de strings), maintenance_analysis (string),
supplier_analysis (string), recommendations (array de strings),
limitations (string) e confidence ("Baixa", "Média" ou "Alta").

INDICADORES:
${JSON.stringify(indicators)}`;

  const result = await model.generateContent(prompt);
  return parseReport(result.response.text());
};

initializeAiLogic();
