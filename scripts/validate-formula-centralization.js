"use strict";
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");
const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
const calc = fs.readFileSync(path.join(root, "indicator-calculations.js"), "utf8");
const required = [
  "dashboardIndicators", "financialIndicators", "financialTotals", "netCost", "competenceNetCost", "groupFinancialRows",
  "sumValues", "aggregateValuesBy", "aggregateRecordsBy", "signedMovementValue", "movementConsumption", "isValidFuelCycle",
  "validFuelCycles", "latestFuelConsumption", "consumptionSummary", "detailedConsumptionSummary", "fuelParticipation",
  "aggregateFuelBy", "valuesPerDistance", "valuesPerDay", "percentage", "percentageChange", "perDay", "annualProjection",
  "litersFromValuePrice", "installmentPreview", "allocationSchedule",
];
required.forEach((name) => {
  assert(new RegExp(`function\\s+${name}\\s*\\(`).test(calc), `Função central ausente: ${name}`);
  assert(app.includes(`IndicatorCalc.${name}`), `app.js não consome a função central: ${name}`);
});
const forbidden = [
  [/distancia_abastecimento_km[^\n]*\/[^\n]*quantidade_litros/, "consumo unitário duplicado"],
  [/fuelDist\s*\/\s*litros/, "consumo no lançamento duplicado"],
  [/row\.valor\s*\/\s*row\.preco/, "cálculo de litros duplicado"],
  [/periodTotal\s*\/\s*inclusiveDays/, "média por grupo duplicada"],
  [/item\.distance_km\s*\/\s*item\.liters/, "consumo por combustível duplicado"],
  [/Math\.floor\(totalCents\s*\/\s*months\)/, "rateio duplicado"],
  [/totalExpenses\s*-\s*totalIncome/, "custo líquido duplicado"],
  [/periodGross\s*-\s*rateioOriginalInPeriod/, "competência duplicada"],
];
for (const [pattern, description] of forbidden) assert(!pattern.test(app), `Fórmula fora do motor central: ${description}`);
assert(calc.includes('normalize(movement?.tanque_completo) === "SIM"'), "Ciclo válido deve exigir tanque completo igual a SIM");
console.log("AUDITORIA DE CENTRALIZAÇÃO: APROVADA");
