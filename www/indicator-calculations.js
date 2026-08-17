(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.MyCarIndicators = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const DAY_MS = 86400000;
  const AVG_DAYS_PER_MONTH = 30.44;
  const DAYS_PER_YEAR = 365;
  const DEFAULT_EXPENSE_GROUPS = Object.freeze(["COMBUSTÍVEL", "MANUTENÇÃO", "ADMINISTRATIVO"]);
  const DEFAULT_ALLOCATION_GROUPS = Object.freeze(["MANUTENÇÃO", "ADMINISTRATIVO"]);

  function number(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function positive(value) {
    return Math.max(0, number(value));
  }

  function normalize(value) {
    return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
  }

  function safeDivide(numerator, denominator, fallback = 0) {
    const divisor = number(denominator);
    return divisor !== 0 ? number(numerator) / divisor : fallback;
  }

  function sumValues(source = [], valueResolver = (value) => value) {
    return (Array.isArray(source) ? source : []).reduce(
      (total, value, index) => total + number(valueResolver(value, index)),
      0,
    );
  }

  function aggregateValuesBy(source = [], keyResolver = () => "Não informado", valueResolver = (value) => value) {
    return (Array.isArray(source) ? source : []).reduce((result, value, index) => {
      const key = String(keyResolver(value, index) || "Não informado");
      result[key] = number(result[key]) + number(valueResolver(value, index));
      return result;
    }, {});
  }

  function aggregateRecordsBy(source = [], keyResolver = () => "Não informado", valueResolver = (value) => value) {
    return (Array.isArray(source) ? source : []).reduce((result, value, index) => {
      const key = String(keyResolver(value, index) || "Não informado");
      if (!result[key]) result[key] = { records: 0, value: 0 };
      result[key].records += 1;
      result[key].value += number(valueResolver(value, index));
      return result;
    }, {});
  }

  function signedMovementValue(movement) {
    const value = positive(movement?.valor);
    return normalize(movement?.grupo) === "RECEITA" ? -value : value;
  }

  function aggregateSignedValuesBy(source = [], keyResolver = () => "Não informado") {
    return aggregateValuesBy(source, keyResolver, signedMovementValue);
  }

  function percentage(value, total) {
    return safeDivide(number(value) * 100, total, 0);
  }

  function percentageChange(current, reference) {
    const base = number(reference);
    return base !== 0 ? (number(current) / base - 1) * 100 : Number.NaN;
  }

  function perDistance(value, distanceKm) {
    return safeDivide(value, positive(distanceKm), 0);
  }

  function perDay(value, days) {
    return safeDivide(value, Math.max(1, number(days)), 0);
  }

  function monthlyAverage(value, days) {
    return perDay(value, days) * AVG_DAYS_PER_MONTH;
  }

  function annualProjection(value, days) {
    return perDay(value, days) * DAYS_PER_YEAR;
  }

  function dateKey(value) {
    const key = String(value?.data_hora ?? value ?? "").slice(0, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(key) ? key : "";
  }

  function dateAtNoon(value) {
    const key = dateKey(value);
    return key ? new Date(`${key}T12:00:00`) : null;
  }

  function inclusiveDaysBetween(start, end) {
    const first = dateAtNoon(start);
    const last = dateAtNoon(end);
    if (!first || !last || Number.isNaN(first.getTime()) || Number.isNaN(last.getTime())) return 1;
    return Math.max(1, Math.round((last - first) / DAY_MS) + 1);
  }

  function coveredDays(source = []) {
    if (source?.periodStart && source?.periodEnd) return inclusiveDaysBetween(source.periodStart, source.periodEnd);
    const dates = [...source].map(dateKey).filter(Boolean).sort();
    return dates.length ? inclusiveDaysBetween(dates[0], dates.at(-1)) : 1;
  }

  function inclusiveMonthsBetween(start, end) {
    const first = dateAtNoon(start);
    const last = dateAtNoon(end);
    if (!first || !last) return 1;
    return Math.max(1, (last.getFullYear() - first.getFullYear()) * 12 + last.getMonth() - first.getMonth() + 1);
  }

  function elapsedWholeDays(value, now = Date.now()) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : Math.max(0, Math.floor((number(now) - date.getTime()) / DAY_MS));
  }

  function fuelDistance(movement) {
    return positive(movement?.distancia_abastecimento_km ?? movement?.distancia_km);
  }

  function litersFromValuePrice(value, unitPrice) {
    return safeDivide(positive(value), positive(unitPrice), 0);
  }

  function movementConsumption(movement) {
    const liters = positive(movement?.quantidade_litros);
    const distanceKm = fuelDistance(movement);
    return liters > 0 && distanceKm > 0 ? distanceKm / liters : null;
  }

  function isValidFuelCycle(movement) {
    return movement?.grupo === "COMBUSTÍVEL"
      && normalize(movement?.tanque_completo) === "SIM"
      && movementConsumption(movement) !== null;
  }

  function validFuelCycles(source = []) {
    return [...source].filter(isValidFuelCycle);
  }

  function latestValidFuelCycle(source = []) {
    return validFuelCycles(source).sort((a, b) => String(a?.data_hora || "").localeCompare(String(b?.data_hora || ""))).at(-1) || null;
  }

  function latestFuelConsumption(source = []) {
    const movement = latestValidFuelCycle(source);
    return movement ? movementConsumption(movement) : null;
  }

  function fuelMetrics(source = [], { validOnly = true } = {}) {
    const rows = validOnly ? validFuelCycles(source) : [...source];
    const totals = rows.reduce((result, movement) => {
      const liters = positive(movement?.quantidade_litros);
      const distanceKm = fuelDistance(movement);
      result.distanceKm += distanceKm;
      result.liters += liters;
      result.value += number(movement?.valor);
      result.records += 1;
      return result;
    }, { distanceKm: 0, liters: 0, value: 0, records: 0 });
    return {
      ...totals,
      consumptionKmL: totals.liters > 0 ? totals.distanceKm / totals.liters : 0,
      costPerKm: perDistance(totals.value, totals.distanceKm),
    };
  }

  function weightedConsumption(source = []) {
    const metrics = fuelMetrics(source);
    return metrics.liters > 0 ? metrics.consumptionKmL : null;
  }

  function consumptionSummary(source = [], { monthStart = "", yearStart = "", end = "" } = {}) {
    const all = validFuelCycles(source).sort((a, b) => String(a?.data_hora || "").localeCompare(String(b?.data_hora || "")));
    const inRange = (movement, start) => {
      const key = dateKey(movement);
      return key && (!start || key >= start) && (!end || key <= end);
    };
    const currentMovement = all.at(-1) || null;
    return {
      current: currentMovement ? movementConsumption(currentMovement) : null,
      month: weightedConsumption(all.filter((movement) => inRange(movement, monthStart))),
      year: weightedConsumption(all.filter((movement) => inRange(movement, yearStart))),
      total: weightedConsumption(all),
      currentDate: currentMovement?.data_hora || "",
      records: all.length,
    };
  }

  function fuelMetricsRecord(source = []) {
    const totals = fuelMetrics(source);
    return {
      distance_km: totals.distanceKm,
      liters: totals.liters,
      value: totals.value,
      consumption_km_l: totals.consumptionKmL,
      cost_per_km: totals.costPerKm,
    };
  }

  function detailedConsumptionSummary(source = [], { monthStart = "", yearStart = "", end = "" } = {}) {
    const all = validFuelCycles(source).sort((a, b) => String(a?.data_hora || "").localeCompare(String(b?.data_hora || "")));
    const inRange = (movement, start) => {
      const key = dateKey(movement);
      return key && (!start || key >= start) && (!end || key <= end);
    };
    const currentMovement = all.at(-1) || null;
    return {
      current: { ...fuelMetricsRecord(currentMovement ? [currentMovement] : []), date: currentMovement?.data_hora || "" },
      last_month: fuelMetricsRecord(all.filter((movement) => inRange(movement, monthStart))),
      last_year: fuelMetricsRecord(all.filter((movement) => inRange(movement, yearStart))),
      total_history: fuelMetricsRecord(all),
      valid_cycles: all.length,
    };
  }

  function fuelParticipation(source = [], identityResolver = () => ({ key: "outros" }), knownKeys = ["gasolina", "etanol", "diesel"]) {
    const result = { total: 0, byKey: {} };
    source.forEach((movement) => {
      if (movement?.grupo !== "COMBUSTÍVEL") return;
      const liters = positive(movement?.quantidade_litros);
      if (!(liters > 0)) return;
      const resolved = identityResolver(movement);
      const rawKey = typeof resolved === "string" ? resolved : resolved?.key;
      const key = knownKeys.includes(rawKey) ? rawKey : "outros";
      result.total += liters;
      result.byKey[key] ||= { liters: 0, records: 0, sharePercent: 0 };
      result.byKey[key].liters += liters;
      result.byKey[key].records += 1;
    });
    Object.keys(result.byKey).forEach((key) => {
      result.byKey[key].sharePercent = percentage(result.byKey[key].liters, result.total);
    });
    knownKeys.concat("outros").forEach((key) => {
      result.byKey[key] ||= { liters: 0, records: 0, sharePercent: 0 };
    });
    return result;
  }

  function aggregateFuelBy(source = [], identityResolver = () => ({ key: "Não informado" })) {
    const result = {};
    validFuelCycles(source).forEach((movement) => {
      const resolved = identityResolver(movement);
      const key = typeof resolved === "string" ? resolved : (resolved?.key || "Não informado");
      result[key] ||= { liters: 0, value: 0, distance_km: 0, records: 0 };
      result[key].liters += positive(movement?.quantidade_litros);
      result[key].value += number(movement?.valor);
      result[key].distance_km += fuelDistance(movement);
      result[key].records += 1;
    });
    Object.values(result).forEach((item) => {
      item.consumption_km_l = safeDivide(item.distance_km, item.liters, 0);
      item.cost_per_km = perDistance(item.value, item.distance_km);
    });
    return result;
  }

  function groupTotals(source = []) {
    return [...source].reduce((totals, movement) => {
      const group = movement?.grupo || "OUTROS";
      totals[group] = (totals[group] || 0) + number(movement?.valor);
      return totals;
    }, {});
  }

  function netCost(grossExpenses, income) {
    return number(grossExpenses) - number(income);
  }

  function competenceNetCost(grossExpenses, originalAllocatedValues, appropriatedValues, income) {
    return number(grossExpenses) - number(originalAllocatedValues) + number(appropriatedValues) - number(income);
  }

  function financialTotals(source = [], expenseGroups = DEFAULT_EXPENSE_GROUPS) {
    const groups = groupTotals(source);
    const gross = expenseGroups.reduce((total, group) => total + number(groups[group]), 0);
    const income = number(groups.RECEITA);
    return { groups, gross, income, net: netCost(gross, income) };
  }

  function groupAmount(source = [], group) {
    return [...source].reduce((total, movement) => total + (movement?.grupo === group ? number(movement?.valor) : 0), 0);
  }

  function groupFinancialRows(periodSource = [], historySource = [], definitions = [], days = 1, lastYearStart = "", end = "") {
    const historyInLastYear = historySource.filter((movement) => {
      const key = dateKey(movement);
      return key && (!lastYearStart || key >= lastYearStart) && (!end || key <= end);
    });
    return definitions.map((definition) => {
      const periodTotal = groupAmount(periodSource, definition.key);
      return {
        ...definition,
        daily: perDay(periodTotal, days),
        monthly: monthlyAverage(periodTotal, days),
        annual: groupAmount(historyInLastYear, definition.key),
        total: groupAmount(historySource, definition.key),
        periodTotal,
      };
    });
  }

  function distanceCovered(source = [], vehicles = []) {
    const rows = [...source].filter((movement) => movement?.data_hora);
    if (source?.periodFiltered) return rows.reduce((total, movement) => total + positive(movement?.distancia_km), 0);
    const names = [...new Set(rows.map((movement) => movement?.veiculo).filter(Boolean))];
    if (names.length > 1) {
      return names.reduce((total, name) => total + distanceCovered(rows.filter((movement) => movement?.veiculo === name), vehicles), 0);
    }
    const name = names[0];
    const vehicle = vehicles.find((item) => item?.nome === name);
    const odometers = rows.map((movement) => positive(movement?.hodometro_km)).filter((value) => value > 0);
    const last = odometers.length ? Math.max(...odometers) : 0;
    const initial = positive(vehicle?.kmInicial) || (odometers.length ? Math.min(...odometers) : 0);
    return Math.max(0, last - initial);
  }

  function financialIndicators(netCost, distanceKm, days) {
    const net = number(netCost);
    const distance = positive(distanceKm);
    const covered = Math.max(1, number(days));
    return {
      netCost: net,
      distanceKm: distance,
      days: covered,
      costPerKm: perDistance(net, distance),
      dailyCost: perDay(net, covered),
      monthlyCost: monthlyAverage(net, covered),
    };
  }

  function dashboardIndicators(source = [], vehicles = []) {
    const rows = [...source].filter((movement) => movement?.data_hora);
    const totals = financialTotals(rows);
    const distanceKm = distanceCovered(source, vehicles);
    const days = coveredDays(source);
    const consumptionKmL = weightedConsumption(rows);
    return {
      cost: totals.gross,
      income: totals.income,
      net: totals.net,
      km: distanceKm,
      days,
      cons: consumptionKmL || 0,
      ...financialIndicators(totals.net, distanceKm, days),
    };
  }

  function monthlyCostTrend(source = []) {
    const rows = [...source]
      .filter((movement) => dateKey(movement))
      .sort((a, b) => dateKey(a).localeCompare(dateKey(b)));
    if (rows.length < 2) {
      return { previous: null, recent: null, changePercent: Number.NaN, windowDays: 0, previousStart: "", previousEnd: "", recentStart: "", recentEnd: "" };
    }
    const firstKey = dateKey(rows[0]);
    const lastKey = dateKey(rows.at(-1));
    const totalDays = inclusiveDaysBetween(firstKey, lastKey);
    const windowDays = Math.floor(totalDays / 2);
    if (windowDays < 1) {
      return { previous: null, recent: null, changePercent: Number.NaN, windowDays: 0, previousStart: "", previousEnd: "", recentStart: "", recentEnd: "" };
    }
    const shiftDateKey = (key, offsetDays) => {
      const date = dateAtNoon(key);
      if (!date) return "";
      date.setDate(date.getDate() + offsetDays);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };
    const recentEnd = lastKey;
    const recentStart = shiftDateKey(recentEnd, -(windowDays - 1));
    const previousEnd = shiftDateKey(recentStart, -1);
    const previousStart = shiftDateKey(previousEnd, -(windowDays - 1));
    const inWindow = (movement, start, end) => {
      const key = dateKey(movement);
      return key && key >= start && key <= end;
    };
    const previousRows = rows.filter((movement) => inWindow(movement, previousStart, previousEnd));
    const recentRows = rows.filter((movement) => inWindow(movement, recentStart, recentEnd));
    const previousNet = financialTotals(previousRows).net;
    const recentNet = financialTotals(recentRows).net;
    const previous = monthlyAverage(previousNet, windowDays);
    const recent = monthlyAverage(recentNet, windowDays);
    return {
      previous,
      recent,
      changePercent: previous > 0 ? percentageChange(recent, previous) : Number.NaN,
      windowDays,
      previousStart,
      previousEnd,
      recentStart,
      recentEnd,
    };
  }

  function categoryCostMetrics(groupValues = [], distanceKm = 0, days = 1) {
    const gross = groupValues.reduce((total, row) => total + number(row.value), 0);
    return groupValues.map((row) => ({
      ...row,
      sharePercent: percentage(row.value, gross),
      costPerKm: perDistance(row.value, distanceKm),
      costPerDay: perDay(row.value, days),
    }));
  }

  function valuesPerDistance(values = [], distanceKm = 0) {
    return values.map((value) => perDistance(value, distanceKm));
  }

  function valuesPerDay(values = [], days = 1) {
    return values.map((value) => perDay(value, days));
  }

  function monthIndex(value) {
    const [year, month] = String(value || "").slice(0, 7).split("-").map(Number);
    return Number.isFinite(year) && Number.isFinite(month) ? year * 12 + month - 1 : null;
  }

  function monthKeyFromIndex(index) {
    const year = Math.floor(index / 12);
    const month = index % 12 + 1;
    return `${year}-${String(month).padStart(2, "0")}`;
  }

  function installmentPreview(totalValue, monthsValue) {
    const totalCents = Math.round(positive(totalValue) * 100);
    const months = Math.max(1, Math.min(120, Math.trunc(number(monthsValue)) || 1));
    const baseCents = Math.floor(totalCents / months);
    const lastCents = totalCents - baseCents * (months - 1);
    return {
      total: totalCents / 100,
      months,
      regularInstallment: baseCents / 100,
      lastInstallment: lastCents / 100,
    };
  }

  function allocationSchedule(movements = [], periodStart, periodEnd, allowedGroups = DEFAULT_ALLOCATION_GROUPS) {
    const reportStartMonth = monthIndex(periodStart);
    const reportEndMonth = monthIndex(periodEnd);
    const details = [];
    const summaries = [];
    if (!Number.isFinite(reportStartMonth) || !Number.isFinite(reportEndMonth)) {
      return { details, summaries, originalInPeriod: 0, appropriatedInPeriod: 0 };
    }
    movements
      .filter((movement) => movement?.rateio_ativo && allowedGroups.includes(movement?.grupo))
      .forEach((movement) => {
        const totalCents = Math.round(positive(movement?.valor) * 100);
        const months = Math.max(2, Math.min(120, Math.trunc(number(movement?.rateio_qtd_meses)) || 2));
        const initial = monthIndex(movement?.rateio_competencia_inicial || movement?.data_hora);
        if (!Number.isFinite(initial) || totalCents <= 0) return;
        const baseCents = Math.floor(totalCents / months);
        const movementKey = String(movement?.id || movement?.movimento_id || `${movement?.grupo}|${movement?.item}|${movement?.data_hora}|${movement?.valor}`);
        const usedCompetences = new Set();
        let accumulatedCents = 0;
        let appropriatedCents = 0;
        let considered = 0;
        let paidInstallments = 0;
        let firstCompetence = null;
        let lastCompetence = null;
        let periodFirstCompetence = null;
        let periodLastCompetence = null;
        let lastInstallmentCents = baseCents;
        for (let installment = 1; installment <= months; installment += 1) {
          let competenceIndex = initial + installment - 1;
          let competence = monthKeyFromIndex(competenceIndex);
          let uniqueKey = `${movementKey}|${competence}`;
          while (usedCompetences.has(uniqueKey)) {
            competenceIndex += 1;
            competence = monthKeyFromIndex(competenceIndex);
            uniqueKey = `${movementKey}|${competence}`;
          }
          usedCompetences.add(uniqueKey);
          const installmentCents = installment === months ? totalCents - baseCents * (months - 1) : baseCents;
          lastInstallmentCents = installmentCents;
          if (firstCompetence === null) firstCompetence = competence;
          lastCompetence = competence;
          if (competenceIndex <= reportEndMonth) {
            accumulatedCents += installmentCents;
            paidInstallments += 1;
          }
          if (competenceIndex >= reportStartMonth && competenceIndex <= reportEndMonth) {
            considered += 1;
            appropriatedCents += installmentCents;
            if (periodFirstCompetence === null) periodFirstCompetence = competence;
            periodLastCompetence = competence;
            details.push({
              movement,
              competence,
              competenceIndex,
              installment,
              months,
              original: totalCents / 100,
              installmentValue: installmentCents / 100,
              appropriated: installmentCents / 100,
              balance: Math.max(0, totalCents - accumulatedCents) / 100,
            });
          }
        }
        if (considered > 0) {
          summaries.push({
            movement,
            months,
            considered,
            paidInstallments,
            firstCompetence,
            lastCompetence,
            periodFirstCompetence,
            periodLastCompetence,
            original: totalCents / 100,
            installmentValue: baseCents / 100,
            lastInstallmentValue: lastInstallmentCents / 100,
            paidTotal: accumulatedCents / 100,
            appropriated: appropriatedCents / 100,
            balance: Math.max(0, totalCents - accumulatedCents) / 100,
          });
        }
      });
    details.sort((a, b) => a.competenceIndex - b.competenceIndex || String(a.movement?.grupo).localeCompare(String(b.movement?.grupo), "pt-BR") || String(a.movement?.item).localeCompare(String(b.movement?.item), "pt-BR") || a.installment - b.installment);
    const originalInPeriod = sumValues(summaries, (row) => {
      const key = dateKey(row.movement);
      return key >= periodStart && key <= periodEnd ? positive(row.movement?.valor) : 0;
    });
    const appropriatedInPeriod = sumValues(details, (row) => row.appropriated);
    return { details, summaries, originalInPeriod, appropriatedInPeriod };
  }

  return Object.freeze({
    DAY_MS,
    AVG_DAYS_PER_MONTH,
    DAYS_PER_YEAR,
    DEFAULT_EXPENSE_GROUPS,
    DEFAULT_ALLOCATION_GROUPS,
    number,
    positive,
    normalize,
    safeDivide,
    sumValues,
    aggregateValuesBy,
    aggregateRecordsBy,
    signedMovementValue,
    aggregateSignedValuesBy,
    percentage,
    percentageChange,
    perDistance,
    perDay,
    monthlyAverage,
    annualProjection,
    dateKey,
    inclusiveDaysBetween,
    coveredDays,
    inclusiveMonthsBetween,
    elapsedWholeDays,
    fuelDistance,
    litersFromValuePrice,
    movementConsumption,
    isValidFuelCycle,
    validFuelCycles,
    latestValidFuelCycle,
    latestFuelConsumption,
    fuelMetrics,
    weightedConsumption,
    consumptionSummary,
    fuelMetricsRecord,
    detailedConsumptionSummary,
    fuelParticipation,
    aggregateFuelBy,
    groupTotals,
    netCost,
    competenceNetCost,
    financialTotals,
    groupAmount,
    groupFinancialRows,
    distanceCovered,
    financialIndicators,
    dashboardIndicators,
    monthlyCostTrend,
    categoryCostMetrics,
    valuesPerDistance,
    valuesPerDay,
    monthIndex,
    monthKeyFromIndex,
    installmentPreview,
    allocationSchedule,
  });
});
