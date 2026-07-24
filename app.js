const APP_NAME = "MyCar+",
  APP_VERSION = "5.1 Gráficos Gerenciais",
  APP_CREATED = "julho de 2026";
const $ = (s) => document.querySelector(s),
  $$ = (s) => [...document.querySelectorAll(s)];
const money = (n) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    Number(n) || 0,
  );
const num = (n, d = 2) =>
  new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  }).format(Number(n) || 0);
const intFmt = (n) =>
  new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(
    Number(n) || 0,
  );
const TYPES = {
  ABASTECIMENTO: ["COMBUSTÍVEL"],
  DESPESA: ["ADMINISTRATIVA"],
  RECEITA: ["RECEITA"],
  SERVICO: ["MANUTENÇÃO"],
};
let movements = [],
  registers = [],
  drivers = [],
  vehicles = [],
  suppliers = [],
  paymentMethods = [];
const defaults = [
  ["ABASTECIMENTO", "COMBUSTÍVEL", "Etanol", 1],
  ["ABASTECIMENTO", "COMBUSTÍVEL", "Gasolina", 0],
  ["ABASTECIMENTO", "COMBUSTÍVEL", "Diesel", 0],
  ["DESPESA", "ADMINISTRATIVA", "Adesivos/Soleiras", 0],
  ["DESPESA", "ADMINISTRATIVA", "Gorjeta", 0],
  ["DESPESA", "ADMINISTRATIVA", "Impostos (IPVA/DPVAT)", 1],
  ["DESPESA", "ADMINISTRATIVA", "Macaco", 0],
  ["DESPESA", "ADMINISTRATIVA", "Multa", 0],
  ["DESPESA", "ADMINISTRATIVA", "Protetor Solar/Parabrisa", 0],
  ["DESPESA", "ADMINISTRATIVA", "Seguro", 0],
  ["RECEITA", "RECEITA", "Reembolso", 1],
  ["SERVICO", "MANUTENÇÃO", "Bateria", 0],
  ["SERVICO", "MANUTENÇÃO", "Filtro de Ar", 0],
  ["SERVICO", "MANUTENÇÃO", "Filtro de Ar da Cabine", 0],
  ["SERVICO", "MANUTENÇÃO", "Filtro de Combustível", 0],
  ["SERVICO", "MANUTENÇÃO", "Filtro de Óleo", 1],
  ["SERVICO", "MANUTENÇÃO", "Fluido de Freio", 0],
  ["SERVICO", "MANUTENÇÃO", "Fluido Radiador", 0],
  ["SERVICO", "MANUTENÇÃO", "Lava-jato", 0],
  ["SERVICO", "MANUTENÇÃO", "Mão de obra", 0],
  ["SERVICO", "MANUTENÇÃO", "Pneus - Calibragem", 0],
  ["SERVICO", "MANUTENÇÃO", "Troca de Freio", 0],
  ["SERVICO", "MANUTENÇÃO", "Troca de Óleo", 0],
  ["SERVICO", "MANUTENÇÃO", "Vidros/Espelhos", 0],
].map((x, i) => ({
  id: "r" + i,
  tipo: x[0],
  categoria: x[1],
  subcategoria: x[2],
  padrao: !!x[3],
}));
function save(syncCloud = true) {
  localStorage.setItem("mycar_movements_v1", JSON.stringify(movements));
  localStorage.setItem("mycar_registers_v1", JSON.stringify(registers));
  localStorage.setItem("mycar_drivers_v1", JSON.stringify(drivers));
  localStorage.setItem("mycar_vehicles_v1", JSON.stringify(vehicles));
  localStorage.setItem("mycar_suppliers_v1", JSON.stringify(suppliers));
  localStorage.setItem("mycar_payment_methods_v1", JSON.stringify(paymentMethods));
  renderAll();
  if (syncCloud) window.cloudSync?.queueSave();
}
function parseCSV(t) {
  const a = [];
  let r = [],
    f = "",
    q = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i],
      n = t[i + 1];
    if (c === '"') {
      if (q && n === '"') {
        f += '"';
        i++;
      } else q = !q;
    } else if (c === "," && !q) {
      r.push(f);
      f = "";
    } else if ((c === "\n" || c === "\r") && !q) {
      if (c === "\r" && n === "\n") i++;
      r.push(f);
      if (r.some(Boolean)) a.push(r);
      r = [];
      f = "";
    } else f += c;
  }
  return a;
}
function normalizeMovement(o, i = 0) {
  const fuel = (o.subcategoria || "").toLowerCase();
  if (fuel.includes("gas")) o.subcategoria = "Gasolina";
  o.id = o.id || "m" + i;
  o.ordem_lancamento = Number.isFinite(+o.ordem_lancamento)
    ? +o.ordem_lancamento
    : i + 1;
  o.valor = +o.valor || 0;
  o.hodometro_km = +o.hodometro_km || 0;
  o.quantidade_litros = +o.quantidade_litros || null;
  o.preco_unitario = +o.preco_unitario || null;
  o.distancia_km = +o.distancia_km || null;
  const rawVehicle = o.veiculo || o.veiculo_nome || "";
  const vehicleId = String(o.veiculo_id || "").trim();

  // Mantém o nome do movimento exatamente igual ao cadastro oficial.
  // Aceita tanto os IDs oficiais (vei_001/vei_002) quanto os IDs antigos.
  if (
    vehicleId === "vei_002" ||
    vehicleId === "v2" ||
    String(rawVehicle).toUpperCase().includes("SONATA") ||
    String(rawVehicle).includes("Veículo 2")
  ) {
    o.veiculo_id = "vei_002";
    o.veiculo = "Hyundai Sonata";
  } else if (
    vehicleId === "vei_001" ||
    vehicleId === "v1" ||
    String(rawVehicle).toUpperCase().includes("HB20") ||
    !rawVehicle
  ) {
    o.veiculo_id = "vei_001";
    o.veiculo = "Hyundai HB20 1.6";
  } else {
    const registered = vehicles.find((v) => v.id === vehicleId);
    o.veiculo = registered?.nome || rawVehicle;
  }
  o.motorista = o.motorista || drivers[0]?.nome || "N.I.";
  return o;
}
function newestFirst(a, b) {
  const byDate = new Date(b.data_hora || 0) - new Date(a.data_hora || 0);
  return (
    byDate ||
    (+b.ordem_lancamento || 0) - (+a.ordem_lancamento || 0) ||
    String(b.id || "").localeCompare(String(a.id || ""))
  );
}
function movementKey(m) {
  return [
    m.veiculo || "",
    m.tipo || "",
    m.data_hora || "",
    Number(m.hodometro_km) || 0,
    Number(m.valor) || 0,
    m.subcategoria || "",
    m.origem || "",
  ].join("|");
}
async function load() {
  const migrationVersion = "mycarplus-v4-1-interfaces-dataset-tratado";
  const official = await MyCarPlusDB.load();
  const previousVersion = localStorage.getItem("mycar_data_migration");

  // A V3 elimina integralmente qualquer banco local legado na primeira abertura.
  if (previousVersion !== migrationVersion) {
    [
      "mycar_movements_v1","mycar_registers_v1","mycar_drivers_v1",
      "mycar_vehicles_v1","mycar_suppliers_v1","mycar_payment_methods_v1"
    ].forEach(k => localStorage.removeItem(k));
  }

  movements = previousVersion === migrationVersion
    ? (JSON.parse(localStorage.getItem("mycar_movements_v1") || "null") || official.movements)
    : official.movements;
  registers = previousVersion === migrationVersion
    ? (JSON.parse(localStorage.getItem("mycar_registers_v1") || "null") || official.registers)
    : official.registers;
  drivers = previousVersion === migrationVersion
    ? (JSON.parse(localStorage.getItem("mycar_drivers_v1") || "null") || official.drivers)
    : official.drivers;
  vehicles = previousVersion === migrationVersion
    ? (JSON.parse(localStorage.getItem("mycar_vehicles_v1") || "null") || official.vehicles)
    : official.vehicles;
  suppliers = previousVersion === migrationVersion
    ? (JSON.parse(localStorage.getItem("mycar_suppliers_v1") || "null") || official.suppliers)
    : official.suppliers;
  paymentMethods = previousVersion === migrationVersion
    ? (JSON.parse(localStorage.getItem("mycar_payment_methods_v1") || "null") || official.paymentMethods)
    : official.paymentMethods;

  movements = movements.map((m, i) => normalizeMovement(m, i));
  localStorage.setItem("mycar_data_migration", migrationVersion);
  recalculateDistances();
  save(false);
  console.info("Banco oficial MyCarPlus.xlsx carregado", {
    movimentos: movements.length,
    veiculos: vehicles.length,
    hb20: movements.filter(m => m.veiculo_id === "vei_001").length,
    sonata: movements.filter(m => m.veiculo_id === "vei_002").length
  });
}
function vehicleName(id) {
  return (
    vehicles.find((v) => v.id === id)?.nome ||
    id ||
    vehicles[0]?.nome ||
    "Sem veículo"
  );
}
function defaultVehicle() {
  return vehicles.find((v) => v.padrao && v.ativo !== false) || null;
}
function vehicleSummary(v) {
  const ms = movements.filter((m) => m.veiculo === v.nome),
    odos = ms.map((m) => +m.hodometro_km || 0).filter(Boolean),
    last = odos.length ? Math.max(...odos) : +v.kmInicial || 0,
    initial = +v.kmInicial || 0;
  return {
    initial,
    last,
    driven: Math.max(0, last - initial),
    stats: stats(ms),
  };
}
function recalculateDistances() {
  vehicles.forEach((v) => {
    const ms = movements
      .filter((m) => m.veiculo === v.nome && +m.hodometro_km > 0)
      .sort(
        (a, b) =>
          new Date(a.data_hora) - new Date(b.data_hora) ||
          +a.hodometro_km - +b.hodometro_km,
      );
    let prev = +v.kmInicial || 0;
    ms.forEach((m) => {
      const km = +m.hodometro_km || 0;
      m.distancia_km = Math.max(0, km - prev);
      prev = Math.max(prev, km);
    });
    const fuels = ms
      .filter((m) => m.tipo === "ABASTECIMENTO")
      .sort(
        (a, b) =>
          new Date(a.data_hora) - new Date(b.data_hora) ||
          +a.hodometro_km - +b.hodometro_km,
      );
    let prevFuel = +v.kmInicial || 0;
    fuels.forEach((m) => {
      const km = +m.hodometro_km || 0,
        dist = Math.max(0, km - prevFuel);
      m.distancia_abastecimento_km = dist;
      m.consumo_km_l =
        +m.quantidade_litros > 0 && dist > 0
          ? dist / +m.quantidade_litros
          : null;
      prevFuel = Math.max(prevFuel, km);
    });
  });
}
function activeVehicle() {
  return (
    vehicles.find((v) => v.ativo !== false) ||
    defaultVehicle() ||
    vehicles[0] ||
    null
  );
}
function fillVehicleSelects() {
  const active = activeVehicle(),
    vehicleOpts = vehicles
      .map(
        (v) =>
          `<option value="${v.nome}">${v.nome}${v.ativo === false ? " (Inativo)" : " (Ativo)"}</option>`,
      )
      .join(""),
    allOpts = '<option value="">Todos os veículos</option>' + vehicleOpts,
    home = $("#homeVehicle");
  home.innerHTML = active
    ? `<option value="${active.nome}">${active.nome}</option>`
    : '<option value="">Nenhum veículo ativo</option>';
  home.value = active?.nome || "";
  ["movementVehicle"].forEach((id) => {
    const e = $("#" + id),
      old = e.value;
    e.innerHTML = allOpts;
    const valid = vehicles.some((v) => v.nome === old);
    e.value = valid ? old : active?.nome || "";
  });
  ["reportVehicle", "chartVehicle"].forEach((id) => {
    const e = $("#" + id),
      old = e.value;
    e.innerHTML = vehicleOpts;
    const valid = vehicles.some((v) => v.nome === old);
    e.value = valid ? old : active?.nome || vehicles[0]?.nome || "";
  });
}
function fillDrivers() {
  const e = $("#entryForm [name=motorista]");
  e.innerHTML =
    '<option value="">Não informado</option>' +
    drivers
      .map(
        (d) =>
          `<option value="${d.nome}" ${d.padrao ? "selected" : ""}>${d.nome}</option>`,
      )
      .join("");
}

