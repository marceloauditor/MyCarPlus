"use strict";
const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
const calc = fs.readFileSync(path.join(root, "indicator-calculations.js"), "utf8");

const requiredFunctions = [
  "dashboardIndicators", "financialIndicators", "financialTotals", "netCost", "competenceNetCost", "groupFinancialRows",
  "sumValues", "aggregateValuesBy", "aggregateRecordsBy", "aggregateSignedValuesBy", "signedMovementValue",
  "movementConsumption", "latestFuelConsumption", "consumptionSummary", "detailedConsumptionSummary", "fuelParticipation",
  "aggregateFuelBy", "categoryCostMetrics", "valuesPerDistance", "valuesPerDay",
  "percentage", "percentageChange", "perDay", "annualProjection", "litersFromValuePrice",
  "installmentPreview", "allocationSchedule",
];
requiredFunctions.forEach((name) => {
  assert(new RegExp(`function\\s+${name}\\s*\\(`).test(calc), `Função central ausente: ${name}`);
  assert(app.includes(`IndicatorCalc.${name}`), `app.js não consome a função central: ${name}`);
});

const forbidden = [
  [/distancia_abastecimento_km[^\n]*\/[^\n]*quantidade_litros/, "consumo unitário duplicado"],
  [/fuelDist\s*\/\s*litros/, "consumo no lançamento duplicado"],
  [/row\.valor\s*\/\s*row\.preco/, "cálculo de litros duplicado"],
  [/value\s*\/\s*price/, "prévia de litros duplicada"],
  [/periodTotal\s*\/\s*inclusiveDays/, "média diária/mensal por grupo duplicada"],
  [/periodStats\.km\s*\/\s*inclusiveDays/, "quilometragem diária duplicada"],
  [/item\.distance_km\s*\/\s*item\.liters/, "consumo por combustível duplicado"],
  [/item\.value\s*\/\s*item\.distance_km/, "custo por combustível/km duplicado"],
  [/\(current\s*\/\s*reference\s*-\s*1\)\s*\*\s*100/, "variação percentual duplicada"],
  [/Math\.floor\(totalCents\s*\/\s*months\)/, "rateio duplicado"],
  [/total\s*\/\s*months/, "parcela mensal duplicada"],
  [/\.map\([^\n]*\/\s*s\.km/, "custo/km em gráfico duplicado"],
  [/\.map\([^\n]*\/\s*s\.days/, "custo/dia em gráfico duplicado"],
  [/executive\.financial\.realized\.net_cost\s*\/\s*indicators\.period\.days/, "projeção anual duplicada"],
  [/totalExpenses\s*-\s*totalIncome/, "custo líquido duplicado no painel"],
  [/gross\s*-\s*income/, "custo líquido duplicado"],
  [/movement\.grupo\s*===\s*"RECEITA"\s*\?\s*-\(/, "valor líquido assinado duplicado"],
  [/periodGross\s*-\s*rateioOriginalInPeriod/, "custo por competência duplicado"],
];
for (const [pattern, description] of forbidden) {
  assert(!pattern.test(app), `Fórmula fora do motor central: ${description}`);
}

assert((app.match(/IndicatorCalc\.allocationSchedule/g) || []).length >= 2, "Relatório e IA devem compartilhar o mesmo rateio central");
assert((app.match(/IndicatorCalc\.groupFinancialRows/g) || []).length >= 2, "Relatório e IA devem compartilhar as médias por grupo");
assert(app.includes("IndicatorCalc.consumptionSummary"), "Relatório deve usar o resumo central de consumo");
assert(app.includes("IndicatorCalc.detailedConsumptionSummary"), "IA deve usar o resumo detalhado central de consumo");

console.log("AUDITORIA DE CENTRALIZAÇÃO: APROVADA");
console.log("Todas as fórmulas de indicadores, consumo, rateio e projeções dos artefatos estão no motor central.");
