"use strict";
const assert = require("assert");
const calc = require("../indicator-calculations.js");

const close = (actual, expected, message) => assert(Math.abs(actual - expected) < 1e-10, `${message}: ${actual} != ${expected}`);
const movements = [
  { grupo: "COMBUSTÍVEL", tanque_completo: "SIM", quantidade_litros: 40, distancia_abastecimento_km: 400, distancia_km: 400, valor: 240, data_hora: "2026-01-01T08:00:00", veiculo: "A", hodometro_km: 1000 },
  { grupo: "COMBUSTÍVEL", tanque_completo: "SIM", quantidade_litros: 50, distancia_abastecimento_km: 0, distancia_km: 0, valor: 300, data_hora: "2026-01-10T22:00:00", veiculo: "A", hodometro_km: 1000 },
  { grupo: "COMBUSTÍVEL", tanque_completo: "NAO", quantidade_litros: 20, distancia_abastecimento_km: 200, distancia_km: 200, valor: 120, data_hora: "2026-01-20T12:00:00", veiculo: "A", hodometro_km: 1200 },
  { grupo: "COMBUSTÍVEL", tanque_completo: "SIM", quantidade_litros: 20, distancia_abastecimento_km: 180, distancia_km: 180, valor: 120, data_hora: "2026-01-31T18:00:00", veiculo: "A", hodometro_km: 1380 },
  { grupo: "MANUTENÇÃO", valor: 300, data_hora: "2026-01-15T12:00:00", veiculo: "A", hodometro_km: 1150 },
  { grupo: "RECEITA", valor: 60, data_hora: "2026-01-25T12:00:00", veiculo: "A", hodometro_km: 1250 },
];
movements.periodFiltered = true;
movements.periodStart = "2026-01-01";
movements.periodEnd = "2026-01-31";

assert.equal(calc.inclusiveDaysBetween("2026-01-01", "2026-01-31"), 31);
assert.equal(calc.inclusiveMonthsBetween("2025-12-15", "2026-02-01"), 3);
assert.equal(calc.coveredDays(movements), 31);
assert.equal(calc.movementConsumption(movements[0]), 10);
assert.equal(calc.movementConsumption(movements[1]), null);
assert.equal(calc.validFuelCycles(movements).length, 2);
close(calc.weightedConsumption(movements), 580 / 60, "consumo ponderado");
close(calc.latestFuelConsumption(movements), 9, "último consumo");

const financial = calc.financialIndicators(900, 600, 31);
assert.equal(financial.costPerKm, 1.5);
close(financial.dailyCost, 900 / 31, "custo diário");
close(financial.monthlyCost, (900 / 31) * 30.44, "custo mensal");
close(calc.annualProjection(900, 31), (900 / 31) * 365, "projeção anual");
assert.equal(calc.percentage(25, 100), 25);
close(calc.percentageChange(110, 100), 10, "variação percentual");
assert.equal(calc.litersFromValuePrice(300, 6), 50);
assert.equal(calc.sumValues([{ valor: 10 }, { valor: 20 }], (row) => row.valor), 30);
assert.deepEqual(calc.aggregateValuesBy([{ key: "A", valor: 10 }, { key: "A", valor: 5 }], (row) => row.key, (row) => row.valor), { A: 15 });
assert.deepEqual(calc.aggregateRecordsBy([{ key: "A", valor: 10 }, { key: "A", valor: 5 }], (row) => row.key, (row) => row.valor), { A: { records: 2, value: 15 } });
assert.equal(calc.signedMovementValue({ grupo: "RECEITA", valor: 20 }), -20);
assert.equal(calc.signedMovementValue({ grupo: "MANUTENÇÃO", valor: 20 }), 20);
assert.deepEqual(calc.aggregateSignedValuesBy([
  { grupo: "MANUTENÇÃO", valor: 100, ano: "2026" },
  { grupo: "RECEITA", valor: 25, ano: "2026" },
], (row) => row.ano), { 2026: 75 });

const totals = calc.financialTotals(movements);
assert.equal(totals.gross, 1080);
assert.equal(totals.income, 60);
assert.equal(totals.net, 1020);
assert.equal(calc.distanceCovered(movements, [{ nome: "A", kmInicial: 900 }]), 780);
const dashboard = calc.dashboardIndicators(movements, [{ nome: "A", kmInicial: 900 }]);
assert.equal(dashboard.net, 1020);
assert.equal(dashboard.km, 780);
close(dashboard.cons, 580 / 60, "consumo do painel");

const participation = calc.fuelParticipation(movements, () => ({ key: "gasolina" }));
assert.equal(participation.total, 130);
assert.equal(participation.byKey.gasolina.sharePercent, 100);
const byFuel = calc.aggregateFuelBy(movements, () => "Gasolina");
close(byFuel.Gasolina.consumption_km_l, 580 / 60, "consumo agregado por combustível");

const categories = calc.categoryCostMetrics([{ name: "A", value: 300 }, { name: "B", value: 100 }], 200, 20);
assert.equal(categories[0].sharePercent, 75);
assert.equal(categories[0].costPerKm, 1.5);
assert.equal(categories[0].costPerDay, 15);

const preview = calc.installmentPreview(100, 3);
assert.equal(preview.regularInstallment, 33.33);
assert.equal(preview.lastInstallment, 33.34);
const allocation = calc.allocationSchedule([
  { id: "r1", grupo: "MANUTENÇÃO", item: "Pneu", valor: 100, data_hora: "2026-01-10", rateio_ativo: true, rateio_qtd_meses: 3, rateio_competencia_inicial: "2026-01" },
], "2026-01-01", "2026-03-31");
assert.equal(allocation.details.length, 3);
assert.equal(allocation.originalInPeriod, 100);
assert.equal(allocation.appropriatedInPeriod, 100);
assert.equal(allocation.summaries[0].installmentValue, 33.33);
assert.equal(allocation.summaries[0].lastInstallmentValue, 33.34);

const oneDay = calc.financialIndicators(100, 50, calc.inclusiveDaysBetween("2026-08-05", "2026-08-05"));
assert.equal(oneDay.days, 1);
assert.equal(oneDay.monthlyCost, 3044);
console.log("VALIDAÇÃO DOS INDICADORES: APROVADA");
console.log("Motor central conferido: finanças, consumo, combustível, gráficos, rateio e projeções.");