function fillOperationalLists() {
  const f = $("#entryForm");
  if (f.fornecedor) {
    f.fornecedor.innerHTML = '<option value="">Não informado</option>' +
      suppliers.filter(x => x.ativo !== false).map(x => `<option value="${x.nome}">${x.nome}${x.local ? " · " + x.local : ""}</option>`).join("");
  }
  if (f.formaPagamento) {
    f.formaPagamento.innerHTML = '<option value="">Não informado</option>' +
      paymentMethods.filter(x => x.ativo !== false).map(x => `<option value="${x.nome}" ${x.padrao ? "selected" : ""}>${x.nome}</option>`).join("");
  }
}
function filtered(vehicle = "") {
  return vehicle ? movements.filter((m) => m.veiculo === vehicle) : movements;
}
function periodValues(prefix) {
  return {
    start: $("#" + prefix + "Start")?.value || "",
    end: $("#" + prefix + "End")?.value || "",
  };
}
function periodIsValid(prefix) {
  const { start, end } = periodValues(prefix),
    error = $("#" + prefix + "PeriodError");
  if (start && end && end < start) {
    if (error) error.textContent = "A data final não pode ser anterior à data inicial.";
    return false;
  }
  if (error) error.textContent = "";
  return true;
}
function filterByPeriod(ms, prefix) {
  const { start, end } = periodValues(prefix);
  if (!periodIsValid(prefix)) {
    const empty = [];
    empty.periodFiltered = true;
    return empty;
  }
  const result = ms.filter((m) => {
    const date = String(m.data_hora || "").slice(0, 10);
    return date && (!start || date >= start) && (!end || date <= end);
  });
  result.periodFiltered = !!(start || end);
  result.periodStart = start;
  result.periodEnd = end;
  return result;
}
function periodText(prefix) {
  const { start, end } = periodValues(prefix),
    fmt = (date) => date ? new Date(date + "T12:00:00").toLocaleDateString("pt-BR") : "…";
  return start || end ? `${fmt(start)} a ${fmt(end)}` : "Geral";
}
function stats(ms) {
  const valid = ms.filter((m) => m.data_hora),
    cost = valid
      .filter((m) => m.tipo !== "RECEITA")
      .reduce((a, m) => a + (+m.valor || 0), 0),
    income = valid
      .filter((m) => m.tipo === "RECEITA")
      .reduce((a, m) => a + (+m.valor || 0), 0),
    names = [...new Set(valid.map((m) => m.veiculo).filter(Boolean))];
  let km = 0;
  if (ms.periodFiltered) {
    km = valid.reduce((total, m) => total + Math.max(0, +(m.distancia_km || 0)), 0);
  } else if (names.length > 1) {
    km = names.reduce(
      (sum, n) => sum + stats(valid.filter((m) => m.veiculo === n)).km,
      0,
    );
  } else {
    const name = names[0],
      vehicle = vehicles.find((v) => v.nome === name),
      odos = valid.map((m) => +m.hodometro_km || 0).filter((n) => n > 0),
      last = odos.length ? Math.max(...odos) : 0,
      initial = +vehicle?.kmInicial || (odos.length ? Math.min(...odos) : 0);
    km = Math.max(0, last - initial);
  }
  const dates = valid.map((m) => new Date(m.data_hora)),
    selectedDays = ms.periodStart && ms.periodEnd
      ? Math.floor(
          (Date.parse(ms.periodEnd + "T12:00:00") -
            Date.parse(ms.periodStart + "T12:00:00")) /
            86400000,
        ) + 1
      : 0,
    days = selectedDays > 0
      ? selectedDays
      : dates.length
        ? Math.max(1, (Math.max(...dates) - Math.min(...dates)) / 86400000)
        : 1,
    liters = valid
      .filter((m) => m.tipo === "ABASTECIMENTO")
      .reduce((a, m) => a + (+m.quantidade_litros || 0), 0);
  return {
    cost,
    income,
    net: cost - income,
    km,
    days,
    cons: liters ? km / liters : 0,
  };
}
function icon(m) {
  return m.tipo === "ABASTECIMENTO"
    ? "⛽"
    : m.tipo === "SERVICO"
      ? "🔧"
      : m.tipo === "RECEITA"
        ? "↙"
        : "🧾";
}
function item(m, editable = false) {
  return `<article class="item ${m.tipo === "RECEITA" ? "income" : ""}"><div><b>${icon(m)} ${m.subcategoria}</b><small>${new Date(m.data_hora).toLocaleDateString("pt-BR")} · ${m.categoria} · ${m.veiculo || "Sem veículo"}</small></div><div class="amount"><b>${m.tipo === "RECEITA" ? "+" : "-"} ${money(m.valor)}</b><small>${intFmt(m.hodometro_km)} km</small>${editable ? `<div class="movement-actions"><button type="button" class="edit-movement" data-edit-movement="${m.id}">Alterar</button><button type="button" class="delete-movement" data-delete-movement="${m.id}">Excluir</button></div>` : ""}</div></article>`;
}
function insightTrendText(value, positiveIsGood = true) {
  if (!Number.isFinite(value) || Math.abs(value) < 0.05) return { text: "Estável", tone: "neutral", arrow: "→" };
  const improved = positiveIsGood ? value > 0 : value < 0;
  return {
    text: `${value > 0 ? "Subiu" : "Caiu"} ${num(Math.abs(value), 1)}%`,
    tone: improved ? "good" : "warn",
    arrow: value > 0 ? "↑" : "↓",
  };
}
function renderSmartDashboard(ms, s) {
  const ordered = ms.filter((m) => m.data_hora).sort((a, b) => new Date(a.data_hora) - new Date(b.data_hora));
  const midpoint = Math.floor(ordered.length / 2);
  const previous = stats(ordered.slice(0, midpoint));
  const recent = stats(ordered.slice(midpoint));
  const previousCostKm = previous.km ? previous.net / previous.km : 0;
  const recentCostKm = recent.km ? recent.net / recent.km : 0;
  const costDelta = previousCostKm && recentCostKm ? (recentCostKm / previousCostKm - 1) * 100 : NaN;
  const consDelta = previous.cons && recent.cons ? (recent.cons / previous.cons - 1) * 100 : NaN;
  const costTrend = insightTrendText(costDelta, false);
  const consTrend = insightTrendText(consDelta, true);

  const expenses = ordered.filter((m) => m.tipo !== "RECEITA");
  const categoryTotals = expenses.reduce((acc, m) => {
    const key = m.categoria || "Outros";
    acc[key] = (acc[key] || 0) + (+m.valor || 0);
    return acc;
  }, {});
  const categories = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
  const maxCategory = categories[0] || ["Sem dados", 0];
  const maxExpense = [...expenses].sort((a, b) => (+b.valor || 0) - (+a.valor || 0))[0];
  const lastFuel = [...ordered].filter((m) => m.tipo === "ABASTECIMENTO").sort(newestFirst)[0];
  const lastFuelDays = lastFuel ? Math.max(0, Math.floor((Date.now() - new Date(lastFuel.data_hora)) / 86400000)) : null;
  const fuelCount = ordered.filter((m) => m.tipo === "ABASTECIMENTO").length;
  const maintenanceTotal = expenses.filter((m) => m.tipo === "SERVICO" || /manuten/i.test(m.categoria || "")).reduce((a, m) => a + (+m.valor || 0), 0);
  const fuelTotal = expenses.filter((m) => m.tipo === "ABASTECIMENTO").reduce((a, m) => a + (+m.valor || 0), 0);

  const shares = categories.slice(0, 4).map(([name, value]) => ({ name, value, pct: s.cost ? value / s.cost * 100 : 0 }));
  if (categories.length > 4) {
    const rest = categories.slice(4).reduce((a, [, v]) => a + v, 0);
    shares.push({ name: "Outros", value: rest, pct: s.cost ? rest / s.cost * 100 : 0 });
  }

  let score = 70;
  if (Number.isFinite(consDelta)) score += Math.max(-10, Math.min(10, consDelta * 1.5));
  if (Number.isFinite(costDelta)) score += Math.max(-12, Math.min(12, -costDelta));
  if (ordered.length >= 10) score += 5;
  if (fuelCount >= 3) score += 5;
  if (s.km > 0 && s.net >= 0) score += 5;
  score = Math.max(0, Math.min(100, Math.round(score)));
  const classification = score >= 90 ? "Excelente" : score >= 80 ? "Muito bom" : score >= 70 ? "Bom" : score >= 60 ? "Atenção" : "Crítico";
  const scoreTone = score >= 80 ? "good" : score >= 60 ? "neutral" : "warn";

  const bars = shares.length
    ? shares.map((x) => `<div class="insight-bar-row"><div><span>${x.name}</span><strong>${num(x.pct, 1)}%</strong></div><div class="insight-track"><i style="width:${Math.min(100, x.pct)}%"></i></div></div>`).join("")
    : '<p class="insight-empty">Inclua despesas para visualizar a composição dos custos.</p>';

  return `<article class="smart-dashboard">
    <div class="smart-dashboard-head"><div><small>Análise automática</small><strong>Painel inteligente do veículo</strong></div><span class="insight-badge ${scoreTone}">${classification}</span></div>
    <div class="insight-metrics">
      <div><small>Custo total líquido</small><b>${money(s.net)}</b></div>
      <div><small>Custo por km</small><b>${s.km ? money(s.net / s.km) : money(0)}</b></div>
      <div><small>Custo diário</small><b>${money(s.net / s.days)}</b></div>
      <div><small>Consumo médio</small><b>${num(s.cons)} km/L</b></div>
    </div>
    <div class="insight-grid">
      <section><h3>Tendências</h3>
        <p class="insight-status ${consTrend.tone}"><span>${consTrend.arrow}</span><b>Consumo</b><em>${Number.isFinite(consDelta) ? consTrend.text : "Histórico insuficiente"}</em></p>
        <p class="insight-status ${costTrend.tone}"><span>${costTrend.arrow}</span><b>Custo por km</b><em>${Number.isFinite(costDelta) ? costTrend.text : "Histórico insuficiente"}</em></p>
        <p class="insight-status neutral"><span>↔</span><b>Distância</b><em>${intFmt(s.km)} km no período</em></p>
      </section>
      <section><h3>Composição dos custos</h3>${bars}</section>
      <section><h3>Destaques</h3>
        <dl class="insight-list"><div><dt>Maior despesa</dt><dd>${maxExpense ? `${maxExpense.subcategoria || maxExpense.categoria} · ${money(maxExpense.valor)}` : "Sem dados"}</dd></div>
        <div><dt>Categoria de maior custo</dt><dd>${maxCategory[0]}${maxCategory[1] ? ` · ${money(maxCategory[1])}` : ""}</dd></div>
        <div><dt>Combustível</dt><dd>${money(fuelTotal)}</dd></div>
        <div><dt>Manutenção</dt><dd>${money(maintenanceTotal)}</dd></div></dl>
      </section>
      <section><h3>Utilização</h3>
        <dl class="insight-list"><div><dt>Média diária</dt><dd>${num(s.km / s.days)} km/dia</dd></div>
        <div><dt>Abastecimentos</dt><dd>${fuelCount}</dd></div>
        <div><dt>Último abastecimento</dt><dd>${lastFuelDays == null ? "Sem registro" : lastFuelDays === 0 ? "Hoje" : `Há ${lastFuelDays} dia(s)`}</dd></div>
        <div><dt>Lançamentos analisados</dt><dd>${ordered.length}</dd></div></dl>
      </section>
    </div>
    <div class="score-box"><div><small>MyCar Score</small><strong>${score}<span>/100</span></strong><p>Índice gerencial baseado na evolução do consumo, custo por km e qualidade do histórico.</p></div><div class="score-ring" style="--score:${score}"><span>${score}</span></div></div>
  </article>`;
}
function renderHome() {
  const v = $("#homeVehicle").value,
    ms = filtered(v),
    s = stats(ms),
    last = [...ms].sort(
      (a, b) => (+b.hodometro_km || 0) - (+a.hodometro_km || 0),
    )[0],
    lastFuel = [...ms]
      .filter((m) => m.tipo === "ABASTECIMENTO" && +m.quantidade_litros > 0)
      .sort(
        (a, b) =>
          new Date(b.data_hora) - new Date(a.data_hora) ||
          +b.hodometro_km - +a.hodometro_km,
      )[0];
  $("#vehicleName").textContent = v || "Todos os veículos";
  $("#vehicleOdo").textContent = last
    ? intFmt(last.hodometro_km) + " km"
    : "— km";
  $("#netTotal").textContent = money(s.net);
  $("#costKm").textContent = s.km ? money(s.net / s.km) : money(0);
  $("#dailyKm").textContent = num(s.km / s.days) + " km";
  $("#avgConsumption").textContent = num(s.cons) + " km/L";
  $("#lastConsumption").textContent = lastFuel?.consumo_km_l
    ? num(lastFuel.consumo_km_l) + " km/L"
    : "—";
  $("#lastDistance").textContent =
    lastFuel?.distancia_abastecimento_km != null
      ? intFmt(lastFuel.distancia_abastecimento_km) + " km"
      : "—";
  $("#dailyCost").textContent = money(s.net / s.days);
  $("#periodLabel").textContent = `${ms.length} lançamentos`;
  $("#smartInsights").innerHTML = renderSmartDashboard(ms, s);
  $("#vehicleCards").innerHTML = vehicles
    .map((x) => {
      const z = vehicleSummary(x);
      return `<article class="vehicle-card ${x.padrao ? "default" : ""} ${x.ativo === false ? "inactive" : ""}"><div><b>${x.nome}</b><small>${x.ativo === false ? "Inativo · somente consultas" : x.padrao ? "Ativo · veículo padrão" : "Ativo"}</small></div><strong>${intFmt(z.last)} km</strong><span>Inicial ${intFmt(z.initial)} · Rodados ${intFmt(z.driven)} km · ${z.driven ? money(z.stats.net / z.driven) : money(0)}/km</span></article>`;
    })
    .join("");
  $("#recentList").innerHTML =
    [...ms]
      .sort(newestFirst)
      .slice(0, 5)
      .map(item)
      .join("") || '<p class="muted">Nenhum lançamento.</p>';
}
function deleteMovement(id) {
  const m = movements.find((x) => x.id === id);
  if (!m) return;
  const resumo = `${m.subcategoria || m.tipo} de ${new Date(m.data_hora).toLocaleDateString("pt-BR")} no valor de ${money(m.valor)}`;
  if (
    !confirm(
      `Excluir este lançamento?\n\n${resumo}\n\nEsta ação não poderá ser desfeita.`,
    )
  )
    return;
  movements = movements.filter((x) => x.id !== id);
  recalculateDistances();
  save();
}
function renderMovements() {
  const v = $("#movementVehicle").value,
    t = $("#typeFilter").value,
    q = $("#search").value.toLowerCase();
  const ms = filterByPeriod(filtered(v), "movement")
    .filter(
      (m) =>
        (!t || m.tipo === t) &&
        (!q || JSON.stringify(m).toLowerCase().includes(q)),
    )
    .sort(newestFirst);
  $("#movementCount").textContent = `${ms.length} lançamento(s) · Período: ${periodText("movement")}`;
  $("#movementList").innerHTML =
    ms.map((m) => item(m, true)).join("") ||
    '<p class="muted">Nenhum lançamento.</p>';
  $$("[data-edit-movement]").forEach(
    (b) => (b.onclick = () => openEntry(b.dataset.editMovement)),
  );
  $$("[data-delete-movement]").forEach(
    (b) => (b.onclick = () => deleteMovement(b.dataset.deleteMovement)),
  );
}
function groupTotals(ms) {
  const g = { Combustível: 0, Administrativo: 0, Serviços: 0, Receitas: 0 };
  ms.forEach((m) => {
    if (m.tipo === "ABASTECIMENTO") g.Combustível += +m.valor || 0;
    else if (m.tipo === "DESPESA") g.Administrativo += +m.valor || 0;
    else if (m.tipo === "SERVICO") g.Serviços += +m.valor || 0;
    else if (m.tipo === "RECEITA") g.Receitas += +m.valor || 0;
  });
  return g;
}
function categoryCostTable(ms) {
  const s = stats(ms),
    g = groupTotals(ms),
    expenses = [
      ["Combustível", g.Combustível],
      ["Administrativo", g.Administrativo],
      ["Serviços", g.Serviços],
    ],
    totalExpenses = expenses.reduce((a, [, v]) => a + (+v || 0), 0),
    income = +g.Receitas || 0,
    net = totalExpenses - income,
    perKm = (v) => (s.km ? v / s.km : 0),
    perDay = (v) => (s.days ? v / s.days : 0);
  const rows = expenses
    .map(
      ([name, value]) =>
        `<tr><th scope="row">${name}</th><td>${num(totalExpenses ? (value / totalExpenses) * 100 : 0, 1)}%</td><td>${money(value)}</td><td>${money(perKm(value))}</td><td>${money(perDay(value))}</td></tr>`,
    )
    .join("");
  return `<div class="category-table-wrap"><table class="category-cost-table"><thead><tr><th>Categoria</th><th>Participação</th><th>Valor</th><th>Custo/km</th><th>Custo/dia</th></tr></thead><tbody>${rows}<tr class="total-expenses"><th scope="row">Total de gastos</th><td>${totalExpenses ? num(100, 1) + "%" : "0,0%"}</td><td>${money(totalExpenses)}</td><td>${money(perKm(totalExpenses))}</td><td>${money(perDay(totalExpenses))}</td></tr><tr class="income-row"><th scope="row">Receitas</th><td>—</td><td>− ${money(income)}</td><td>− ${money(perKm(income))}</td><td>− ${money(perDay(income))}</td></tr><tr class="net-cost-row"><th scope="row">Custo líquido</th><td>—</td><td>${money(net)}</td><td>${money(perKm(net))}</td><td>${money(perDay(net))}</td></tr></tbody></table></div>`;
}
function renderReports() {
  const ms = filterByPeriod(filtered($("#reportVehicle").value), "report"),
    s = stats(ms);
  $("#reportPeriodLabel").textContent = `Período: ${periodText("report")}`;
  $("#grossTotal").textContent = money(s.cost);
  $("#reportNet").textContent = money(s.net);
  $("#incomeTotal").textContent = money(s.income);
  $("#reportDistance").textContent = intFmt(s.km) + " km";
  const fuels = {};
  ms.filter((m) => m.tipo === "ABASTECIMENTO").forEach((m) => {
    const k = m.subcategoria || "Combustível",
      g = fuels[k] || (fuels[k] = { c: 0, l: 0, d: 0 });
    g.c += +m.valor || 0;
    g.l += +m.quantidade_litros || 0;
    g.d += +(m.distancia_abastecimento_km ?? m.distancia_km) || 0;
  });
  const fuelTotal = Object.values(fuels).reduce(
      (t, g) => ({ c: t.c + g.c, l: t.l + g.l, d: t.d + g.d }),
      { c: 0, l: 0, d: 0 },
    ),
    combined = fuelTotal.l
      ? `<div class="bar fuel-combined"><div><span>Combustíveis: ${num(fuelTotal.d / fuelTotal.l)} km/L</span><b>${money(fuelTotal.d ? fuelTotal.c / fuelTotal.d : 0)}/km</b></div><div class="track"><div class="fill" style="width:100%"></div></div></div>`
      : "";
  $("#fuelBars").innerHTML =
    (Object.entries(fuels)
      .map(
        ([k, g]) =>
          `<div class="bar"><div><span>${k}: ${num(g.l ? g.d / g.l : 0)} km/L</span><b>${money(g.d ? g.c / g.d : 0)}/km</b></div><div class="track"><div class="fill" style="width:${Math.min(100, (g.c / Math.max(...Object.values(fuels).map((x) => x.c), 1)) * 100)}%"></div></div></div>`,
      )
      .join("") + combined) || '<p class="muted">Sem abastecimentos.</p>';
  $("#categoryBars").innerHTML = categoryCostTable(ms);
}
function withTotal(labels, values) {
  return {
    labels: [...labels, "Total"],
    values: [...values, values.reduce((a, v) => a + (+v || 0), 0)],
  };
}
function compactValue(v, format = "money") {
  if (format === "percent") return num(v, 1) + "%";
  const a = Math.abs(v);
  if (a >= 1000000) return "R$ " + num(v / 1000000, 1) + " mi";
  if (a >= 1000) return "R$ " + num(v / 1000, 1) + " mil";
  return money(v);
}
function drawChart(canvas, labels, values, format = "money") {
  const dpr = devicePixelRatio || 1,
    w = canvas.clientWidth || 600,
    h = Math.max(canvas.clientHeight || 300, 300),
    bottom = labels.length > 5 ? 72 : 56;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  const c = canvas.getContext("2d");
  c.scale(dpr, dpr);
  c.clearRect(0, 0, w, h);
  const max = Math.max(...values.map(Math.abs), 1),
    left = 48,
    right = 18,
    bw = (w - left - right) / Math.max(labels.length, 1);
  c.font = "11px system-ui";
  labels.forEach((l, i) => {
    const x = left + i * bw + bw * 0.18,
      y = h - bottom - (Math.abs(values[i]) / max) * (h - bottom - 58),
      bh = h - bottom - y;
    c.fillStyle = values[i] < 0 ? "#1f8a70" : "#246b9e";
    c.fillRect(x, y, Math.max(8, bw * 0.64), bh);
    const valueLabel = compactValue(values[i], format);
    c.font = "800 10px system-ui";
    c.fillStyle = "#ffffff";
    c.textAlign = "center";
    c.fillText(valueLabel, x + Math.max(8, bw * 0.64) / 2, Math.max(16, y - 7));
    c.font = "11px system-ui";
    c.save();
    c.translate(x + Math.max(8, bw * 0.64) / 2, h - bottom + 15);
    if (labels.length > 5 || bw < 72) c.rotate(-Math.PI / 5);
    c.textAlign = labels.length > 5 || bw < 72 ? "right" : "center";
    c.fillText(String(l), 0, 0);
    c.restore();
  });
}
function drawGroupedChart(canvas, labels, series, format = "money") {
  const dpr = devicePixelRatio || 1,
    w = canvas.clientWidth || 600,
    h = Math.max(canvas.clientHeight || 300, 300),
    top = series.length > 2 ? 54 : 38,
    bottom = 72;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  const c = canvas.getContext("2d");
  c.scale(dpr, dpr);
  c.clearRect(0, 0, w, h);
  const all = series.flatMap((x) => x.values),
    max = Math.max(...all.map(Math.abs), 1),
    left = 48,
    right = 18,
    gw = (w - left - right) / Math.max(labels.length, 1),
    barW = Math.max(5, Math.min(26, gw / Math.max(series.length + 1, 2))),
    showValues = true;
  c.font = "10px system-ui";
  labels.forEach((label, i) => {
    series.forEach((ser, j) => {
      const v = +ser.values[i] || 0,
        x = left + i * gw + (gw - series.length * barW) / 2 + j * barW,
        y = h - bottom - (Math.abs(v) / max) * (h - bottom - top),
        bh = h - bottom - y;
      c.fillStyle = ser.active ? "#246b9e" : "#d9822b";
      c.fillRect(x, y, barW * 0.82, bh);
      if (showValues) {
        const valueLabel = compactValue(v, format);
        c.font = "800 10px system-ui";
        c.fillStyle = "#ffffff";
        c.textAlign = "center";
        c.fillText(valueLabel, x + barW * 0.41, Math.max(14, y - 6));
        c.font = "10px system-ui";
      }
    });
    c.fillStyle = "#d8e9f6";
    c.save();
    c.translate(left + i * gw + gw / 2, h - bottom + 16);
    if (gw < 85) c.rotate(-Math.PI / 5);
    c.textAlign = gw < 85 ? "right" : "center";
    c.fillText(String(label), 0, 0);
    c.restore();
  });
  let lx = left,
    ly = 14;
  series.forEach((ser) => {
    const label = ser.name + (ser.active ? " (Ativo)" : " (Inativo)"),
      need = c.measureText(label).width + 30;
    if (lx + need > w - right) {
      lx = left;
      ly += 18;
    }
    c.fillStyle = ser.active ? "#246b9e" : "#d9822b";
    c.fillRect(lx, ly - 9, 10, 10);
    c.fillStyle = "#d8e9f6";
    c.textAlign = "left";
    c.fillText(label, lx + 14, ly);
    lx += need;
  });
  c.textAlign = "center";
}
function chartSeriesFor(vehicle, metric) {
  const ms = filterByPeriod(filtered(vehicle.nome), "chart"),
    s = stats(ms),
    g = groupTotals(ms),
    labels = Object.keys(g),
    raw = Object.values(g).map((v, i) => (labels[i] === "Receitas" ? -v : v));
  let vals = raw;
  if (metric === "km") vals = raw.map((v) => (s.km ? v / s.km : 0));
  if (metric === "day") vals = raw.map((v) => (s.days ? v / s.days : 0));
  return withTotal(labels, vals).values;
}
function yearlyFor(vehicle) {
  const y = {};
  filterByPeriod(filtered(vehicle.nome), "chart").forEach((m) => {
    const k = (m.data_hora || "").slice(0, 4);
    if (k)
      y[k] =
        (y[k] || 0) + (m.tipo === "RECEITA" ? -(+m.valor || 0) : +m.valor || 0);
  });
  return y;
}
function canvasBase(canvas, minHeight = 280) {
  const dpr = devicePixelRatio || 1,
    w = canvas.clientWidth || 600,
    h = Math.max(canvas.clientHeight || minHeight, minHeight);
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  const c = canvas.getContext("2d");
  c.scale(dpr, dpr);
  c.clearRect(0, 0, w, h);
  return { c, w, h };
}
function axisLabel(value, format) {
  if (format === "consumption") return num(value, 1);
  if (format === "km") return intFmt(value);
  if (format === "thousands") return value === 0 ? "R$ 0" : "R$ " + num(value / 1000, value >= 1000 ? 0 : 1) + "k";
  return money(value);
}
function drawLineChart(canvas, labels, values, format = "money", color = "#246b9e", options = {}) {
  const { showYAxisLabels = true, showPointValues = true } = options;
  const { c, w, h } = canvasBase(canvas), left = 58, right = 22, top = 28, bottom = 58,
    plotW = w - left - right, plotH = h - top - bottom,
    max = Math.max(...values.map(Number), 1), min = Math.min(0, ...values.map(Number)), span = Math.max(max - min, 1);
  c.strokeStyle = "#6f8ba166"; c.fillStyle = "#d8e9f6"; c.lineWidth = 1; c.font = "11px system-ui";
  for (let i = 0; i <= 4; i++) {
    const y = top + plotH * i / 4, value = max - span * i / 4;
    c.beginPath(); c.moveTo(left, y); c.lineTo(w - right, y); c.stroke();
    if (showYAxisLabels) { c.textAlign = "right"; c.fillText(axisLabel(value, format), left - 7, y + 4); }
  }
  const points = values.map((value, i) => ({
    x: labels.length === 1 ? left + plotW / 2 : left + plotW * i / Math.max(labels.length - 1, 1),
    y: top + (max - value) / span * plotH,
  }));
  c.strokeStyle = color; c.lineWidth = 3; c.beginPath();
  points.forEach((p, i) => i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)); c.stroke();
  points.forEach((p, i) => {
    c.fillStyle = color; c.beginPath(); c.arc(p.x, p.y, 4, 0, Math.PI * 2); c.fill();
    if (showPointValues) {
      c.fillStyle = "#ffffff"; c.font = "800 11px system-ui"; c.textAlign = "center";
      c.fillText(axisLabel(values[i], format), p.x, Math.max(14, p.y - 10));
    }
    c.fillStyle = "#d8e9f6"; c.font = "11px system-ui";
    c.save(); c.translate(p.x, h - bottom + 18);
    if (labels.length > 6) c.rotate(-Math.PI / 5);
    c.textAlign = labels.length > 6 ? "right" : "center"; c.fillText(labels[i], 0, 0); c.restore();
  });
}
function drawMonthlyChart(canvas, labels, values) {
  const { c, w, h } = canvasBase(canvas, 300), left = 58, right = 18, top = 24, bottom = 70,
    plotH = h - top - bottom, max = Math.max(...values, 1), step = (w - left - right) / Math.max(labels.length, 1);
  c.font = "11px system-ui";
  for (let i = 0; i <= 4; i++) {
    const y = top + plotH * i / 4, value = max * (1 - i / 4);
    c.strokeStyle = "#6f8ba166"; c.beginPath(); c.moveTo(left, y); c.lineTo(w - right, y); c.stroke();
    c.fillStyle = "#d8e9f6"; c.textAlign = "right"; c.fillText(axisLabel(value, "thousands"), left - 7, y + 4);
  }
  values.forEach((value, i) => {
    const barW = Math.max(5, step * .62), x = left + i * step + (step - barW) / 2,
      bh = value / max * plotH, y = top + plotH - bh;
    c.fillStyle = "#246b9e"; c.fillRect(x, y, barW, bh);
    c.fillStyle = "#d8e9f6"; c.save(); c.translate(x + barW / 2, h - bottom + 17);
    if (labels.length > 6) c.rotate(-Math.PI / 5);
    c.textAlign = labels.length > 6 ? "right" : "center"; c.fillText(labels[i], 0, 0); c.restore();
  });
}
function drawDonut(canvas, labels, values) {
  const { c, w, h } = canvasBase(canvas), colors = ["#246b9e", "#d94b4b", "#1f8a70", "#6f8fb3", "#b63b62", "#3f9db8", "#8b6bb1"],
    total = values.reduce((a, n) => a + Math.max(0, n), 0) || 1, radius = Math.min(w, h) * .31, inner = radius * .58,
    cx = w / 2, cy = h / 2, legend = $("#annualDonutLegend");
  let start = -Math.PI / 2;
  values.forEach((value, i) => {
    const angle = Math.max(0, value) / total * Math.PI * 2;
    c.beginPath(); c.moveTo(cx, cy); c.arc(cx, cy, radius, start, start + angle); c.closePath(); c.fillStyle = colors[i % colors.length]; c.fill(); start += angle;
  });
  c.beginPath(); c.arc(cx, cy, inner, 0, Math.PI * 2); c.fillStyle = "#0b2539"; c.fill();
  c.fillStyle = "#ffffff"; c.textAlign = "center"; c.font = "700 13px system-ui"; c.fillText("Custo diário", cx, cy - 4);
  c.font = "800 18px system-ui"; c.fillText(money(values.reduce((a, n) => a + n, 0) / Math.max(values.length, 1)), cx, cy + 20);
  legend.innerHTML = labels.map((label, i) => `<span><i style="background:${colors[i % colors.length]}"></i>${label}: ${money(values[i])}/dia</span>`).join("");
}
function annualChartData(ms) {
  const byYear = {};
  ms.forEach((m) => {
    const year = (m.data_hora || "").slice(0, 4); if (!year) return;
    const item = byYear[year] ||= { net: 0, distance: 0, liters: 0, dates: [] };
    item.net += m.tipo === "RECEITA" ? -(+m.valor || 0) : +m.valor || 0;
    item.dates.push((m.data_hora || "").slice(0, 10));
    if (m.tipo === "ABASTECIMENTO" && +m.quantidade_litros > 0 && +m.distancia_abastecimento_km > 0) {
      item.distance += +m.distancia_abastecimento_km; item.liters += +m.quantidade_litros;
    }
  });
  const years = Object.keys(byYear).sort(), selectedStart = $("#chartStart").value, selectedEnd = $("#chartEnd").value;
  return { years, consumption: years.map(y => byYear[y].liters ? byYear[y].distance / byYear[y].liters : 0), daily: years.map(y => {
    const start = selectedStart && selectedStart.slice(0, 4) === y ? selectedStart : `${y}-01-01`;
    const lastData = byYear[y].dates.sort().at(-1), end = selectedEnd && selectedEnd.slice(0, 4) === y ? selectedEnd : (y === String(new Date().getFullYear()) ? lastData : `${y}-12-31`);
    const days = Math.max(1, Math.round((new Date(end + "T00:00:00") - new Date(start + "T00:00:00")) / 86400000) + 1);
    return byYear[y].net / days;
  }) };
}
function drawMultiLineChart(canvas, labels, series, format = "money") {
  const { c, w, h } = canvasBase(canvas, 300), left = 62, right = 22, top = 42, bottom = 58,
    plotW = w - left - right, plotH = h - top - bottom,
    values = series.flatMap(s => s.values.map(Number)), max = Math.max(...values, 1), min = Math.min(0, ...values), span = Math.max(max - min, 1);
  c.font = "11px system-ui";
  for (let i = 0; i <= 4; i++) {
    const y = top + plotH * i / 4, value = max - span * i / 4;
    c.strokeStyle = "#6f8ba166"; c.beginPath(); c.moveTo(left, y); c.lineTo(w - right, y); c.stroke();
    c.fillStyle = "#d8e9f6"; c.textAlign = "right"; c.fillText(axisLabel(value, format), left - 7, y + 4);
  }
  series.forEach((ser, si) => {
    const points = ser.values.map((value, i) => ({
      x: labels.length === 1 ? left + plotW / 2 : left + plotW * i / Math.max(labels.length - 1, 1),
      y: top + (max - value) / span * plotH,
    }));
    c.strokeStyle = ser.color; c.lineWidth = 3; c.beginPath();
    points.forEach((p, i) => i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)); c.stroke();
    points.forEach(p => { c.fillStyle = ser.color; c.beginPath(); c.arc(p.x, p.y, 4, 0, Math.PI * 2); c.fill(); });
    const lx = left + si * Math.max(120, plotW / Math.max(series.length, 1));
    c.fillStyle = ser.color; c.fillRect(lx, 13, 12, 12); c.fillStyle = "#d8e9f6"; c.textAlign = "left"; c.fillText(ser.name, lx + 17, 23);
  });
  labels.forEach((label, i) => {
    const x = labels.length === 1 ? left + plotW / 2 : left + plotW * i / Math.max(labels.length - 1, 1);
    c.fillStyle = "#d8e9f6"; c.textAlign = "center"; c.fillText(label, x, h - bottom + 20);
  });
}
function annualFinancialData(ms) {
  const byYear = {};
  ms.forEach(m => {
    const y = String(m.data_hora || "").slice(0,4); if (!y) return;
    const o = byYear[y] ||= { gross:0, income:0 };
    if (m.tipo === "RECEITA") o.income += +m.valor || 0; else o.gross += +m.valor || 0;
  });
  const years = Object.keys(byYear).sort();
  return { years, gross: years.map(y=>byYear[y].gross), income: years.map(y=>byYear[y].income), net: years.map(y=>byYear[y].gross-byYear[y].income) };
}
function costCompositionData(ms) {
  const s = stats(ms), g = groupTotals(ms), labels = ["Combustível", "Administrativo", "Manutenção"],
    totals = [g.Combustível, g.Administrativo, g.Serviços];
  const sub = {};
  ms.filter(m => m.tipo !== "RECEITA").forEach(m => {
    const k = m.subcategoria || "Não informado"; sub[k] = (sub[k] || 0) + (+m.valor || 0);
  });
  const top = Object.entries(sub).sort((a,b)=>b[1]-a[1]).slice(0,10);
  return { labels, totals, perKm: totals.map(v=>s.km ? v/s.km : 0), perDay: totals.map(v=>s.days ? v/s.days : 0), topLabels: top.map(x=>x[0]), topValues: top.map(x=>x[1]) };
}
function renderNewCharts(ms) {
  const annual = annualChartData(ms), financial = annualFinancialData(ms), composition = costCompositionData(ms);
  drawLineChart($("#chartAnnualConsumption"), annual.years, annual.consumption, "consumption", "#246b9e");
  const odos = ms.filter(m => +m.hodometro_km > 0).sort((a,b) => new Date(a.data_hora) - new Date(b.data_hora) || +a.hodometro_km - +b.hodometro_km), compact = [];
  odos.forEach(m => { const last = compact.at(-1); if (!last || +last.hodometro_km !== +m.hodometro_km || last.veiculo !== m.veiculo) compact.push(m); });
  let lastYear = "";
  const odoLabels = compact.map(m => { const y=String(new Date(m.data_hora).getFullYear()); if(y===lastYear) return ""; lastYear=y; return y; });
  drawLineChart($("#chartOdometer"), odoLabels, compact.map(m=>+m.hodometro_km), "km", "#246b9e", { showPointValues:false });
  drawMultiLineChart($("#chartAnnualCost"), financial.years, [
    {name:"Custo bruto", values:financial.gross, color:"#d94b4b"},
    {name:"Receitas", values:financial.income, color:"#1f8a70"},
    {name:"Custo líquido", values:financial.net, color:"#246b9e"}
  ], "money");
  drawLineChart($("#chartAnnualDaily"), annual.years, annual.daily, "money", "#d94b4b", { showPointValues:false });
  drawChart($("#chartCategoryKm"), composition.labels, composition.perKm, "money");
  drawChart($("#chartCategoryDay"), composition.labels, composition.perDay, "money");
  drawChart($("#chartCategoryTotal"), composition.labels, composition.totals, "money");
  drawChart($("#chartTopSubcategories"), composition.topLabels, composition.topValues, "money");
}
function renderCharts() {
  const selected = $("#chartVehicle").value,
    allVisible = filterByPeriod(filtered(selected), "chart"),
    validPeriod = periodIsValid("chart");
  $("#chartPeriodLabel").textContent = `Período: ${periodText("chart")}`;
  $("#chartEmpty").hidden = !validPeriod || allVisible.length > 0;
  $("#chartContent").hidden = !validPeriod || allVisible.length === 0;
  if (!validPeriod || !allVisible.length) return;
  renderNewCharts(allVisible);
}

function renderRegisters() {
  const group = $("#registerGroup").value;
  let rows = [];
  if (group === "SUBCATEGORIA")
    rows = registers.map((r) => ({
      id: r.id,
      title: r.subcategoria,
      sub: `${r.tipo} · ${r.categoria}${r.padrao ? " · Padrão" : ""}`,
    }));
  if (group === "MOTORISTA")
    rows = drivers.map((r) => ({
      id: r.id,
      title: r.nome,
      sub: r.padrao ? "Padrão" : "Motorista",
    }));
  if (group === "FORNECEDOR")
    rows = suppliers.map((r) => ({id:r.id,title:r.nome,sub:`${r.local || "Sem local"}${r.ativo === false ? " · Inativo" : ""}`}));
  if (group === "FORMA_PAGAMENTO")
    rows = paymentMethods.map((r) => ({id:r.id,title:r.nome,sub:`${r.padrao ? "Padrão · " : ""}${r.ativo === false ? "Inativa" : "Ativa"}`}));
  if (group === "VEICULO")
    rows = vehicles.map((r) => {
      const z = vehicleSummary(r);
      return {
        id: r.id,
        title: r.nome,
        sub: `${r.ativo === false ? "INATIVO · somente consultas" : r.padrao ? "ATIVO · Padrão" : "ATIVO"} · ${r.placa || "Sem placa"} · Tanque ${num(r.capacidadeTanque || 0,1)} L · Inicial ${intFmt(z.initial)} km · Atual ${intFmt(z.last)} km · Rodados ${intFmt(z.driven)} km`,
      };
    });
  const titles = {SUBCATEGORIA:["Classificação dos lançamentos","Subcategorias"],MOTORISTA:["Veículo e utilização","Motoristas"],VEICULO:["Veículo e utilização","Veículos"],FORNECEDOR:["Fornecedores e pagamentos","Fornecedores"],FORMA_PAGAMENTO:["Fornecedores e pagamentos","Formas de pagamento"]};
  const [eyebrow,title] = titles[group];
  $("#registerEyebrow").textContent = eyebrow;
  $("#registerGroupTitle").textContent = title;
  [["SUBCATEGORIA",registers],["MOTORISTA",drivers],["VEICULO",vehicles],["FORNECEDOR",suppliers],["FORMA_PAGAMENTO",paymentMethods]].forEach(([key,arr]) => $("#count"+key).textContent = arr.length);
  const term = ($("#registerSearch").value || "").trim().toLocaleLowerCase("pt-BR");
  const status = $("#registerStatusFilter").value;
  rows = rows.filter(r => {
    const source = group === "SUBCATEGORIA" ? registers : group === "MOTORISTA" ? drivers : group === "VEICULO" ? vehicles : group === "FORNECEDOR" ? suppliers : paymentMethods;
    const item = source.find(x => x.id === r.id) || {};
    const active = item.ativo !== false;
    return (!term || `${r.title} ${r.sub}`.toLocaleLowerCase("pt-BR").includes(term)) &&
      (status === "TODOS" || (status === "ATIVOS" && active) || (status === "INATIVOS" && !active) || (status === "PADRAO" && item.padrao));
  });
  $("#registerCountText").textContent = `${rows.length} ${rows.length === 1 ? "registro exibido" : "registros exibidos"}`;
  $$("[data-register-group]").forEach(b => b.classList.toggle("active", b.dataset.registerGroup === group));
  $("#registerList").innerHTML =
    rows
      .map(
        (r) =>
          `<article class="register-row"><div><b>${r.title}</b><small>${r.sub}</small></div><div><button data-edit="${r.id}">Alterar</button><button class="danger" data-delete="${r.id}">Excluir</button></div></article>`,
      )
      .join("") || '<p class="muted">Nenhum cadastro.</p>';
  $$("[data-edit]").forEach(
    (b) => (b.onclick = () => openRegister(b.dataset.edit)),
  );
  $$("[data-delete]").forEach(
    (b) => (b.onclick = () => deleteRegister(b.dataset.delete)),
  );
}
function renderAll() {
  fillVehicleSelects();
  fillDrivers();
  fillOperationalLists();
  renderHome();
  renderMovements();
  renderReports();
  renderRegisters();
  setTimeout(renderCharts, 50);
}
function go(id) {
  $$(".page").forEach((p) => p.classList.toggle("active", p.id === id));
  $$("nav button").forEach((b) =>
    b.classList.toggle("active", b.dataset.page === id),
  );
  if (id === "graficos") setTimeout(renderCharts, 50);
}
$$("[data-page]").forEach((b) => (b.onclick = () => go(b.dataset.page)));
$$("[data-go]").forEach((b) => (b.onclick = () => go(b.dataset.go)));
const headerMenu = $("#headerMenu"), menuBtn = $("#menuBtn");
menuBtn.onclick = (event) => {
  event.stopPropagation();
  headerMenu.hidden = !headerMenu.hidden;
  menuBtn.setAttribute("aria-expanded", String(!headerMenu.hidden));
};
$$("[data-menu-page]").forEach((button) => button.onclick = () => {
  headerMenu.hidden = true;
  menuBtn.setAttribute("aria-expanded", "false");
  go(button.dataset.menuPage);
});
document.addEventListener("click", (event) => {
  if (!event.target.closest(".header-menu-wrap")) {
    headerMenu.hidden = true;
    menuBtn.setAttribute("aria-expanded", "false");
  }
});
function fillTypeSelect(select) {
  select.innerHTML = Object.keys(TYPES)
    .map((t) => `<option value="${t}">${t}</option>`)
    .join("");
}
function typeForCategory(category) {
  return (
    Object.entries(TYPES).find(([, cats]) => cats.includes(category))?.[0] ||
    registers.find((r) => r.categoria === category)?.tipo ||
    ""
  );
}
function updateEntryLists() {
  const f = $("#entryForm"),
    oldCategory = f.categoria.value,
    oldSub = f.subcategoria.value,
    categories = [
      ...new Set(registers.map((r) => r.categoria).filter(Boolean)),
    ];
  f.categoria.innerHTML = categories
    .map((c) => `<option>${c}</option>`)
    .join("");
  if (categories.includes(oldCategory)) f.categoria.value = oldCategory;
  const type = typeForCategory(f.categoria.value);
  f.tipo.value = type;
  const rs = registers.filter((r) => r.categoria === f.categoria.value);
  f.subcategoria.innerHTML = rs
    .map(
      (r) => `<option ${r.padrao ? "selected" : ""}>${r.subcategoria}</option>`,
    )
    .join("");
  if (rs.some((r) => r.subcategoria === oldSub)) f.subcategoria.value = oldSub;
  const fuel = type === "ABASTECIMENTO";
  $("#fuelFields").style.display = fuel ? "block" : "none";
  $("#nonFuelValue").style.display = fuel ? "none" : "block";
}
function kmBounds(date, vehicle, excludeId = "") {
  const day = String(date || "").slice(0, 10),
    ms = movements.filter(
      (m) =>
        m.id !== excludeId &&
        m.veiculo === vehicle &&
        +m.hodometro_km > 0 &&
        m.data_hora,
    );
  const previous = ms
    .filter((m) => String(m.data_hora).slice(0, 10) <= day)
    .sort((a, b) => +b.hodometro_km - +a.hodometro_km)[0];
  const next = ms
    .filter((m) => String(m.data_hora).slice(0, 10) > day)
    .sort((a, b) => +a.hodometro_km - +b.hodometro_km)[0];
  return { prev: previous, next };
}
function updateKm() {
  const f = $("#entryForm"),
    id = f.movementId.value,
    current = id ? movements.find((m) => m.id === id) : null,
    v = current
      ? vehicles.find((x) => x.nome === current.veiculo)
      : defaultVehicle(),
    b = kmBounds(f.data.value, v?.nome || "", id),
    base = b.prev?.hodometro_km ?? v?.kmInicial ?? 0;
  $("#lastKm").value = intFmt(base);
  if (!current && !String(f.km.value || "").replace(/\D/g, ""))
    f.km.value = intFmt(base);
  $("#kmRule").textContent = b.next
    ? `Hodômetro permitido: de ${intFmt(base)} a ${intFmt(b.next.hodometro_km)} km.`
    : `O hodômetro não pode ser menor que ${intFmt(base)} km.`;
}
function openEntry(id = "") {
  const f = $("#entryForm"),
    current = id ? movements.find((m) => m.id === id) : null,
    v = current
      ? vehicles.find((x) => x.nome === current.veiculo)
      : defaultVehicle(),
    err = $("#formError");
  f.reset();
  f.movementId.value = id;
  err.textContent = "";
  if (!v || v.ativo === false) {
    alert(
      current
        ? "Lançamentos de veículo inativo estão disponíveis somente para consulta."
        : "Cadastre e defina um veículo ativo como padrão antes de realizar lançamentos.",
    );
    if (!current) {
      go("cadastros");
      $("#registerGroup").value = "VEICULO";
      renderRegisters();
    }
    return;
  }
  $("#entryTitle").textContent = current
    ? "Alterar lançamento"
    : "Novo lançamento";
  $("#entryVehicleName").textContent = v.nome;
  f.data.value = current
    ? String(current.data_hora).slice(0, 10)
    : new Date().toISOString().slice(0, 10);
  updateEntryLists();
  if (current) {
    f.categoria.value = current.categoria;
    updateEntryLists();
    f.subcategoria.value = current.subcategoria;
    f.km.value = intFmt(current.hodometro_km);
    if (current.tipo === "ABASTECIMENTO") {
      f.valor.value = current.valor || "";
      f.litros.value = current.quantidade_litros || "";
      f.precoLitro.value = current.preco_unitario || "";
    } else f.valorComum.value = current.valor || "";
    f.tanqueCompleto.checked = current.tanque_completo !== "NAO";
    f.motorista.value = current.motorista || "";
    f.observacao.value =
      current.observacao === "N.I." ? "" : current.observacao || "";
  }
  fillDrivers();
  fillOperationalLists();
  if (current) {
    f.motorista.value = current.motorista || "";
    f.fornecedor.value = current.fornecedor || current.local || "";
    f.formaPagamento.value = current.forma_pagamento || "";
    f.incluirIndicadores.checked = current.incluir_indicadores !== "NAO";
  }
  updateKm();
  $("#entryDialog").showModal();
}
$("#newEntry").onclick = () => openEntry();
$("#addMovement").onclick = () => openEntry();
$("#entryForm [name=categoria]").onchange = updateEntryLists;
$("#entryForm [name=data]").onchange = () => {
  const f = $("#entryForm");
  if (!f.movementId.value) f.km.value = "";
  updateKm();
};
$("#entryForm [name=km]").oninput = (e) =>
  (e.target.value = intFmt(String(e.target.value).replace(/\D/g, "")));
const moneyFieldNames = ["precoLitro", "valor", "valorComum"];
function moneyInputNumber(value) {
  const digits = String(value ?? "").replace(/\D/g, "");
  return digits ? Number(digits) / 100 : 0;
}
function formatMoneyInput(input) {
  const value = moneyInputNumber(input.value);
  input.value = value ? num(value, 2) : "";
}
moneyFieldNames.forEach((name) => {
  const input = $(`#entryForm [name=${name}]`);
  input.type = "text";
  input.inputMode = "numeric";
  input.addEventListener("input", () => formatMoneyInput(input));
});
const entryDialogElement = $("#entryDialog"),
  nativeShowEntry = entryDialogElement.showModal.bind(entryDialogElement);
entryDialogElement.showModal = () => {
  moneyFieldNames.forEach((name) => {
    const input = $(`#entryForm [name=${name}]`),
      value = Number(input.value);
    if (input.value && Number.isFinite(value)) input.value = num(value, 2);
  });
  nativeShowEntry();
};
$("#entryForm").addEventListener(
  "submit",
  () =>
    moneyFieldNames.forEach((name) => {
      const input = $(`#entryForm [name=${name}]`);
      if (input.value) input.value = moneyInputNumber(input.value).toFixed(2);
    }),
  true,
);
function syncFuel() {
  const f = $("#entryForm"),
    p = moneyInputNumber(f.precoLitro.value),
    v = moneyInputNumber(f.valor.value);
  f.litros.value = p > 0 && v > 0 ? (v / p).toFixed(3) : "";
}
["precoLitro", "valor"].forEach((n) =>
  $("#entryForm [name=" + n + "]").addEventListener("input", syncFuel),
);
$("#entryForm").onsubmit = (e) => {
  if (e.submitter?.value === "cancel") return;
  e.preventDefault();
  const f = e.target,
    d = Object.fromEntries(new FormData(f)),
    id = f.movementId.value,
    current = id ? movements.find((m) => m.id === id) : null,
    km = +String(d.km).replace(/\D/g, ""),
    err = $("#formError"),
    v = current
      ? vehicles.find((x) => x.nome === current.veiculo)
      : defaultVehicle();
  if (!v || v.ativo === false) {
    err.textContent = current
      ? "Veículo inativo: lançamento disponível somente para consulta."
      : "Cadastre e defina um veículo ativo como padrão antes de realizar lançamentos.";
    return;
  }
  d.veiculo = v.nome;
  d.tipo = typeForCategory(d.categoria);
  if (!d.tipo || !d.categoria || !d.subcategoria) {
    err.textContent = "Categoria e subcategoria são obrigatórias.";
    return;
  }
  const b = kmBounds(d.data, d.veiculo, id);
  if (b.prev && km < +b.prev.hodometro_km) {
    err.textContent = `O hodômetro não pode ser menor que ${intFmt(b.prev.hodometro_km)} km para esta data.`;
    return;
  }
  if (b.next && km > +b.next.hodometro_km) {
    err.textContent = `O hodômetro não pode ser maior que ${intFmt(b.next.hodometro_km)} km, pois existe lançamento posterior.`;
    return;
  }
  let valor = d.tipo === "ABASTECIMENTO" ? +f.valor.value : +f.valorComum.value;
  if (d.tipo === "ABASTECIMENTO") {
    syncFuel();
    if (!(+f.precoLitro.value > 0 && valor > 0 && +f.litros.value > 0)) {
      err.textContent =
        "Informe o preço por litro e o valor total para calcular a quantidade de litros.";
      return;
    }
  }
  if (!(valor >= 0)) {
    err.textContent = "Informe o valor total.";
    return;
  }
  const prevAny = b.prev,
    dist = Math.max(0, km - (+prevAny?.hodometro_km || +v.kmInicial || 0)),
    prevFuel = [...movements]
      .filter(
        (m) =>
          m.id !== id &&
          m.veiculo === d.veiculo &&
          m.tipo === "ABASTECIMENTO" &&
          String(m.data_hora).slice(0, 10) <= d.data &&
          +m.hodometro_km <= km,
      )
      .sort((a, b) => b.hodometro_km - a.hodometro_km)[0],
    fuelDist = Math.max(0, km - (+prevFuel?.hodometro_km || +v.kmInicial || 0)),
    obj = {
      id: id || crypto.randomUUID(),
      ordem_lancamento:
        current?.ordem_lancamento ||
        Math.max(0, ...movements.map((m) => +m.ordem_lancamento || 0)) + 1,
      tipo: d.tipo,
      data_hora: d.data + "T12:00:00",
      hodometro_km: km,
      categoria: d.categoria,
      subcategoria: d.subcategoria,
      valor,
      quantidade_litros: d.tipo === "ABASTECIMENTO" ? +f.litros.value : null,
      preco_unitario: d.tipo === "ABASTECIMENTO" ? +f.precoLitro.value : null,
      distancia_km: dist,
      distancia_abastecimento_km: d.tipo === "ABASTECIMENTO" ? fuelDist : null,
      consumo_km_l:
        d.tipo === "ABASTECIMENTO" && fuelDist && +f.litros.value
          ? fuelDist / +f.litros.value
          : null,
      tanque_completo:
        d.tipo === "ABASTECIMENTO"
          ? d.tanqueCompleto
            ? "SIM"
            : "NAO"
          : "N.I.",
      motorista: d.motorista || "N.I.",
      fornecedor: d.fornecedor || "",
      local: d.fornecedor || "",
      forma_pagamento: d.formaPagamento || "",
      incluir_indicadores: d.incluirIndicadores ? "SIM" : "NAO",
      veiculo: d.veiculo,
      observacao: d.observacao || "N.I.",
      origem: current?.origem || "APP",
    };
  if (current) Object.assign(current, obj);
  else movements.push(obj);
  recalculateDistances();
  err.textContent = "";
  save();
  $("#entryDialog").close();
  go("movimentos");
};
function fillRegisterForm() {
  const f = $("#registerForm");
  fillTypeSelect(f.tipo);
  f.tipo.onchange = () =>
    (f.categoria.innerHTML = (TYPES[f.tipo.value] || [])
      .map((c) => `<option>${c}</option>`)
      .join(""));
  f.tipo.onchange();
}
function openRegister(id = "") {
  const group = $("#registerGroup").value,
    f = $("#registerForm");
  f.reset();
  f.id.value = "";
  f.grupo.value = group;
  $("#subcatFields").style.display =
    group === "SUBCATEGORIA" ? "block" : "none";
  $("#simpleFields").style.display =
    group === "SUBCATEGORIA" ? "none" : "block";
  $("#simpleLabel").firstChild.textContent =
    group === "VEICULO" ? "Veículo *" :
    group === "MOTORISTA" ? "Motorista *" :
    group === "FORNECEDOR" ? "Fornecedor *" : "Forma de pagamento *";
  $("#vehicleExtraFields").style.display = group === "VEICULO" ? "block" : "none";
  $("#driverExtraFields").style.display = group === "MOTORISTA" ? "block" : "none";
  $("#supplierExtraFields").style.display = group === "FORNECEDOR" ? "block" : "none";

  $("#activeVehicleField").style.display =
    group === "VEICULO" ? "flex" : "none";
  fillRegisterForm();
  let obj;
  if (group === "SUBCATEGORIA") obj = registers.find((x) => x.id === id);
  else if (group === "MOTORISTA") obj = drivers.find((x) => x.id === id);
  else if (group === "VEICULO") obj = vehicles.find((x) => x.id === id);
  else if (group === "FORNECEDOR") obj = suppliers.find((x) => x.id === id);
  else obj = paymentMethods.find((x) => x.id === id);
  if (obj) {
    f.id.value = obj.id;
    if (group === "SUBCATEGORIA") {
      f.tipo.value = obj.tipo;
      f.tipo.onchange();
      f.categoria.value = obj.categoria;
      f.subcategoria.value = obj.subcategoria;
      f.padrao.checked = obj.padrao;
    } else {
      f.nome.value = obj.nome;
      f.kmInicial.value = obj.kmInicial ? intFmt(obj.kmInicial) : "";
      f.simplePadrao.checked = !!obj.padrao;
      f.ativo.checked = obj.ativo !== false;
      if (group === "VEICULO") {
        f.placa.value = obj.placa || "";
        f.anoFabricacao.value = obj.anoFabricacao || "";
        f.anoModelo.value = obj.anoModelo || "";
        f.capacidadeTanque.value = obj.capacidadeTanque || "";
        f.consumoRefCidade.value = obj.consumoRefCidade || "";
        f.consumoRefEstrada.value = obj.consumoRefEstrada || "";
      }
      if (group === "MOTORISTA") {
        f.numeroCnh.value = obj.numeroCnh || "";
        f.categoriaCnh.value = obj.categoriaCnh || "";
        f.validadeCnh.value = String(obj.validadeCnh || "").slice(0,10);
        f.obsMotorista.value = obj.observacao || "";
      }
      if (group === "FORNECEDOR") f.localFornecedor.value = obj.local || "";
    }
  }
  $("#registerTitle").textContent = id
    ? "Alterar cadastro"
    : "Incluir cadastro";
  $("#registerDialog").showModal();
}
function deleteRegister(id) {
  if (!confirm("Excluir este cadastro?")) return;
  const g = $("#registerGroup").value;
  if (g === "SUBCATEGORIA") registers = registers.filter((x) => x.id !== id);
  if (g === "MOTORISTA") drivers = drivers.filter((x) => x.id !== id);
  if (g === "VEICULO") vehicles = vehicles.filter((x) => x.id !== id);
  if (g === "FORNECEDOR") suppliers = suppliers.filter((x) => x.id !== id);
  if (g === "FORMA_PAGAMENTO") paymentMethods = paymentMethods.filter((x) => x.id !== id);
  save();
}
$("#registerForm [name=kmInicial]").oninput = (e) =>
  (e.target.value = intFmt(String(e.target.value).replace(/\D/g, "")));
$("#addRegister").onclick = () => openRegister();
$("#registerGroup").onchange = renderRegisters;
$("#registerSearch").oninput = renderRegisters;
$("#registerStatusFilter").onchange = renderRegisters;
const registerDrawer = $("#registerDrawer"), registerBackdrop = $("#registerDrawerBackdrop"), registerMenuBtn = $("#registerMenuBtn");
function closeRegisterDrawer() {
  registerDrawer.classList.remove("open");
  registerBackdrop.classList.remove("open");
  registerMenuBtn.setAttribute("aria-expanded","false");
}
registerMenuBtn.onclick = () => {
  registerDrawer.classList.add("open");
  registerBackdrop.classList.add("open");
  registerMenuBtn.setAttribute("aria-expanded","true");
};
$("#closeRegisterMenu").onclick = closeRegisterDrawer;
registerBackdrop.onclick = closeRegisterDrawer;
$$("[data-register-group]").forEach(button => button.onclick = () => {
  $("#registerGroup").value = button.dataset.registerGroup;
  $("#registerSearch").value = "";
  $("#registerStatusFilter").value = "TODOS";
  renderRegisters();
  closeRegisterDrawer();
});
$("#registerForm").onsubmit = (e) => {
  if (e.submitter?.value === "cancel") return;
  e.preventDefault();
  const f = e.target,
    g = f.grupo.value,
    id = f.id.value;
  if (g === "SUBCATEGORIA") {
    const obj = {
      id: id || crypto.randomUUID(),
      tipo: f.tipo.value,
      categoria: f.categoria.value,
      subcategoria: f.subcategoria.value.trim(),
      padrao: f.padrao.checked,
    };
    if (!obj.subcategoria) return;
    if (obj.padrao)
      registers.forEach((r) => {
        if (r.tipo === obj.tipo && r.categoria === obj.categoria)
          r.padrao = false;
      });
    if (id)
      Object.assign(
        registers.find((x) => x.id === id),
        obj,
      );
    else registers.push(obj);
  } else {
    const arr = g === "MOTORISTA" ? drivers : g === "VEICULO" ? vehicles : g === "FORNECEDOR" ? suppliers : paymentMethods,
      name = f.nome.value.trim(),
      isActive = ["VEICULO","FORNECEDOR","FORMA_PAGAMENTO"].includes(g) ? f.ativo.checked : true,
      isDefault = f.simplePadrao.checked && isActive,
      kmInicial = +String(f.kmInicial.value || "").replace(/\D/g, "");
    if (!name) return;
    if (g === "VEICULO" && (!kmInicial || !(+f.capacidadeTanque.value > 0))) return;
    if (isDefault) arr.forEach((x) => (x.padrao = false));
    if (id) {
      const item = arr.find((x) => x.id === id);
      item.nome = name;
      item.padrao = isDefault;
      if (g === "VEICULO") {
        item.kmInicial = kmInicial; item.ativo = isActive;
        item.placa = f.placa.value.trim();
        item.anoFabricacao = +f.anoFabricacao.value || "";
        item.anoModelo = +f.anoModelo.value || "";
        item.capacidadeTanque = +f.capacidadeTanque.value || 0;
        item.consumoRefCidade = +f.consumoRefCidade.value || "";
        item.consumoRefEstrada = +f.consumoRefEstrada.value || "";
        if (!isActive) item.padrao = false;
      }
      if (g === "MOTORISTA") {
        item.numeroCnh=f.numeroCnh.value.trim(); item.categoriaCnh=f.categoriaCnh.value.trim();
        item.validadeCnh=f.validadeCnh.value; item.observacao=f.obsMotorista.value.trim();
      }
      if (g === "FORNECEDOR") { item.local=f.localFornecedor.value.trim(); item.ativo=isActive; }
      if (g === "FORMA_PAGAMENTO") item.ativo=isActive;
    } else
      arr.push({
        id: crypto.randomUUID(),
        nome: name,
        kmInicial: g === "VEICULO" ? kmInicial : undefined,
        placa: g === "VEICULO" ? f.placa.value.trim() : undefined,
        anoFabricacao: g === "VEICULO" ? (+f.anoFabricacao.value || "") : undefined,
        anoModelo: g === "VEICULO" ? (+f.anoModelo.value || "") : undefined,
        capacidadeTanque: g === "VEICULO" ? (+f.capacidadeTanque.value || 0) : undefined,
        consumoRefCidade: g === "VEICULO" ? (+f.consumoRefCidade.value || "") : undefined,
        consumoRefEstrada: g === "VEICULO" ? (+f.consumoRefEstrada.value || "") : undefined,
        numeroCnh: g === "MOTORISTA" ? f.numeroCnh.value.trim() : undefined,
        categoriaCnh: g === "MOTORISTA" ? f.categoriaCnh.value.trim() : undefined,
        validadeCnh: g === "MOTORISTA" ? f.validadeCnh.value : undefined,
        observacao: g === "MOTORISTA" ? f.obsMotorista.value.trim() : undefined,
        local: g === "FORNECEDOR" ? f.localFornecedor.value.trim() : undefined,
        padrao: isDefault || arr.length === 0,
        ativo: isActive,
      });
    if (g === "VEICULO" && !arr.some((x) => x.padrao && x.ativo !== false)) {
      const first = arr.find((x) => x.ativo !== false);
      if (first) first.padrao = true;
    }
  }
  recalculateDistances();
  save();
  $("#registerDialog").close();
};
["homeVehicle", "movementVehicle", "reportVehicle", "chartVehicle"].forEach(
  (id) => ($("#" + id).onchange = renderAll),
);
$("#typeFilter").innerHTML =
  '<option value="">Todos os tipos</option>' +
  Object.keys(TYPES)
    .map((t) => `<option>${t}</option>`)
    .join("");
$("#typeFilter").onchange = renderMovements;
$("#search").oninput = renderMovements;
[
  ["movement", renderMovements],
  ["report", renderReports],
  ["chart", renderCharts],
].forEach(([prefix, render]) => {
  ["Start", "End"].forEach((suffix) => {
    $("#" + prefix + suffix).onchange = render;
  });
  $("#clear" + prefix[0].toUpperCase() + prefix.slice(1) + "Period").onclick = () => {
    $("#" + prefix + "Start").value = "";
    $("#" + prefix + "End").value = "";
    render();
  };
});
function esc(v) {
  return String(v ?? "").replace(
    /[&<>\"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c],
  );
}
function col(n) {
  let s = "";
  while (n) {
    n--;
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26);
  }
  return s;
}
function sheet(rows) {
  return `<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rows.map((r, i) => `<row r="${i + 1}">${r.map((v, j) => (typeof v === "number" ? `<c r="${col(j + 1)}${i + 1}"><v>${v}</v></c>` : `<c r="${col(j + 1)}${i + 1}" t="inlineStr"><is><t>${esc(v)}</t></is></c>`)).join("")}</row>`).join("")}</sheetData></worksheet>`;
}
async function exportXlsx() {
  await MyCarPlusDB.exportDatabase({
    movements, registers, drivers, vehicles, suppliers, paymentMethods
  });
}
window.vehicleAppBridge = {
  getState: () => ({ movements, registers, drivers, vehicles, suppliers, paymentMethods }),
  applyState: (state) => {
    if (!state) return;
    movements = (state.movements || []).map((m, i) => normalizeMovement(m, i));
    registers = state.registers || defaults;
    drivers = state.drivers || [];
    vehicles = state.vehicles || [];
    suppliers = state.suppliers || [];
    paymentMethods = state.paymentMethods || [];
    recalculateDistances();
    save(false);
  },
};
$("#homeVersion").textContent = "v" + APP_VERSION;
const aboutVersion = [...$$("#sobre p")].find((p) =>
  p.textContent.trim().startsWith("Versão:"),
);
if (aboutVersion)
  aboutVersion.innerHTML = "<strong>Versão:</strong> " + APP_VERSION;
$("#exportXlsx").onclick = exportXlsx;

let deferredInstallPrompt = null;
const installButtons = () => $$(".install-app-action");
const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  window.navigator.standalone === true;
function refreshInstallControls() {
  const canInstall = Boolean(deferredInstallPrompt) && !isStandalone();
  installButtons().forEach((button) => {
    button.hidden = !canInstall;
  });
  const help = $("#installHelpText");
  if (help)
    help.textContent = isStandalone()
      ? "O MyCar+ já está instalado neste aparelho."
      : canInstall
        ? "Toque no botão para instalar o aplicativo neste aparelho."
        : "No Chrome, use o menu e escolha Instalar aplicativo ou Adicionar à tela inicial.";
}
window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  refreshInstallControls();
});
installButtons().forEach((button) => {
  button.addEventListener("click", async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    refreshInstallControls();
  });
});
window.addEventListener("appinstalled", () => {
  deferredInstallPrompt = null;
  refreshInstallControls();
});
refreshInstallControls();


function exportPdfReport() {
  const selectedVehicle = $("#reportVehicle").value;
  const vehicleLabel = selectedVehicle || "Todos os veículos";
  const ms = filterByPeriod(filtered(selectedVehicle), "report");
  if (!periodIsValid("report")) return alert("Corrija o período antes de gerar o relatório.");
  if (!ms.length) return alert("Não existem movimentos no veículo e período selecionados.");

  const s = stats(ms), groups = groupTotals(ms);
  const expenseGroups = [
    ["Combustível", +groups.Combustível || 0],
    ["Manutenção", +groups.Serviços || 0],
    ["Administrativo", +groups.Administrativo || 0],
  ];
  const gross = expenseGroups.reduce((a, [,v]) => a + v, 0);
  const income = +groups.Receitas || 0;
  const net = gross - income;
  const costKm = s.km ? net / s.km : 0;
  const costDay = s.days ? net / s.days : 0;
  const fuelRows = {};
  ms.filter(m => m.tipo === "ABASTECIMENTO").forEach(m => {
    const key = m.subcategoria || "Combustível";
    const x = fuelRows[key] ||= { liters:0, distance:0, cost:0 };
    x.liters += +m.quantidade_litros || 0;
    x.distance += +(m.distancia_abastecimento_km ?? m.distancia_km) || 0;
    x.cost += +m.valor || 0;
  });
  const fuelTotal = Object.values(fuelRows).reduce((a,x)=>({liters:a.liters+x.liters,distance:a.distance+x.distance,cost:a.cost+x.cost}),{liters:0,distance:0,cost:0});
  const fuelConsumption = fuelTotal.liters ? fuelTotal.distance / fuelTotal.liters : 0;
  const fuelCostKm = fuelTotal.distance ? fuelTotal.cost / fuelTotal.distance : 0;
  const fuelEntries = Object.entries(fuelRows).sort((a,b)=>b[1].cost-a[1].cost);

  const monthly = {};
  ms.filter(m => m.tipo !== "RECEITA").forEach(m => {
    const k = (m.data_hora || "").slice(0,7); if (k) monthly[k] = (monthly[k]||0) + (+m.valor||0);
  });
  const monthKeys = Object.keys(monthly).sort();
  const yearlyFuel = {};
  ms.filter(m => m.tipo === "ABASTECIMENTO").forEach(m => {
    const y=(m.data_hora||"").slice(0,4); if(!y) return;
    const x=yearlyFuel[y] ||= {l:0,d:0}; x.l += +m.quantidade_litros||0; x.d += +(m.distancia_abastecimento_km ?? m.distancia_km)||0;
  });
  const years = Object.keys(yearlyFuel).sort();
  const annualConsumption = years.map(y => yearlyFuel[y].l ? yearlyFuel[y].d/yearlyFuel[y].l : 0);

  const maint = ms.filter(m => m.tipo === "SERVICO").sort((a,b)=>new Date(b.data_hora)-new Date(a.data_hora));
  const topExpenses = ms.filter(m => m.tipo !== "RECEITA").sort((a,b)=>(+b.valor||0)-(+a.valor||0)).slice(0,5);
  const refuels = ms.filter(m => m.tipo === "ABASTECIMENTO");
  const avgTicket = refuels.length ? refuels.reduce((a,m)=>a+(+m.valor||0),0)/refuels.length : 0;
  const maxRefuel = refuels.reduce((a,m)=>Math.max(a,+m.valor||0),0);
  const avgDistance = refuels.length ? refuels.reduce((a,m)=>a+(+(m.distancia_abastecimento_km ?? m.distancia_km)||0),0)/refuels.length : 0;

  const e = (v) => String(v ?? "").replace(/[&<>\"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"})[c]);
  const dateBR = (v) => { const d=(v||"").slice(0,10).split("-"); return d.length===3 ? `${d[2]}/${d[1]}/${d[0]}` : "—"; };
  const pct = (v,t) => t ? num(v/t*100,1)+"%" : "0,0%";
  const period = periodText("report");
  const emitted = new Intl.DateTimeFormat("pt-BR", {dateStyle:"short", timeStyle:"short"}).format(new Date());

  function lineSvg(labels, values) {
    if (!labels.length) return '<div class="empty">Sem dados suficientes.</div>';
    const W=620,H=180,L=42,R=15,T=18,B=36,max=Math.max(...values,1),min=Math.min(...values,0),span=Math.max(max-min,1);
    const pts=values.map((v,i)=>{const x=labels.length===1?(L+(W-L-R)/2):L+(W-L-R)*i/(labels.length-1);const y=T+(max-v)/span*(H-T-B);return [x,y];});
    const grid=[0,1,2,3,4].map(i=>{const y=T+(H-T-B)*i/4;return `<line x1="${L}" y1="${y}" x2="${W-R}" y2="${y}"/>`;}).join("");
    const path=pts.map((p,i)=>(i?"L":"M")+p[0].toFixed(1)+" "+p[1].toFixed(1)).join(" ");
    const dots=pts.map(p=>`<circle cx="${p[0]}" cy="${p[1]}" r="3.5"/>`).join("");
    const labs=pts.map((p,i)=>`<text x="${p[0]}" y="${H-12}" text-anchor="middle">${e(labels[i])}</text>`).join("");
    return `<svg viewBox="0 0 ${W} ${H}" class="svg-chart"><g class="grid">${grid}</g><path d="${path}" class="line"/><g class="dots">${dots}</g><g class="labels">${labs}</g></svg>`;
  }
  function barSvg(labels, values) {
    if (!labels.length) return '<div class="empty">Sem dados suficientes.</div>';
    const W=620,H=180,L=45,R=12,T=15,B=42,max=Math.max(...values,1),step=(W-L-R)/labels.length,bw=Math.min(55,step*.58);
    const bars=values.map((v,i)=>{const h=(v/max)*(H-T-B),x=L+i*step+(step-bw)/2,y=H-B-h;return `<rect x="${x}" y="${y}" width="${bw}" height="${h}" rx="4"/><text x="${x+bw/2}" y="${H-18}" text-anchor="middle">${e(labels[i])}</text>`;}).join("");
    return `<svg viewBox="0 0 ${W} ${H}" class="svg-chart"><line x1="${L}" y1="${H-B}" x2="${W-R}" y2="${H-B}" class="axis"/><g class="bars">${bars}</g></svg>`;
  }

  const fuelHtml = fuelEntries.length ? fuelEntries.map(([name,x])=>`<tr><td>${e(name)}</td><td class="num">${num(x.liters,1)} L</td><td class="num">${num(x.liters?x.distance/x.liters:0,2)} km/L</td><td class="num">${money(x.distance?x.cost/x.distance:0)}</td><td class="num">${money(x.cost)}</td></tr>`).join("") : '<tr><td colspan="5">Sem abastecimentos.</td></tr>';
  const maintHtml = maint.length ? maint.slice(0,5).map(m=>`<tr><td>${e(m.subcategoria||m.categoria||"Manutenção")}</td><td>${dateBR(m.data_hora)}</td><td class="num">${money(m.valor)}</td></tr>`).join("") : '<tr><td colspan="3">Sem manutenções no período.</td></tr>';
  const topHtml = topExpenses.map(m=>`<tr><td>${e(m.subcategoria||m.categoria||m.tipo)}</td><td>${e(m.categoria||m.tipo)}</td><td class="num">${money(m.valor)}</td></tr>`).join("");

  const content = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Relatório Executivo MyCar+</title><style>
  :root{--azul:#0f3f66;--azul2:#1f6fa8;--cinza:#eef3f7;--texto:#1f2933;--muted:#607080;--verde:#1c8c5e;--vermelho:#c74444;--borda:#d8e1e8}*{box-sizing:border-box}body{margin:0;font-family:Arial,Helvetica,sans-serif;color:var(--texto);background:#fff}.page{width:210mm;min-height:297mm;padding:11mm 12mm 10mm;position:relative;page-break-after:always}.page:last-child{page-break-after:auto}.header{display:flex;justify-content:space-between;border-bottom:3px solid var(--azul);padding-bottom:7px;margin-bottom:8px}.brand{display:flex;gap:9px;align-items:center}.logo{width:39px;height:39px;border-radius:11px;background:var(--azul);color:#fff;display:grid;place-items:center;font-weight:800;font-size:17px}h1{font-size:17px;margin:0;color:var(--azul)}.sub,.meta{font-size:8.5px;color:var(--muted);line-height:1.45}.meta{text-align:right}.section-title{font-size:10px;font-weight:800;color:var(--azul);text-transform:uppercase;letter-spacing:.45px;margin:8px 0 5px}.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:5px}.kpi,.card{border:1px solid var(--borda);border-radius:7px;padding:6px 7px}.kpi{min-height:49px}.label{font-size:7.5px;color:var(--muted);margin-bottom:3px}.value{font-size:13px;font-weight:800;color:var(--azul)}.foot{font-size:6.8px;color:var(--muted);margin-top:2px}.grid2{display:grid;grid-template-columns:1fr 1fr;gap:7px}.card h3{margin:0 0 3px;font-size:9px;color:var(--azul)}table{width:100%;border-collapse:collapse;font-size:7.5px}th{background:var(--cinza);color:var(--azul);text-align:left}th,td{padding:4px;border-bottom:1px solid #edf1f4}.num{text-align:right}.note{font-size:8px;line-height:1.4;background:#f7fafc;border-left:4px solid var(--azul2);padding:7px;border-radius:5px}.footer{position:absolute;left:12mm;right:12mm;bottom:6mm;border-top:1px solid var(--borda);padding-top:4px;display:flex;justify-content:space-between;font-size:6.8px;color:var(--muted)}.svg-chart{width:100%;height:105px;display:block}.svg-chart .grid line,.axis{stroke:#dbe4eb;stroke-width:1}.svg-chart .line{fill:none;stroke:var(--azul2);stroke-width:3}.svg-chart .dots circle,.svg-chart .bars rect{fill:var(--azul2)}.svg-chart text{font-size:8px;fill:var(--muted)}.empty{height:105px;display:grid;place-items:center;font-size:8px;color:var(--muted)}.summary{display:grid;grid-template-columns:1.2fr .8fr;gap:7px}.status{margin:0;padding-left:15px;font-size:8px;line-height:1.45}.good{color:var(--verde);font-weight:700}.attention{color:var(--vermelho);font-weight:700}@page{size:A4;margin:0}@media print{body{margin:0}.page{break-after:page}.page:last-child{break-after:auto}}
  </style></head><body>
  <section class="page"><div class="header"><div class="brand"><div class="logo">M+</div><div><h1>Relatório Executivo Veicular</h1><div class="sub">MyCar+ • consumo, custos e manutenção</div></div></div><div class="meta"><b>Veículo:</b> ${e(vehicleLabel)}<br><b>Período:</b> ${e(period)}<br><b>Emissão:</b> ${e(emitted)}</div></div>
  <div class="section-title">Resumo do período</div><div class="kpis">
  <div class="kpi"><div class="label">Distância percorrida</div><div class="value">${intFmt(s.km)} km</div><div class="foot">${num(s.days?s.km/s.days:0,1)} km/dia</div></div>
  <div class="kpi"><div class="label">Consumo médio geral</div><div class="value">${num(fuelConsumption,2)} km/L</div><div class="foot">todos os combustíveis</div></div>
  <div class="kpi"><div class="label">Custo total bruto</div><div class="value">${money(gross)}</div><div class="foot">gastos do período</div></div>
  <div class="kpi"><div class="label">Custo líquido</div><div class="value">${money(net)}</div><div class="foot">receitas: ${money(income)}</div></div>
  <div class="kpi"><div class="label">Custo por km</div><div class="value">${money(costKm)}</div><div class="foot">custo líquido ÷ distância</div></div>
  <div class="kpi"><div class="label">Custo diário</div><div class="value">${money(costDay)}</div><div class="foot">${intFmt(s.days)} dias no período</div></div>
  <div class="kpi"><div class="label">Combustível</div><div class="value">${money(fuelTotal.cost)}</div><div class="foot">${pct(fuelTotal.cost,gross)} do gasto bruto</div></div>
  <div class="kpi"><div class="label">Manutenção</div><div class="value">${money(+groups.Serviços||0)}</div><div class="foot">${pct(+groups.Serviços||0,gross)} do gasto bruto</div></div></div>
  <div class="section-title">Desempenho e custos</div><div class="grid2"><div class="card"><h3>Consumo médio de combustível geral por km, por ano</h3>${lineSvg(years,annualConsumption)}</div><div class="card"><h3>Custo total por grupo</h3>${barSvg(expenseGroups.map(x=>x[0]),expenseGroups.map(x=>x[1]))}</div></div>
  <div class="section-title">Combustíveis</div><table><thead><tr><th>Combustível</th><th class="num">Litros</th><th class="num">Consumo</th><th class="num">Custo/km</th><th class="num">Gasto</th></tr></thead><tbody>${fuelHtml}<tr><td><b>Combustíveis (geral)</b></td><td class="num"><b>${num(fuelTotal.liters,1)} L</b></td><td class="num"><b>${num(fuelConsumption,2)} km/L</b></td><td class="num"><b>${money(fuelCostKm)}</b></td><td class="num"><b>${money(fuelTotal.cost)}</b></td></tr></tbody></table>
  <div class="section-title">Leitura executiva</div><div class="summary"><div class="note">O maior grupo de gastos foi <b>${e(expenseGroups.slice().sort((a,b)=>b[1]-a[1])[0][0])}</b>, representando <b>${pct(expenseGroups.slice().sort((a,b)=>b[1]-a[1])[0][1],gross)}</b> do custo bruto. O consumo médio geral foi de <b>${num(fuelConsumption,2)} km/L</b> e o custo líquido por quilômetro foi de <b>${money(costKm)}</b>.</div><div class="card"><h3>Situação do período</h3><ul class="status"><li class="good">Dados consolidados com sucesso</li><li class="good">${refuels.length} abastecimentos analisados</li><li class="${costKm>1.8?'attention':'good'}">Custo/km: ${money(costKm)}</li></ul></div></div>
  <div class="footer"><span>MyCar+ • v${e(APP_VERSION)}</span><span>Página 1 de 2</span></div></section>

  <section class="page"><div class="header"><div><h1>Detalhamento operacional</h1><div class="sub">Complemento objetivo do resumo executivo</div></div><div class="meta"><b>Veículo:</b> ${e(vehicleLabel)}<br><b>Período:</b> ${e(period)}</div></div>
  <div class="section-title">Evolução mensal dos gastos</div><div class="card">${barSvg(monthKeys.map(k=>k.slice(5)+"/"+k.slice(2,4)),monthKeys.map(k=>monthly[k]))}</div>
  <div class="grid2" style="margin-top:7px"><div class="card"><h3>Principais manutenções</h3><table><thead><tr><th>Serviço</th><th>Data</th><th class="num">Valor</th></tr></thead><tbody>${maintHtml}</tbody></table></div><div class="card"><h3>Maiores despesas do período</h3><table><thead><tr><th>Despesa</th><th>Grupo</th><th class="num">Valor</th></tr></thead><tbody>${topHtml}</tbody></table></div></div>
  <div class="section-title">Estatísticas dos abastecimentos</div><div class="kpis"><div class="kpi"><div class="label">Quantidade</div><div class="value">${refuels.length}</div><div class="foot">abastecimentos</div></div><div class="kpi"><div class="label">Ticket médio</div><div class="value">${money(avgTicket)}</div><div class="foot">por abastecimento</div></div><div class="kpi"><div class="label">Maior abastecimento</div><div class="value">${money(maxRefuel)}</div><div class="foot">valor máximo</div></div><div class="kpi"><div class="label">Distância média</div><div class="value">${num(avgDistance,0)} km</div><div class="foot">entre abastecimentos</div></div></div>
  <div class="section-title">Composição financeira</div><table><thead><tr><th>Grupo</th><th class="num">Participação</th><th class="num">Valor</th><th class="num">Custo/km</th><th class="num">Custo/dia</th></tr></thead><tbody>${expenseGroups.map(([n,v])=>`<tr><td>${e(n)}</td><td class="num">${pct(v,gross)}</td><td class="num">${money(v)}</td><td class="num">${money(s.km?v/s.km:0)}</td><td class="num">${money(s.days?v/s.days:0)}</td></tr>`).join("")}<tr><td><b>Receitas</b></td><td class="num">—</td><td class="num"><b>− ${money(income)}</b></td><td class="num">− ${money(s.km?income/s.km:0)}</td><td class="num">− ${money(s.days?income/s.days:0)}</td></tr><tr><td><b>Custo líquido</b></td><td class="num">—</td><td class="num"><b>${money(net)}</b></td><td class="num"><b>${money(costKm)}</b></td><td class="num"><b>${money(costDay)}</b></td></tr></tbody></table>
  <div class="section-title">Conclusão</div><div class="note">O relatório resume os dados registrados no MyCar+ para o veículo e período selecionados. Recomenda-se acompanhar mensalmente o consumo, o custo por quilômetro e as manutenções preventivas, usando a exportação XLSX como cópia de segurança do banco oficial.</div>
  <div class="footer"><span>MyCar+ • v${e(APP_VERSION)}</span><span>Página 2 de 2</span></div></section><script>window.onload=()=>setTimeout(()=>window.print(),350)<\/script></body></html>`;
  const win = window.open("", "_blank");
  if (!win) return alert("Permita janelas pop-up para gerar o PDF.");
  win.document.write(content); win.document.close();
}
const pdfButton = $("#exportPdf"); if (pdfButton) pdfButton.onclick = exportPdfReport;
const themeButton = $("#themeToggle");
function applyTheme(mode) {
  const dark = mode === "dark" || (mode === "auto" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  if (themeButton) themeButton.textContent = mode === "auto" ? "◐ Tema automático" : dark ? "☾ Tema escuro" : "☀ Tema claro";
  localStorage.setItem("mycar_theme", mode);
}
if (themeButton) themeButton.onclick = () => { const current = localStorage.getItem("mycar_theme") || "auto"; applyTheme(current === "auto" ? "light" : current === "light" ? "dark" : "auto"); };
applyTheme(localStorage.getItem("mycar_theme") || "auto");
window.addEventListener("load", () => setTimeout(() => document.getElementById("splashScreen")?.classList.add("hidden"), 650));

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch((error) =>
      console.warn("Não foi possível registrar o service worker:", error),
    );
  });
}
load().then(() => {
  const params = new URLSearchParams(window.location.search);
  const page = params.get("pagina");
  if (page && document.getElementById(page)) go(page);
  if (params.get("acao") === "novo") openEntry();
  if (page || params.has("acao"))
    history.replaceState(null, "", window.location.pathname + window.location.hash);
  window.vehicleAppReady = true;
  window.dispatchEvent(new Event("vehicle-app-ready"));
}).catch((error) => {
  console.error("Falha ao carregar o banco MyCarPlus.xlsx:", error);
  document.getElementById("splashScreen")?.classList.add("hidden");
  const host = document.querySelector("main") || document.body;
  const alert = document.createElement("section");
  alert.className = "card";
  alert.style.margin = "20px";
  alert.innerHTML = `
    <h2>Falha ao carregar o banco de dados</h2>
    <p>O aplicativo não conseguiu abrir <strong>data/MyCarPlus.xlsx</strong>.</p>
    <p>${String(error?.message || error)}</p>
  `;
  host.prepend(alert);
});
