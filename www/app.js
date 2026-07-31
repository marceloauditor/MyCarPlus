const APP_NAME = "MyCar+",
  APP_VERSION = "5.50",
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
function normalizeText(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}
const GROUPS = ["COMBUSTÍVEL", "MANUTENÇÃO", "ADMINISTRATIVO", "RECEITA"];
const alpha = (list, field = "nome") =>
  [...list].sort((a, b) =>
    String(a?.[field] || "").localeCompare(String(b?.[field] || ""), "pt-BR", {
      sensitivity: "base",
      numeric: true,
    }),
  );
let movements = [],
  registers = [],
  drivers = [],
  vehicles = [],
  suppliers = [],
  paymentMethods = [],
  alerts = [],
  alertHistory = [],
  technicalParameters = [];
let entryContext = null;
let entryReturnPage = "movimentos";
const NI = "NI — Não informado";
const TECHNICAL_ITEMS = {
  OIL: { key: "OIL", label: "Troca de Óleo", km: 9000, months: 6 },
  BATTERY: { key: "BATTERY", label: "Bateria", km: 0, months: 36 },
};
const defaults = [
  ["COMBUSTÍVEL", "Etanol", 1],
  ["COMBUSTÍVEL", "Gasolina", 0],
  ["COMBUSTÍVEL", "Diesel", 0],
  ["ADMINISTRATIVO", "Adesivos/Soleiras", 0],
  ["ADMINISTRATIVO", "Gorjeta", 0],
  ["ADMINISTRATIVO", "Impostos (IPVA/DPVAT)", 1],
  ["ADMINISTRATIVO", "Macaco", 0],
  ["ADMINISTRATIVO", "Multa", 0],
  ["ADMINISTRATIVO", "Protetor Solar/Parabrisa", 0],
  ["ADMINISTRATIVO", "Seguro", 0],
  ["RECEITA", "Reembolso", 1],
  ["MANUTENÇÃO", "Bateria", 0],
  ["MANUTENÇÃO", "Filtro de Ar", 0],
  ["MANUTENÇÃO", "Filtro de Ar da Cabine", 0],
  ["MANUTENÇÃO", "Filtro de Combustível", 0],
  ["MANUTENÇÃO", "Filtro de Óleo", 1],
  ["MANUTENÇÃO", "Fluido de Freio", 0],
  ["MANUTENÇÃO", "Fluido Radiador", 0],
  ["MANUTENÇÃO", "Lava-jato", 0],
  ["MANUTENÇÃO", "Mão de obra", 0],
  ["MANUTENÇÃO", "Pneus - Calibragem", 0],
  ["MANUTENÇÃO", "Troca de Freio", 0],
  ["MANUTENÇÃO", "Troca de Óleo", 0],
  ["MANUTENÇÃO", "Vidros/Espelhos", 0],
].map((x, i) => ({
  id: "r" + i,
  grupo: x[0],
  item: x[1],
  padrao: !!x[2],
}));
function showToast(message, tone = "success") {
  let host = document.getElementById("appToast");
  if (!host) {
    host = document.createElement("div");
    host.id = "appToast";
    host.className = "app-toast";
    host.setAttribute("role", "status");
    host.setAttribute("aria-live", "polite");
    document.body.appendChild(host);
  }
  clearTimeout(showToast.timer);
  host.textContent = message;
  host.dataset.tone = tone;
  host.classList.add("visible");
  showToast.timer = setTimeout(() => host.classList.remove("visible"), 3600);
}
function persistLocalState() {
  const entries = [
    ["mycar_movements_v1", movements],
    ["mycar_registers_v1", registers],
    ["mycar_drivers_v1", drivers],
    ["mycar_vehicles_v1", vehicles],
    ["mycar_suppliers_v1", suppliers],
    ["mycar_payment_methods_v1", paymentMethods],
    ["mycar_alerts_v1", alerts],
    ["mycar_alert_history_v1", alertHistory],
    ["mycar_technical_parameters_v1", technicalParameters],
  ];
  const previous = new Map(entries.map(([key]) => [key, localStorage.getItem(key)]));
  try {
    entries.forEach(([key, value]) => localStorage.setItem(key, JSON.stringify(value)));
  } catch (error) {
    previous.forEach((value, key) => {
      if (value == null) localStorage.removeItem(key);
      else localStorage.setItem(key, value);
    });
    throw error;
  }
}
function save(syncCloud = true) {
  ensureTechnicalData();
  persistLocalState();
  let renderError = null;
  try {
    renderAll();
  } catch (error) {
    renderError = error;
    console.error("Os dados foram salvos, mas a atualização da tela falhou:", error);
  }
  let syncError = null;
  if (syncCloud) {
    try {
      window.cloudSync?.queueSave();
    } catch (error) {
      syncError = error;
      console.warn("Os dados foram salvos localmente, mas não entraram na fila de sincronização:", error);
    }
  }
  return { persisted: true, renderError, syncError };
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
function movementIdOf(movement) {
  return String(movement?.movimento_id ?? movement?.id ?? "");
}
function sameMovement(movement, id) {
  return movementIdOf(movement) === String(id ?? "");
}
function normalizeMovement(o, i = 0) {
  o.grupo = String(o.grupo || o.categoria || "").toUpperCase();
  if (o.grupo === "ADMINISTRATIVA") o.grupo = "ADMINISTRATIVO";
  if (!o.grupo) {
    o.grupo = o.tipo === "ABASTECIMENTO" ? "COMBUSTÍVEL" :
      o.tipo === "SERVICO" ? "MANUTENÇÃO" :
      o.tipo === "RECEITA" ? "RECEITA" : "ADMINISTRATIVO";
  }
  o.item = o.item || o.subcategoria || "";
  o.item_id = o.item_id || o.subcategoria_id || "";
  delete o.tipo;
  delete o.categoria;
  delete o.subcategoria;
  delete o.subcategoria_id;
  const fuel = (o.item || "").toLowerCase();
  if (fuel.includes("gas")) o.item = "Gasolina";
  o.id = String(o.id || "m" + i);
  o.movimento_id = String(o.movimento_id || o.id);
  o.ordem_lancamento = Number.isFinite(+o.ordem_lancamento)
    ? +o.ordem_lancamento
    : i + 1;
  o.valor = +o.valor || 0;
  o.hodometro_km = +o.hodometro_km || 0;
  o.quantidade_litros = +o.quantidade_litros || null;
  o.preco_unitario = +o.preco_unitario || null;
  o.distancia_km = +o.distancia_km || null;
  const rawVehicle = o.veiculo || o.veiculo_nome || "";
  const legacyVehicleId = { v1: "vei_001", v2: "vei_002" }[String(o.veiculo_id || "").trim()];
  const vehicleId = legacyVehicleId || String(o.veiculo_id || "").trim();
  const registered = vehicles.find((v) => v.id === vehicleId) ||
    vehicles.find((v) => normalizeText(v.nome) === normalizeText(rawVehicle));
  if (registered) {
    o.veiculo_id = registered.id;
    o.veiculo = registered.nome;
  } else {
    const fallback = selectedVehicleObject?.() || vehicles.find((v) => v.padrao) || vehicles[0];
    o.veiculo_id = vehicleId || fallback?.id || "";
    o.veiculo = rawVehicle || fallback?.nome || "N.I.";
  }
  o.motorista = o.motorista || drivers[0]?.nome || "N.I.";
  o.fornecedor = o.fornecedor || o.local || NI;
  o.local = o.fornecedor;
  return o;
}
function normalizeRegister(register = {}) {
  register.grupo = String(register.grupo || register.categoria || "").toUpperCase();
  if (register.grupo === "ADMINISTRATIVA") register.grupo = "ADMINISTRATIVO";
  register.item = register.item || register.subcategoria || register.nome || "";
  delete register.tipo;
  delete register.categoria;
  delete register.subcategoria;
  return register;
}
function enforceSingleDefaults() {
  GROUPS.forEach((group) => {
    const rows = registers.filter((r) => r.grupo === group && r.padrao);
    rows.slice(1).forEach((r) => (r.padrao = false));
  });
}
function enforceItemGroup(movement) {
  const registered = registers.find((r) =>
    (movement.item_id && r.id === movement.item_id) ||
    (!movement.item_id && r.item === movement.item),
  );
  if (registered) {
    movement.grupo = registered.grupo;
    movement.item = registered.item;
    movement.item_id = registered.id;
  }
  return movement;
}
function normalizeVehicle(v = {}) {
  const hasNewReferences = [
    "consumoEtanolCidade","consumoEtanolEstrada","consumoGasolinaCidade",
    "consumoGasolinaEstrada","consumoDieselCidade","consumoDieselEstrada"
  ].some((key) => v[key] !== undefined && v[key] !== "");
  if (!v.motorizacao) v.motorizacao = "FLEX";
  if (!hasNewReferences) {
    v.consumoGasolinaCidade = v.consumoRefCidade || "";
    v.consumoGasolinaEstrada = v.consumoRefEstrada || "";
  }
  return v;
}

function normalizeAlertRecord(item = {}) {
  const criterion = ["DATE", "KM", "BOTH"].includes(item.criterion)
    ? item.criterion
    : "DATE";
  const recurrence = ["NONE", "MONTHS", "KM", "BOTH"].includes(item.recurrence)
    ? item.recurrence
    : "NONE";
  return {
    ...item,
    id: String(item.id || crypto.randomUUID()),
    vehicleId: String(item.vehicleId || item.veiculo_id || ""),
    group: "MANUTENÇÃO",
    itemId: String(item.itemId || item.item_id || ""),
    description: String(item.description || item.descricao || "").trim(),
    criterion,
    dueDate: String(item.dueDate || item.data_prevista || ""),
    dueKm: Number(item.dueKm ?? item.km_previsto ?? 0) || 0,
    leadDays: Number(item.leadDays ?? item.antecedencia_dias ?? 0) || 0,
    leadKm: Number(item.leadKm ?? item.antecedencia_km ?? 0) || 0,
    recurrence,
    recurrenceMonths: Number(item.recurrenceMonths ?? item.meses_recorrencia ?? 0) || 0,
    recurrenceKm: Number(item.recurrenceKm ?? item.km_recorrencia ?? 0) || 0,
    active: item.active !== false,
    technical: true,
    technicalKey: String(item.technicalKey || item.chave_tecnica || ""),
    manualSchedule: Boolean(item.manualSchedule),
    completed: Boolean(item.completed),
  };
}
function normalizeAlertHistoryRecord(item = {}) {
  return {
    ...item,
    id: String(item.id || crypto.randomUUID()),
    alertId: String(item.alertId || item.alerta_id || ""),
    vehicleId: String(item.vehicleId || item.veiculo_id || ""),
    technicalKey: String(item.technicalKey || item.chave_tecnica || ""),
    description: String(item.description || item.descricao || "").trim(),
    completedAt: item.completedAt || item.concluido_em || "",
    completedKm: Number(item.completedKm ?? item.hodometro_conclusao ?? 0) || 0,
  };
}
function normalizeTechnicalParameter(item = {}) {
  return {
    ...item,
    id: String(item.id || crypto.randomUUID()),
    vehicleId: String(item.vehicleId || item.veiculo_id || ""),
    technicalKey: String(item.technicalKey || item.chave_tecnica || ""),
    intervalKm: Number(item.intervalKm ?? item.intervalo_km ?? 0) || 0,
    intervalMonths: Number(item.intervalMonths ?? item.intervalo_meses ?? 0) || 0,
    active: item.active !== false,
    deleted: Boolean(item.deleted),
  };
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
    m.grupo || "",
    m.data_hora || "",
    Number(m.hodometro_km) || 0,
    Number(m.valor) || 0,
    m.item || "",
    m.origem || "",
  ].join("|");
}
async function load() {
  const migrationVersion = "mycarplus-v5-8-movimentos-multi-itens";
  const official = await MyCarPlusDB.load();
  const previousVersion = localStorage.getItem("mycar_data_migration");

  // Preserva o banco local e converte sua classificação para Grupo + Item.
  movements = JSON.parse(localStorage.getItem("mycar_movements_v1") || "null") || official.movements;
  registers = JSON.parse(localStorage.getItem("mycar_registers_v1") || "null") || official.registers;
  drivers = JSON.parse(localStorage.getItem("mycar_drivers_v1") || "null") || official.drivers;
  vehicles = JSON.parse(localStorage.getItem("mycar_vehicles_v1") || "null") || official.vehicles;
  suppliers = JSON.parse(localStorage.getItem("mycar_suppliers_v1") || "null") || official.suppliers;
  paymentMethods = JSON.parse(localStorage.getItem("mycar_payment_methods_v1") || "null") || official.paymentMethods;
  alerts = (JSON.parse(localStorage.getItem("mycar_alerts_v1") || "null") || official.alerts || [])
    .map(normalizeAlertRecord);
  alertHistory = (JSON.parse(localStorage.getItem("mycar_alert_history_v1") || "null") || official.alertHistory || [])
    .map(normalizeAlertHistoryRecord);
  technicalParameters = (JSON.parse(localStorage.getItem("mycar_technical_parameters_v1") || "null") || official.technicalParameters || [])
    .map(normalizeTechnicalParameter);

  vehicles = vehicles.map(normalizeVehicle);
  registers = registers.map(normalizeRegister);
  enforceSingleDefaults();
  movements = movements.map((m, i) => enforceItemGroup(normalizeMovement(m, i)));
  ensureTechnicalData();
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
      .filter((m) => m.grupo === "COMBUSTÍVEL")
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
        m.tanque_completo !== "NAO" && +m.quantidade_litros > 0 && dist > 0
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
function selectedVehicleName() {
  const saved = localStorage.getItem("mycar_selected_vehicle_v1") || "";
  if (vehicles.some((v) => v.nome === saved)) return saved;
  return defaultVehicle()?.nome || activeVehicle()?.nome || vehicles[0]?.nome || "";
}
function selectedVehicleObject() {
  const name = selectedVehicleName();
  return vehicles.find((v) => v.nome === name) || null;
}
function selectVehicle(name) {
  if (!vehicles.some((v) => v.nome === name)) return;
  localStorage.setItem("mycar_selected_vehicle_v1", name);
  renderAll();
}
function fillVehicleSelects() {
  const active = activeVehicle(),
    selected = selectedVehicleName(),
    vehicleOpts = alpha(vehicles)
      .map(
        (v) =>
          `<option value="${v.nome}">${v.nome}${v.ativo === false ? " (Inativo)" : " (Ativo)"}</option>`,
      )
      .join(""),
    home = $("#homeVehicle");
  home.innerHTML = vehicleOpts || '<option value="">Nenhum veículo cadastrado</option>';
  home.value = selected;
  ["movementVehicle"].forEach((id) => {
    const e = $("#" + id),
      old = e.value;
    e.innerHTML = vehicleOpts;
    const valid = vehicles.some((v) => v.nome === selected);
    e.value = valid ? selected : active?.nome || vehicles[0]?.nome || "";
    e.disabled = true;
    e.setAttribute("aria-label", "Veículo selecionado na tela inicial");
  });
  ["reportVehicle", "chartVehicle"].forEach((id) => {
    const e = $("#" + id),
      old = selected;
    e.innerHTML = vehicleOpts;
    const valid = vehicles.some((v) => v.nome === old);
    e.value = valid ? old : active?.nome || vehicles[0]?.nome || "";
  });
  if ($("#reportVehicleName")) $("#reportVehicleName").textContent = selected || "Nenhum veículo";
  if ($("#chartVehicleName")) $("#chartVehicleName").textContent = selected || "Nenhum veículo";
}
function fillDrivers() {
  const e = $("#entryForm [name=motorista]");
  e.innerHTML =
    '<option value="">Não informado</option>' +
    alpha(drivers)
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
      alpha(suppliers.filter(x => x.ativo !== false)).map(x => `<option value="${x.nome}">${x.nome}${x.local ? " · " + x.local : ""}</option>`).join("");
  }
  if (f.formaPagamento) {
    f.formaPagamento.innerHTML = '<option value="">Não informado</option>' +
      alpha(paymentMethods.filter(x => x.ativo !== false)).map(x => `<option value="${x.nome}" ${x.padrao ? "selected" : ""}>${x.nome}</option>`).join("");
  }
}
function gpsSupplierRadiusMeters() {
  const saved = Number(localStorage.getItem("mycar_gps_supplier_radius") || 150);
  return [50, 100, 150, 250, 500].includes(saved) ? saved : 150;
}
function validCoordinate(value) {
  return value !== "" && value != null && Number.isFinite(Number(value));
}
function distanceMeters(lat1, lon1, lat2, lon2) {
  const rad = (value) => Number(value) * Math.PI / 180;
  const dLat = rad(Number(lat2) - Number(lat1));
  const dLon = rad(Number(lon2) - Number(lon1));
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
function nearestSupplier(latitude, longitude) {
  return suppliers
    .filter((supplier) => supplier.ativo !== false &&
      validCoordinate(supplier.latitude) && validCoordinate(supplier.longitude))
    .map((supplier) => ({
      supplier,
      distance: distanceMeters(latitude, longitude, supplier.latitude, supplier.longitude),
    }))
    .sort((a, b) => a.distance - b.distance)[0] || null;
}
function mapUrl(latitude, longitude) {
  return `https://www.google.com/maps?q=${encodeURIComponent(`${latitude},${longitude}`)}`;
}
function updateMapLink(link, latitude, longitude) {
  const available = validCoordinate(latitude) && validCoordinate(longitude);
  link.hidden = !available;
  if (available) link.href = mapUrl(latitude, longitude);
}
function addressFromGeocode(result) {
  const address = result?.address || {};
  const street = [address.road || address.pedestrian || address.residential, address.house_number]
    .filter(Boolean).join(", ");
  const district = address.suburb || address.neighbourhood || address.city_district;
  const city = address.city || address.town || address.municipality || address.village;
  return [street, district, city, address.state].filter(Boolean).join(" · ") ||
    result?.display_name || "";
}
function supplierFromGeocode(result) {
  const address = result?.address || {};
  const generic = new Set(["yes", "building", "commercial", "retail", "service"]);
  return [
    result?.name,
    address.amenity,
    address.shop,
    address.office,
    address.tourism,
    address.leisure,
  ].find((value) => value && !generic.has(String(value).toLowerCase())) || "";
}
async function reverseGeocode(latitude, longitude) {
  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("lat", Number(latitude).toFixed(7));
  url.searchParams.set("lon", Number(longitude).toFixed(7));
  url.searchParams.set("zoom", "18");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("accept-language", "pt-BR");
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    referrerPolicy: "no-referrer",
  });
  if (!response.ok) throw new Error(`Geocodificação indisponível (${response.status})`);
  const result = await response.json();
  return {
    supplier: supplierFromGeocode(result),
    address: addressFromGeocode(result),
  };
}
function selectDetectedSupplier(select, supplierName) {
  if (!supplierName) return false;
  const normalized = supplierName.trim().toLocaleLowerCase("pt-BR");
  let option = [...select.options].find((item) =>
    item.value.trim().toLocaleLowerCase("pt-BR") === normalized);
  if (!option) {
    option = new Option(`${supplierName} · detectado pelo GPS`, supplierName);
    option.dataset.gpsDetected = "true";
    select.add(option);
  }
  select.value = option.value;
  return true;
}
function requestCurrentPosition(button, status, onSuccess) {
  if (!window.isSecureContext || !navigator.geolocation) {
    status.textContent = "GPS indisponível. Abra o app por HTTPS e autorize a localização.";
    return;
  }
  button.disabled = true;
  status.textContent = "Obtendo localização atual…";
  navigator.geolocation.getCurrentPosition(
    (position) => {
      button.disabled = false;
      onSuccess(position.coords);
    },
    (error) => {
      button.disabled = false;
      status.textContent = error.code === 1
        ? "Permissão de localização negada. Você pode continuar sem usar o GPS."
        : "Não foi possível obter a localização. Tente novamente em local aberto.";
    },
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 },
  );
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
      .filter((m) => m.grupo !== "RECEITA")
      .reduce((a, m) => a + (+m.valor || 0), 0),
    income = valid
      .filter((m) => m.grupo === "RECEITA")
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
    consumptionFuel = valid.filter((m) => m.grupo === "COMBUSTÍVEL" && m.tanque_completo !== "NAO"),
    liters = consumptionFuel
      .reduce((a, m) => a + (+m.quantidade_litros || 0), 0);
  const consumptionDistance = consumptionFuel.reduce((a, m) => a + (+m.distancia_abastecimento_km || 0), 0);
  return {
    cost,
    income,
    net: cost - income,
    km,
    days,
    cons: liters ? consumptionDistance / liters : 0,
  };
}
function icon(m) {
  return m.grupo === "COMBUSTÍVEL"
    ? "⛽"
    : m.grupo === "MANUTENÇÃO"
      ? "🔧"
      : m.grupo === "RECEITA"
        ? "↙"
        : "🧾";
}
function item(m, editable = false) {
  const rows = m._rows || [m],
    names = rows.map((row) => row.item).filter(Boolean),
    total = rows.reduce((sum, row) => sum + (+row.valor || 0), 0),
    movementId = movementIdOf(m);
  return `<article class="item ${m.grupo === "RECEITA" ? "income" : ""}"><div><b>${icon(m)} ${names[0] || m.grupo}${names.length > 1 ? `<span class="movement-item-count">${names.length} itens</span>` : ""}</b>${names.length > 1 ? `<small class="movement-item-names">${names.join(" · ")}</small>` : ""}<small>${new Date(m.data_hora).toLocaleDateString("pt-BR")} · ${m.grupo} · ${m.veiculo || "Sem veículo"}</small></div><div class="amount"><b>${m.grupo === "RECEITA" ? "+" : "-"} ${money(total)}</b><small>${intFmt(m.hodometro_km)} km</small>${editable ? `<div class="movement-actions"><button type="button" class="view-movement" data-view-movement="${esc(movementId)}">Consultar</button><button type="button" class="edit-movement" data-edit-movement="${esc(movementId)}">Alterar</button><button type="button" class="delete-movement" data-delete-movement="${esc(movementId)}">Excluir</button></div>` : ""}</div></article>`;
}
function groupedMovements(list) {
  const groups = new Map();
  list.forEach((row) => {
    const key = row.movimento_id || row.id;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  });
  return [...groups.values()].map((rows) => ({ ...rows[0], _rows: rows }));
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

  const expenses = ordered.filter((m) => m.grupo !== "RECEITA");
  const categoryTotals = expenses.reduce((acc, m) => {
    const key = m.grupo || "Outros";
    acc[key] = (acc[key] || 0) + (+m.valor || 0);
    return acc;
  }, {});
  const categories = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
  const maxCategory = categories[0] || ["Sem dados", 0];
  const maxExpense = [...expenses].sort((a, b) => (+b.valor || 0) - (+a.valor || 0))[0];
  const lastFuel = [...ordered].filter((m) => m.grupo === "COMBUSTÍVEL").sort(newestFirst)[0];
  const lastFuelDays = lastFuel ? Math.max(0, Math.floor((Date.now() - new Date(lastFuel.data_hora)) / 86400000)) : null;
  const fuelCount = ordered.filter((m) => m.grupo === "COMBUSTÍVEL").length;
  const maintenanceTotal = expenses.filter((m) => m.grupo === "MANUTENÇÃO" || /manuten/i.test(m.grupo || "")).reduce((a, m) => a + (+m.valor || 0), 0);
  const fuelTotal = expenses.filter((m) => m.grupo === "COMBUSTÍVEL").reduce((a, m) => a + (+m.valor || 0), 0);

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
        <dl class="insight-list"><div><dt>Maior despesa</dt><dd>${maxExpense ? `${maxExpense.item || maxExpense.grupo} · ${money(maxExpense.valor)}` : "Sem dados"}</dd></div>
        <div><dt>Grupo de maior custo</dt><dd>${maxCategory[0]}${maxCategory[1] ? ` · ${money(maxCategory[1])}` : ""}</dd></div>
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
      .filter((m) => m.grupo === "COMBUSTÍVEL" && m.tanque_completo !== "NAO" && +m.quantidade_litros > 0)
      .sort(
        (a, b) =>
          new Date(b.data_hora) - new Date(a.data_hora) ||
          +b.hodometro_km - +a.hodometro_km,
      )[0];
  $("#selectedVehicleLabel").textContent = `Veículo selecionado · ${v || "Nenhum veículo"}`;
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
  $("#vehicleCards").innerHTML = alpha(vehicles)
    .map((x) => {
      const z = vehicleSummary(x);
      const selected = x.nome === v;
      return `<button type="button" class="vehicle-card ${x.padrao ? "default" : ""} ${x.ativo === false ? "inactive" : ""} ${selected ? "selected" : ""}" data-select-vehicle="${x.nome}" aria-pressed="${selected}"><div><b>${x.nome}</b><small>${x.ativo === false ? "Inativo · somente consultas" : "Ativo"}${x.padrao ? " · Padrão" : ""}</small></div><strong>${intFmt(z.last)} km</strong><span>Inicial ${intFmt(z.initial)} · Rodados ${intFmt(z.driven)} km · ${z.driven ? money(z.stats.net / z.driven) : money(0)}/km</span>${x.padrao ? '<em>PADRÃO</em>' : ""}${selected ? '<i>SELECIONADO</i>' : ""}</button>`;
    })
    .join("");
  $$("[data-select-vehicle]").forEach((button) => {
    button.onclick = () => selectVehicle(button.dataset.selectVehicle);
  });
}
function deleteMovement(id) {
  const rows = movements.filter((x) => sameMovement(x, id));
  const m = rows[0];
  if (!m) return;
  const total = rows.reduce((sum, row) => sum + (+row.valor || 0), 0);
  const resumo = `${rows.length} item(ns) de ${m.grupo}, em ${new Date(m.data_hora).toLocaleDateString("pt-BR")}, no valor de ${money(total)}`;
  if (
    !confirm(
      `Excluir este lançamento?\n\n${resumo}\n\nEsta ação não poderá ser desfeita.`,
    )
  )
    return;
  const stateBeforeSave = cloneDataState();
  try {
    movements = movements.filter((x) => !sameMovement(x, id));
    recalculateDistances();
    save();
    showToast("Lançamento excluído com sucesso.");
  } catch (error) {
    restoreDataState(stateBeforeSave);
    console.error("Falha ao excluir o lançamento:", error);
    alert("Não foi possível excluir o lançamento. Nenhum dado foi alterado.");
  }
}
function viewMovement(id) {
  const rows = movements.filter((x) => sameMovement(x, id));
  const m = rows[0];
  if (!m) return;
  const total = rows.reduce((sum, row) => sum + (+row.valor || 0), 0);
  const details = rows.map((row) => `• ${row.item}: ${money(row.valor)}`).join("\n");
  alert(
    `${ENTRY_GROUP_NAMES[m.grupo] || m.grupo}\n\n` +
    `Data: ${new Date(m.data_hora).toLocaleDateString("pt-BR")}\n` +
    `Veículo: ${m.veiculo || "Não informado"}\n` +
    `Hodômetro: ${intFmt(m.hodometro_km)} km\n` +
    `Local: ${m.fornecedor || m.local || "Não informado"}\n\n` +
    `${details}\n\nTotal: ${money(total)}\n` +
    `Observação: ${m.observacao && m.observacao !== "N.I." ? m.observacao : "Não informada"}`,
  );
}
function renderMovements() {
  const v = selectedVehicleName(),
    t = $("#typeFilter").value,
    q = $("#search").value.toLowerCase();
  const rows = filterByPeriod(filtered(v), "movement")
    .filter(
      (m) =>
        (!t || m.grupo === t) &&
        (!q || JSON.stringify(m).toLowerCase().includes(q)),
    )
    .sort(newestFirst);
  const ms = groupedMovements(rows);
  $("#movementCount").textContent = `${ms.length} movimento(s) · ${rows.length} item(ns) · Período: ${periodText("movement")}`;
  $("#movementList").innerHTML =
    ms.map((m) => item(m, true)).join("") ||
    '<p class="muted">Nenhum lançamento.</p>';
  $$("[data-edit-movement]").forEach(
    (b) => (b.onclick = () => {
      const row = movements.find((m) => sameMovement(m, b.dataset.editMovement));
      if (!row) return alert("Não foi possível localizar este movimento. Atualize a tela e tente novamente.");
      openEntry(b.dataset.editMovement);
    }),
  );
  $$("[data-view-movement]").forEach(
    (b) => (b.onclick = () => viewMovement(b.dataset.viewMovement)),
  );
  $$("[data-delete-movement]").forEach(
    (b) => (b.onclick = () => deleteMovement(b.dataset.deleteMovement)),
  );
}
function groupTotals(ms) {
  const g = { Combustível: 0, Administrativo: 0, Manutenção: 0, Receitas: 0 };
  ms.forEach((m) => {
    if (m.grupo === "COMBUSTÍVEL") g.Combustível += +m.valor || 0;
    else if (m.grupo === "ADMINISTRATIVO") g.Administrativo += +m.valor || 0;
    else if (m.grupo === "MANUTENÇÃO") g.Manutenção += +m.valor || 0;
    else if (m.grupo === "RECEITA") g.Receitas += +m.valor || 0;
  });
  return g;
}
function categoryCostTable(ms) {
  const s = stats(ms),
    g = groupTotals(ms),
    expenses = [
      ["Combustível", g.Combustível],
      ["Administrativo", g.Administrativo],
      ["Manutenção", g.Manutenção],
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
  return `<div class="category-table-wrap"><table class="category-cost-table"><thead><tr><th>Grupo</th><th>Participação</th><th>Valor</th><th>Custo/km</th><th>Custo/dia</th></tr></thead><tbody>${rows}<tr class="total-expenses"><th scope="row">Total de gastos</th><td>${totalExpenses ? num(100, 1) + "%" : "0,0%"}</td><td>${money(totalExpenses)}</td><td>${money(perKm(totalExpenses))}</td><td>${money(perDay(totalExpenses))}</td></tr><tr class="income-row"><th scope="row">Receitas</th><td>—</td><td>− ${money(income)}</td><td>− ${money(perKm(income))}</td><td>− ${money(perDay(income))}</td></tr><tr class="net-cost-row"><th scope="row">Custo líquido</th><td>—</td><td>${money(net)}</td><td>${money(perKm(net))}</td><td>${money(perDay(net))}</td></tr></tbody></table></div>`;
}
function renderReports() {
  const ms = filterByPeriod(filtered(selectedVehicleName()), "report"),
    s = stats(ms);
  $("#reportPeriodLabel").textContent = `Período: ${periodText("report")}`;
  $("#grossTotal").textContent = money(s.cost);
  $("#reportNet").textContent = money(s.net);
  $("#incomeTotal").textContent = money(s.income);
  $("#reportDistance").textContent = intFmt(s.km) + " km";
  const fuels = {};
  ms.filter((m) => m.grupo === "COMBUSTÍVEL").forEach((m) => {
    const k = m.item || "Combustível",
      g = fuels[k] || (fuels[k] = { c: 0, l: 0, d: 0 });
    g.c += +m.valor || 0;
    if (m.tanque_completo !== "NAO") {
      g.l += +m.quantidade_litros || 0;
      g.d += +(m.distancia_abastecimento_km ?? m.distancia_km) || 0;
    }
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
function chartTextColor() {
  return document.documentElement.dataset.theme === "light" ? "#172b3a" : "#d8e9f6";
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
  c.fillStyle = chartTextColor();
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
    c.fillStyle = chartTextColor();
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
    c.fillStyle = chartTextColor();
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
    c.fillStyle = chartTextColor();
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
        (y[k] || 0) + (m.grupo === "RECEITA" ? -(+m.valor || 0) : +m.valor || 0);
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
  c.strokeStyle = "#6f8ba166"; c.fillStyle = chartTextColor(); c.lineWidth = 1; c.font = "11px system-ui";
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
    c.fillStyle = chartTextColor(); c.font = "11px system-ui";
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
    c.fillStyle = chartTextColor(); c.textAlign = "right"; c.fillText(axisLabel(value, "thousands"), left - 7, y + 4);
  }
  values.forEach((value, i) => {
    const barW = Math.max(5, step * .62), x = left + i * step + (step - barW) / 2,
      bh = value / max * plotH, y = top + plotH - bh;
    c.fillStyle = "#246b9e"; c.fillRect(x, y, barW, bh);
    c.fillStyle = chartTextColor(); c.save(); c.translate(x + barW / 2, h - bottom + 17);
    if (labels.length > 6) c.rotate(-Math.PI / 5);
    c.textAlign = labels.length > 6 ? "right" : "center"; c.fillText(labels[i], 0, 0); c.restore();
  });
}
function annualChartData(ms) {
  const byYear = {};
  ms.forEach((m) => {
    const year = (m.data_hora || "").slice(0, 4); if (!year) return;
    const item = byYear[year] ||= { net: 0, distance: 0, liters: 0, dates: [] };
    item.net += m.grupo === "RECEITA" ? -(+m.valor || 0) : +m.valor || 0;
    item.dates.push((m.data_hora || "").slice(0, 10));
    if (m.grupo === "COMBUSTÍVEL" && m.tanque_completo !== "NAO" && +m.quantidade_litros > 0 && +m.distancia_abastecimento_km > 0) {
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
    c.fillStyle = chartTextColor(); c.textAlign = "right"; c.fillText(axisLabel(value, format), left - 7, y + 4);
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
    c.fillStyle = ser.color; c.fillRect(lx, 13, 12, 12); c.fillStyle = chartTextColor(); c.textAlign = "left"; c.fillText(ser.name, lx + 17, 23);
  });
  labels.forEach((label, i) => {
    const x = labels.length === 1 ? left + plotW / 2 : left + plotW * i / Math.max(labels.length - 1, 1);
    c.fillStyle = chartTextColor(); c.textAlign = "center"; c.fillText(label, x, h - bottom + 20);
  });
}
function annualFinancialData(ms) {
  const byYear = {};
  ms.forEach(m => {
    const y = String(m.data_hora || "").slice(0,4); if (!y) return;
    const o = byYear[y] ||= { gross:0, income:0 };
    if (m.grupo === "RECEITA") o.income += +m.valor || 0; else o.gross += +m.valor || 0;
  });
  const years = Object.keys(byYear).sort();
  return { years, gross: years.map(y=>byYear[y].gross), income: years.map(y=>byYear[y].income), net: years.map(y=>byYear[y].gross-byYear[y].income) };
}
function costCompositionData(ms) {
  const s = stats(ms), g = groupTotals(ms), labels = ["Combustível", "Administrativo", "Manutenção"],
    totals = [g.Combustível, g.Administrativo, g.Manutenção];
  const sub = {};
  ms.filter(m => m.grupo !== "RECEITA").forEach(m => {
    const k = m.item || "Não informado"; sub[k] = (sub[k] || 0) + (+m.valor || 0);
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
  if (group === "ITEM")
    rows = registers.map((r) => ({
      id: r.id,
      title: r.item,
      sub: `${r.grupo}${r.padrao ? " · Padrão" : ""}`,
      active: r.ativo !== false,
      standard: !!r.padrao,
    }));
  if (group === "MOTORISTA")
    rows = drivers.map((r) => ({
      id: r.id,
      title: r.nome,
      sub: r.padrao ? "Padrão" : "Motorista",
      active: r.ativo !== false,
      standard: !!r.padrao,
    }));
  if (group === "FORNECEDOR")
    rows = suppliers.map((r) => ({id:r.id,title:r.nome,sub:r.local || "Local não informado",active:r.ativo !== false,standard:!!r.padrao}));
  if (group === "FORMA_PAGAMENTO")
    rows = paymentMethods.map((r) => ({id:r.id,title:r.nome,sub:"Forma de pagamento",active:r.ativo !== false,standard:!!r.padrao}));
  if (group === "VEICULO")
    rows = vehicles.map((r) => {
      const z = vehicleSummary(r);
      return {
        id: r.id,
        title: r.nome,
        sub: `${r.placa || "Sem placa"} · ${r.anoFabricacao || "—"}/${r.anoModelo || "—"}`,
        active: r.ativo !== false,
        standard: !!r.padrao,
        vehicleMetrics: [
          ["Hodômetro inicial", `${intFmt(z.initial)} km`],
          ["Hodômetro atual", `${intFmt(z.last)} km`],
          ["Total rodado", `${intFmt(z.driven)} km`],
          ["Capacidade do tanque", `${num(r.capacidadeTanque || 0,1)} L`],
          ["Motorização", ({FLEX:"Flex",GASOLINA:"Gasolina",ETANOL:"Etanol",DIESEL:"Diesel"})[r.motorizacao] || "Flex"],
        ],
      };
    });
  const titles = {ITEM:["Classificação dos lançamentos","Itens de lançamento"],MOTORISTA:["Veículo e utilização","Motoristas"],VEICULO:["Veículo e utilização","Veículos"],FORNECEDOR:["Fornecedores e pagamentos","Fornecedores"],FORMA_PAGAMENTO:["Fornecedores e pagamentos","Formas de pagamento"]};
  const [eyebrow,title] = titles[group];
  $("#registerEyebrow").textContent = eyebrow;
  $("#registerGroupTitle").textContent = title;
  [["ITEM",registers],["MOTORISTA",drivers],["VEICULO",vehicles],["FORNECEDOR",suppliers],["FORMA_PAGAMENTO",paymentMethods]].forEach(([key,arr]) => $("#count"+key).textContent = arr.length);
  const term = ($("#registerSearch").value || "").trim().toLocaleLowerCase("pt-BR");
  const status = $("#registerStatusFilter").value;
  rows = rows.filter(r => {
    const source = group === "ITEM" ? registers : group === "MOTORISTA" ? drivers : group === "VEICULO" ? vehicles : group === "FORNECEDOR" ? suppliers : paymentMethods;
    const item = source.find(x => x.id === r.id) || {};
    const active = item.ativo !== false;
    return (!term || `${r.title} ${r.sub}`.toLocaleLowerCase("pt-BR").includes(term)) &&
      (status === "TODOS" || (status === "ATIVOS" && active) || (status === "INATIVOS" && !active) || (status === "PADRAO" && item.padrao));
  });
  rows.sort((a, b) =>
    a.title.localeCompare(b.title, "pt-BR", { sensitivity: "base", numeric: true }),
  );
  $("#registerCountText").textContent = `${rows.length} ${rows.length === 1 ? "registro exibido" : "registros exibidos"}`;
  $$("[data-register-group]").forEach(b => b.classList.toggle("active", b.dataset.registerGroup === group));
  $("#registerList").innerHTML =
    rows
      .map(
        (r) => {
          const badges = `<span class="register-badge ${r.active ? "active" : "inactive"}">${r.active ? "ATIVO" : "INATIVO"}</span>${r.standard ? '<span class="register-badge standard">PADRÃO</span>' : ""}`;
          const metrics = r.vehicleMetrics
            ? `<div class="register-metrics">${r.vehicleMetrics.map(([label,value]) => `<div><small>${label}</small><strong>${value}</strong></div>`).join("")}</div>`
            : "";
          return `<article class="register-card ${r.vehicleMetrics ? "vehicle-register-card" : ""}">
            <div class="register-card-main">
              <div class="register-card-title"><div><b>${r.title}</b><small>${r.sub}</small></div><div class="register-badges">${badges}</div></div>
              ${metrics}
            </div>
            <div class="register-card-actions">
              <button class="register-edit-action" data-edit="${r.id}"><span aria-hidden="true">✎</span> Alterar</button>
              <button class="register-delete-action" data-delete="${r.id}"><span aria-hidden="true">♲</span> Excluir</button>
            </div>
          </article>`;
        },
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
  renderAlerts();
  setTimeout(renderCharts, 50);
}
let currentPageId = "inicio";
const pageTrail = [];

function activeDialog() {
  return [...document.querySelectorAll("dialog[open]")].at(-1) || null;
}
function requestDialogClose(dialog) {
  if (!dialog?.open) return false;
  const cancelEvent = new Event("cancel", { cancelable: true });
  const shouldClose = dialog.dispatchEvent(cancelEvent);
  if (shouldClose && dialog.open) dialog.close();
  return true;
}
function go(id, options = {}) {
  if (!document.getElementById(id)) return;
  if (id !== currentPageId && !options.fromBack && !options.replace) {
    pageTrail.push(currentPageId);
  }
  currentPageId = id;
  $$(".page").forEach((p) => p.classList.toggle("active", p.id === id));
  $$("nav button").forEach((b) =>
    b.classList.toggle("active", b.dataset.page === id),
  );
  if (id === "graficos") setTimeout(renderCharts, 50);
  if (id === "cadastros") showRegisterHub();
  if (id === "alertas") renderAlerts();
  window.scrollTo({ top: 0, behavior: options.instant ? "auto" : "smooth" });
}
function navigateBack() {
  const dialog = activeDialog();
  if (dialog) return requestDialogClose(dialog);
  const previous = pageTrail.pop();
  if (previous && previous !== currentPageId) {
    go(previous, { fromBack: true });
    return true;
  }
  if (currentPageId !== "inicio") {
    go("inicio", { fromBack: true });
    return true;
  }
  return false;
}
$$("[data-page]").forEach((b) => (b.onclick = () => go(b.dataset.page)));
$$("[data-go]").forEach((b) => (b.onclick = () => go(b.dataset.go)));
$$("[data-back]").forEach((b) => (b.onclick = navigateBack));

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  if (activeDialog()) return; // O próprio dialog dispara o evento cancel.
  if (navigateBack()) event.preventDefault();
});

window.addEventListener("popstate", () => {
  navigateBack();
  history.pushState({ mycar: true }, "", window.location.href);
});
if (!history.state?.mycar) history.replaceState({ mycar: true }, "", window.location.href);
history.pushState({ mycar: true }, "", window.location.href);

function installNativeBackHandler() {
  const appPlugin = window.Capacitor?.Plugins?.App;
  if (!appPlugin?.addListener) return;
  appPlugin.addListener("backButton", ({ canGoBack } = {}) => {
    if (navigateBack()) return;
    if (canGoBack) history.back();
  }).catch?.((error) => console.warn("Não foi possível registrar o botão Voltar:", error));
}
installNativeBackHandler();
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
function updateEntryLists() {
  const f = $("#entryForm"),
    oldGroup = f.grupo.value,
    categories = [
      ...new Set(registers.map((r) => r.grupo).filter(Boolean)),
    ];
  f.grupo.innerHTML = categories
    .map((c) => `<option>${c}</option>`)
    .join("");
  if (categories.includes(oldGroup)) f.grupo.value = oldGroup;
  refreshMovementItemOptions();
  const fuel = f.grupo.value === "COMBUSTÍVEL";
  $("#fuelFields").hidden = !fuel;
  $("#tankCompleteField").hidden = !fuel;
}
const ENTRY_GROUP_NAMES = {
  "COMBUSTÍVEL": "Abastecimento",
  "MANUTENÇÃO": "Manutenção",
  "ADMINISTRATIVO": "Administrativo",
  "RECEITA": "Receita",
};
function configureEntryGroup(group, editing = false) {
  const f = $("#entryForm"),
    name = ENTRY_GROUP_NAMES[group] || group;
  f.grupo.value = group;
  $("#entryGroupName").textContent = name;
  $("#entryGroupEyebrow").textContent = name;
  $("#entryTitle").textContent = editing ? `Alterar ${name.toLowerCase()}` : `Novo ${name.toLowerCase()}`;
  $("#changeEntryGroup").hidden = editing;
  $("#entrySupplierLabel").textContent =
    group === "COMBUSTÍVEL" ? "Posto / fornecedor" :
    group === "MANUTENÇÃO" ? "Oficina / fornecedor" :
    group === "ADMINISTRATIVO" ? "Órgão / fornecedor" : "Origem / pagador";
  $("#entryOptionalSummary").textContent =
    group === "COMBUSTÍVEL" ? "Motorista, posto, pagamento e observação" :
    group === "MANUTENÇÃO" ? "Motorista, oficina, pagamento e observação" :
    group === "ADMINISTRATIVO" ? "Órgão, pagamento e observação" :
    "Origem do recebimento, pagamento e observação";
  updateEntryLists();
}
function groupRegisters(group) {
  return alpha(registers.filter((r) => r.grupo === group && r.ativo !== false), "item");
}
function movementItemRow(data = {}) {
  const row = document.createElement("div");
  const fuel = $("#entryForm").grupo.value === "COMBUSTÍVEL";
  row.className = "movement-item-row";
  row.dataset.itemId = data.id || "";
  row.innerHTML = `<div class="item-row-grid"><label>Item de lançamento *<div class="context-field"><select class="movement-item-select" required></select><button type="button" class="context-open context-item-open" aria-label="Consultar itens">›</button></div></label><label class="item-value">Valor (R$) *<input class="movement-item-value" type="text" inputmode="numeric" required></label><button type="button" class="remove-movement-item" aria-label="Remover item">×</button></div>${fuel ? '<label class="fuel-price">Preço por litro (R$) *<input class="movement-item-price" type="text" inputmode="numeric" required></label><small class="movement-item-liters field-help"></small>' : ""}`;
  const select = row.querySelector(".movement-item-select"),
    value = row.querySelector(".movement-item-value"),
    price = row.querySelector(".movement-item-price");
  fillMovementItemSelect(select, data.item);
  row.querySelector(".context-item-open").onclick = () => openContextSelector("ITEM", select);
  if (data.valor) value.value = num(data.valor, 2);
  if (price && data.preco_unitario) price.value = num(data.preco_unitario, 2);
  [value, price].filter(Boolean).forEach((input) => input.addEventListener("input", () => {
    formatMoneyInput(input);
    updateMovementTotal();
    updateItemLiters(row);
  }));
  row.querySelector(".remove-movement-item").onclick = () => {
    row.remove();
    if (!$("#movementItems").children.length) addMovementItem();
    refreshMovementItemControls();
    updateMovementTotal();
  };
  $("#movementItems").appendChild(row);
  updateItemLiters(row);
  refreshMovementItemControls();
}
function fillMovementItemSelect(select, selected = "") {
  const allowed = groupRegisters($("#entryForm").grupo.value);
  select.innerHTML = allowed.map((r) => `<option value="${esc(r.item)}">${esc(r.item)}</option>`).join("");
  if (allowed.some((r) => r.item === selected)) select.value = selected;
}
function refreshMovementItemOptions() {
  $$("#movementItems .movement-item-select").forEach((select) => {
    const previous = select.value;
    fillMovementItemSelect(select, previous);
  });
  refreshMovementItemControls();
}
function addMovementItem(data = {}) {
  movementItemRow(data);
}
function refreshMovementItemControls() {
  const rows = $$("#movementItems .movement-item-row"),
    locked = rows.length > 1;
  $("#entryForm").grupo.disabled = locked;
  $("#entryForm").grupo.classList.toggle("group-locked", locked);
  $("#groupLockHelp").textContent = locked
    ? "Grupo bloqueado: todos os itens deste movimento pertencem ao mesmo Grupo."
    : "O botão + mostra somente itens pertencentes ao Grupo escolhido.";
  rows.forEach((row) => row.querySelector(".remove-movement-item").disabled = rows.length === 1);
}
function updateItemLiters(row) {
  const help = row.querySelector(".movement-item-liters"),
    fuel = $("#entryForm").grupo.value === "COMBUSTÍVEL",
    priceInput = row.querySelector(".movement-item-price"),
    price = moneyInputNumber(priceInput?.value),
    value = moneyInputNumber(row.querySelector(".movement-item-value").value);
  if (fuel && help) help.textContent = price > 0 && value > 0
    ? `${num(value / price, 3)} litros calculados`
    : "Informe valor e preço por litro.";
}
function updateMovementTotal() {
  const total = $$("#movementItems .movement-item-value")
    .reduce((sum, input) => sum + moneyInputNumber(input.value), 0);
  $("#movementTotal").textContent = money(total);
}
function movementDateTimeForEdit(date, current = null) {
  const day = String(date || "").slice(0, 10);
  const savedTime = String(current?.data_hora || "").slice(11, 19);
  const time = /^\d{2}:\d{2}:\d{2}$/.test(savedTime) ? savedTime : "12:00:00";
  return day ? `${day}T${time}` : "";
}
function kmBounds(date, vehicle, excludeId = "") {
  const current = excludeId
      ? movements.find((m) => sameMovement(m, excludeId)) || null
      : null,
    referenceDateTime = movementDateTimeForEdit(date, current),
    referenceTime = new Date(referenceDateTime).getTime(),
    referenceOrder = current
      ? (+current.ordem_lancamento || 0)
      : Number.MAX_SAFE_INTEGER,
    ms = movements.filter(
      (m) =>
        !sameMovement(m, excludeId) &&
        m.veiculo === vehicle &&
        +m.hodometro_km > 0 &&
        m.data_hora,
    ),
    position = (m) => ({
      time: new Date(m.data_hora).getTime(),
      order: +m.ordem_lancamento || 0,
    }),
    isBefore = (m) => {
      const p = position(m);
      return p.time < referenceTime ||
        (p.time === referenceTime && p.order < referenceOrder);
    },
    isAfter = (m) => {
      const p = position(m);
      return p.time > referenceTime ||
        (p.time === referenceTime && p.order > referenceOrder);
    };
  const previous = ms
    .filter(isBefore)
    .sort((a, b) => new Date(b.data_hora) - new Date(a.data_hora) ||
      (+b.ordem_lancamento || 0) - (+a.ordem_lancamento || 0))[0];
  const next = ms
    .filter(isAfter)
    .sort((a, b) => new Date(a.data_hora) - new Date(b.data_hora) ||
      (+a.ordem_lancamento || 0) - (+b.ordem_lancamento || 0))[0];
  return { prev: previous, next, referenceDateTime };
}
function updateKm() {
  const f = $("#entryForm"),
    id = f.movementId.value,
    current = id ? movements.find((m) => sameMovement(m, id)) : null,
    v = current
      ? vehicles.find((x) => x.nome === current.veiculo)
      : vehicles.find((x) => x.nome === selectedVehicleName()),
    b = kmBounds(f.data.value, v?.nome || "", id),
    base = b.prev?.hodometro_km ?? v?.kmInicial ?? 0;
  $("#lastKm").textContent = `${intFmt(base)} km`;
  if (!current && !String(f.km.value || "").replace(/\D/g, ""))
    f.km.value = intFmt(base);
  $("#kmRule").textContent = b.next
    ? `Hodômetro permitido: de ${intFmt(base)} a ${intFmt(b.next.hodometro_km)} km.`
    : `O hodômetro não pode ser menor que ${intFmt(base)} km.`;
}
function openEntry(id = "", presetGroup = "") {
  const f = $("#entryForm"),
    currentRows = id ? movements.filter((m) => sameMovement(m, id)) : [],
    current = currentRows[0] || null,
    v = current
      ? vehicles.find((x) => x.nome === current.veiculo)
      : selectedVehicleObject(),
    err = $("#formError");
  entryReturnPage = currentPageId || "movimentos";
  f.reset();
  f.movementId.value = id;
  $("#movementItems").innerHTML = "";
  err.textContent = "";
  if (!v || (!current && v.ativo === false)) {
    alert("Selecione um veículo ativo na tela inicial antes de realizar novos lançamentos.");
    go("inicio");
    return;
  }
  $("#entryVehicleName").textContent = `${v.nome}${current && v.ativo === false ? " · inativo (histórico editável)" : ""}`;
  f.data.value = current
    ? String(current.data_hora).slice(0, 10)
    : new Date().toISOString().slice(0, 10);
  updateEntryLists();
  if (current) {
    configureEntryGroup(current.grupo, true);
    currentRows.forEach((row) => addMovementItem(row));
    f.km.value = intFmt(current.hodometro_km);
    f.tanqueCompleto.checked = current.tanque_completo !== "NAO";
    f.motorista.value = current.motorista || "";
    f.observacao.value =
      current.observacao === "N.I." ? "" : current.observacao || "";
    f.latitude.value = current.latitude ?? "";
    f.longitude.value = current.longitude ?? "";
    f.precisaoGps.value = current.precisao_gps_m ?? "";
  } else {
    configureEntryGroup(presetGroup || GROUPS[0], false);
    addMovementItem();
  }
  fillDrivers();
  fillOperationalLists();
  if (current) {
    f.motorista.value = current.motorista || "";
    f.fornecedor.value = current.fornecedor || current.local || "";
    f.formaPagamento.value = current.forma_pagamento || "";
    f.incluirIndicadores.checked = current.incluir_indicadores !== "NAO";
  }
  $("#entryGpsStatus").textContent = validCoordinate(f.latitude.value)
    ? `Localização salva${f.precisaoGps.value ? ` · precisão aproximada de ${Math.round(f.precisaoGps.value)} m` : ""}.`
    : "Localização opcional. O GPS é acionado somente ao tocar no botão.";
  updateMapLink($("#openEntryMap"), f.latitude.value, f.longitude.value);
  updateKm();
  updateMovementTotal();
  $("#entryDialog").showModal();
}
function openEntryGroupChooser() {
  const v = selectedVehicleObject();
  if (!v || v.ativo === false) {
    openEntry();
    return;
  }
  $("#entryGroupDialog").showModal();
}
$("#closeEntryGroups").onclick = () => $("#entryGroupDialog").close();
$$("[data-entry-group]").forEach((button) => button.onclick = () => {
  if ($("#entryGroupDialog").open) $("#entryGroupDialog").close();
  openEntry("", button.dataset.entryGroup);
});
$("#changeEntryGroup").onclick = () => {
  $("#entryDialog").close();
  go("movimentos");
};
$("#entryForm [name=grupo]").onchange = () => {
  updateEntryLists();
  $$("#movementItems .movement-item-value,.movement-item-price").forEach((input) => input.value = "");
  updateMovementTotal();
};
$("#addMovementItem").onclick = () => addMovementItem();
$("#useCurrentLocation").onclick = () => {
  const f = $("#entryForm"),
    button = $("#useCurrentLocation"),
    status = $("#entryGpsStatus");
  requestCurrentPosition(button, status, async (coords) => {
    f.latitude.value = Number(coords.latitude).toFixed(7);
    f.longitude.value = Number(coords.longitude).toFixed(7);
    f.precisaoGps.value = Math.round(coords.accuracy || 0);
    updateMapLink($("#openEntryMap"), f.latitude.value, f.longitude.value);
    const nearest = nearestSupplier(coords.latitude, coords.longitude);
    if (nearest && nearest.distance <= gpsSupplierRadiusMeters()) {
      f.fornecedor.value = nearest.supplier.nome;
      status.textContent = `${nearest.supplier.nome} sugerido a aproximadamente ${Math.round(nearest.distance)} m. Confirme ou altere o fornecedor.`;
    } else {
      status.textContent = "Coordenadas obtidas. Procurando o fornecedor do local…";
      try {
        const place = await reverseGeocode(coords.latitude, coords.longitude);
        const detected = selectDetectedSupplier(f.fornecedor, place.supplier);
        status.textContent = detected
          ? `${place.supplier} identificado pelo GPS${place.address ? ` · ${place.address}` : ""}. Confirme ou altere.`
          : `Coordenadas salvas${place.address ? ` · ${place.address}` : ""}. O nome do fornecedor não foi identificado; selecione-o manualmente.`;
      } catch (error) {
        status.textContent = nearest
          ? `Coordenadas salvas. O fornecedor cadastrado mais próximo está a ${Math.round(nearest.distance)} m; selecione-o manualmente.`
          : "Coordenadas salvas. A consulta automática do fornecedor está indisponível; selecione-o manualmente.";
      }
    }
  });
};
$("#entryForm [name=data]").onchange = () => {
  const f = $("#entryForm");
  if (!f.movementId.value) f.km.value = "";
  updateKm();
};
$("#entryForm [name=km]").oninput = (e) =>
  (e.target.value = intFmt(String(e.target.value).replace(/\D/g, "")));
function moneyInputNumber(value) {
  const digits = String(value ?? "").replace(/\D/g, "");
  return digits ? Number(digits) / 100 : 0;
}
function formatMoneyInput(input) {
  const value = moneyInputNumber(input.value);
  input.value = value ? num(value, 2) : "";
}
const entryDialogElement = $("#entryDialog"),
  nativeShowEntry = entryDialogElement.showModal.bind(entryDialogElement);
entryDialogElement.showModal = () => {
  nativeShowEntry();
};
function entryHasChanges() {
  const f = $("#entryForm");
  return Boolean(f.movementId.value || f.observacao.value.trim() ||
    $$("#movementItems .movement-item-value").some((x) => x.value.trim()) ||
    f.latitude.value || f.longitude.value);
}
function cancelEntry() {
  if (entryHasChanges() && !confirm("Descartar as alterações deste lançamento?")) return;
  entryDialogElement.close();
}
$$('#entryForm [value="cancel"]').forEach((button) => {
  button.type = "button";
  button.onclick = cancelEntry;
});
entryDialogElement.addEventListener("cancel", (event) => {
  event.preventDefault();
  cancelEntry();
});
const contextSelectorDialog = $("#contextSelectorDialog");
function contextRecords() {
  if (!entryContext) return [];
  if (entryContext.type === "ITEM") return groupRegisters($("#entryForm").grupo.value)
    .map((row) => ({ value: row.item, label: row.item, meta: row.padrao ? "Padrão" : "" }));
  const source = entryContext.type === "MOTORISTA"
    ? drivers
    : suppliers.filter((row) => row.ativo !== false);
  return alpha(source).map((row) => ({
    value: row.nome,
    label: row.nome,
    meta: [row.padrao ? "Padrão" : "", row.local || ""].filter(Boolean).join(" · "),
  }));
}
function renderContextSelector() {
  if (!entryContext) return;
  const term = $("#contextSelectorSearch").value.trim().toLocaleLowerCase("pt-BR");
  const rows = contextRecords().filter((row) =>
    `${row.label} ${row.meta}`.toLocaleLowerCase("pt-BR").includes(term));
  $("#contextSelectorList").innerHTML = rows.length
    ? rows.map((row) => `<button type="button" class="context-choice" data-value="${esc(row.value)}"><span><b>${esc(row.label)}</b><small>${esc(row.meta || "Disponível")}</small></span><i>›</i></button>`).join("")
    : '<div class="empty-state">Nenhum cadastro encontrado. Use o botão verde “＋ Novo”.</div>';
  $$("#contextSelectorList .context-choice").forEach((button) => button.onclick = () => {
    entryContext.target.value = button.dataset.value;
    contextSelectorDialog.close();
    entryContext = null;
  });
}
function openContextSelector(type, target) {
  entryContext = { type, target };
  $("#contextSelectorTitle").textContent =
    type === "ITEM" ? "Selecionar item" :
    type === "MOTORISTA" ? "Selecionar motorista" : "Selecionar fornecedor";
  $("#contextSelectorHint").textContent = type === "ITEM"
    ? `Somente itens do grupo ${$("#entryForm").grupo.value} são apresentados.`
    : "Selecione um cadastro existente ou inclua um novo sem perder o lançamento.";
  $("#contextSelectorSearch").value = "";
  renderContextSelector();
  contextSelectorDialog.showModal();
}
function closeContextSelector() {
  if (contextSelectorDialog.open) contextSelectorDialog.close();
  entryContext = null;
}
$("#contextSelectorSearch").oninput = renderContextSelector;
$("#closeContextSelector").onclick = closeContextSelector;
$("#cancelContextSelector").onclick = closeContextSelector;
contextSelectorDialog.addEventListener("cancel", (event) => {
  event.preventDefault();
  closeContextSelector();
});
$$(".context-open[data-context-type]").forEach((button) => button.onclick = () => {
  const type = button.dataset.contextType;
  const name = type === "MOTORISTA" ? "motorista" : "fornecedor";
  openContextSelector(type, $(`#entryForm [name=${name}]`));
});
$("#newContextRegister").onclick = () => {
  if (!entryContext) return;
  const type = entryContext.type;
  contextSelectorDialog.close();
  $("#registerGroup").value = type;
  openRegister();
  if (type === "ITEM") {
    const groupField = $("#registerForm [name=grupo]");
    groupField.value = $("#entryForm").grupo.value;
    groupField.disabled = true;
  }
};
$("#entryForm").onsubmit = (e) => {
  if (e.submitter?.value === "cancel") return;
  e.preventDefault();
  const f = e.target,
    d = Object.fromEntries(new FormData(f)),
    id = f.movementId.value,
    currentRows = id ? movements.filter((m) => sameMovement(m, id)) : [],
    current = currentRows[0] || null,
    kmText = String(d.km || "").replace(/\D/g, ""),
    km = +kmText,
    err = $("#formError"),
    v = current
      ? vehicles.find((x) => x.nome === current.veiculo)
      : vehicles.find((x) => x.nome === selectedVehicleName());
  d.grupo = f.grupo.value;
  if (!v || (!current && v.ativo === false)) {
    err.textContent = "Selecione um veículo ativo na tela inicial antes de realizar novos lançamentos.";
    return;
  }
  d.veiculo = v.nome;
  if (!d.data || !kmText) {
    err.textContent = "Data e hodômetro são obrigatórios para salvar.";
    return;
  }
  const itemRows = $$("#movementItems .movement-item-row").map((row) => ({
    sourceId: row.dataset.itemId,
    item: row.querySelector(".movement-item-select").value,
    valor: moneyInputNumber(row.querySelector(".movement-item-value").value),
    preco: moneyInputNumber(row.querySelector(".movement-item-price")?.value),
  }));
  const allowedItems = new Set(groupRegisters(d.grupo).map((r) => r.item));
  if (!GROUPS.includes(d.grupo) || !itemRows.length) {
    err.textContent = "Grupo e pelo menos um item de lançamento são obrigatórios.";
    return;
  }
  if (itemRows.some((row) => !row.item || !allowedItems.has(row.item))) {
    err.textContent = "Existe item incompatível com o Grupo selecionado. Remova-o ou escolha um item pertencente a este Grupo.";
    return;
  }
  if (itemRows.some((row) => !(row.valor >= 0))) {
    err.textContent = "Informe o valor de todos os itens.";
    return;
  }
  if (d.grupo === "COMBUSTÍVEL" && itemRows.some((row) => !(row.preco > 0 && row.valor > 0))) {
    err.textContent = "Informe o preço por litro e o valor de cada abastecimento.";
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
  const duplicate = movements.some((m) =>
    !sameMovement(m, id) &&
    m.veiculo === d.veiculo &&
    String(m.data_hora).slice(0, 10) === d.data &&
    itemRows.some((row) => row.item === m.item && Number(row.valor) === Number(m.valor)));
  if (duplicate && !confirm("Já existe lançamento para o mesmo veículo, data, item e valor. Deseja salvar mesmo assim?")) return;
  const prevAny = b.prev,
    dist = Math.max(0, km - (+prevAny?.hodometro_km || +v.kmInicial || 0)),
    prevFuel = [...movements]
      .filter(
        (m) =>
          !sameMovement(m, id) &&
          m.veiculo === d.veiculo &&
          m.grupo === "COMBUSTÍVEL" &&
          String(m.data_hora).slice(0, 10) <= d.data &&
          +m.hodometro_km <= km,
      )
      .sort((a, b) => b.hodometro_km - a.hodometro_km)[0],
    fuelDist = Math.max(0, km - (+prevFuel?.hodometro_km || +v.kmInicial || 0)),
    movementId = id || crypto.randomUUID(),
    common = {
      movimento_id: movementId,
      ordem_lancamento:
        current?.ordem_lancamento ||
        Math.max(0, ...movements.map((m) => +m.ordem_lancamento || 0)) + 1,
      data_hora: movementDateTimeForEdit(d.data, current),
      hodometro_km: km,
      grupo: d.grupo,
      distancia_km: dist,
      distancia_abastecimento_km: d.grupo === "COMBUSTÍVEL" ? fuelDist : null,
      tanque_completo:
        d.grupo === "COMBUSTÍVEL"
          ? d.tanqueCompleto
            ? "SIM"
            : "NAO"
          : "N.I.",
      motorista: d.motorista || "N.I.",
      fornecedor: d.fornecedor || NI,
      local: d.fornecedor || NI,
      latitude: validCoordinate(d.latitude) ? Number(d.latitude) : "",
      longitude: validCoordinate(d.longitude) ? Number(d.longitude) : "",
      precisao_gps_m: d.precisaoGps ? Number(d.precisaoGps) : "",
      localizacao_confirmada: validCoordinate(d.latitude) ? "SIM" : "NAO",
      forma_pagamento: d.formaPagamento || "",
      incluir_indicadores: d.incluirIndicadores ? "SIM" : "NAO",
      veiculo: d.veiculo,
      observacao: d.observacao || "N.I.",
      origem: current?.origem || "APP",
    };
  const replacements = itemRows.map((row, index) => {
    const litros = d.grupo === "COMBUSTÍVEL" ? row.valor / row.preco : null;
    return {
      ...common,
      id: row.sourceId || crypto.randomUUID(),
      ordem_item: index + 1,
      item: row.item,
      item_id: registers.find((r) => r.grupo === d.grupo && r.item === row.item)?.id || "",
      valor: row.valor,
      quantidade_litros: litros,
      preco_unitario: d.grupo === "COMBUSTÍVEL" ? row.preco : null,
      distancia_abastecimento_km: d.grupo === "COMBUSTÍVEL" && index === 0 ? fuelDist : null,
      consumo_km_l:
        d.grupo === "COMBUSTÍVEL" && d.tanqueCompleto && index === 0 && fuelDist && litros
          ? fuelDist / litros
          : null,
    };
  });
  const stateBeforeSave = cloneDataState();
  try {
    if (current) movements = movements.filter((m) => !sameMovement(m, movementId));
    movements.push(...replacements);
    recalculateDistances();
    save();
  } catch (error) {
    restoreDataState(stateBeforeSave, false);
    try { recalculateDistances(); } catch (_) {}
    console.error("Falha ao salvar o lançamento:", error);
    err.textContent = "Não foi possível salvar o lançamento. Os dados digitados foram preservados; verifique os campos e tente novamente.";
    return;
  }
  err.textContent = "";
  $("#entryDialog").close();
  const destination = document.getElementById(entryReturnPage) ? entryReturnPage : "consultaMovimentos";
  go(destination, { replace: true });
  try {
    evaluateAlerts(true);
    showToast("Lançamento salvo com sucesso.");
  } catch (error) {
    console.error("O lançamento foi salvo, mas as rotinas complementares falharam:", error);
    showToast("Lançamento salvo. A atualização complementar dos alertas deverá ser conferida.", "warning");
  }
};
function fillRegisterForm() {
  const f = $("#registerForm");
  f.grupo.innerHTML = GROUPS.map((group) => `<option>${group}</option>`).join("");
}
function updateFuelReferenceFields() {
  const f = $("#registerForm");
  const engine = f.motorizacao?.value || "FLEX";
  $$("[data-fuel-reference]").forEach((section) => {
    section.hidden = engine !== "FLEX" && section.dataset.fuelReference !== engine;
  });
}
function openRegister(id = "") {
  const group = $("#registerGroup").value,
    f = $("#registerForm");
  f.reset();
  f.querySelectorAll("details").forEach((section) => (section.open = false));
  f.id.value = "";
  f.grupoCadastro.value = group;
  $("#subcatFields").style.display =
    group === "ITEM" ? "block" : "none";
  $("#simpleFields").style.display =
    group === "ITEM" ? "none" : "block";
  $("#simpleLabel").firstChild.textContent =
    group === "VEICULO" ? "Veículo *" :
    group === "MOTORISTA" ? "Motorista *" :
    group === "FORNECEDOR" ? "Fornecedor *" : "Forma de pagamento *";
  $("#vehicleExtraFields").style.display = group === "VEICULO" ? "block" : "none";
  $("#driverExtraFields").style.display = group === "MOTORISTA" ? "block" : "none";
  $("#supplierExtraFields").style.display = group === "FORNECEDOR" ? "block" : "none";
  [...f.elements].forEach((field) => {
    if (!field.name || ["id", "grupoCadastro"].includes(field.name)) return;
    const section = field.closest("#subcatFields,#simpleFields,#vehicleExtraFields,#driverExtraFields,#supplierExtraFields");
    field.disabled = Boolean(section && getComputedStyle(section).display === "none");
  });

  $("#activeVehicleField").style.display =
    group === "VEICULO" ? "flex" : "none";
  fillRegisterForm();
  f.motorizacao.onchange = updateFuelReferenceFields;
  let obj;
  if (group === "ITEM") obj = registers.find((x) => x.id === id);
  else if (group === "MOTORISTA") obj = drivers.find((x) => x.id === id);
  else if (group === "VEICULO") obj = vehicles.find((x) => x.id === id);
  else if (group === "FORNECEDOR") obj = suppliers.find((x) => x.id === id);
  else obj = paymentMethods.find((x) => x.id === id);
  if (obj) {
    f.id.value = obj.id;
    if (group === "ITEM") {
      f.grupo.value = obj.grupo;
      f.item.value = obj.item;
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
        f.motorizacao.value = obj.motorizacao || "FLEX";
        f.consumoEtanolCidade.value = obj.consumoEtanolCidade || "";
        f.consumoEtanolEstrada.value = obj.consumoEtanolEstrada || "";
        f.consumoGasolinaCidade.value = obj.consumoGasolinaCidade || obj.consumoRefCidade || "";
        f.consumoGasolinaEstrada.value = obj.consumoGasolinaEstrada || obj.consumoRefEstrada || "";
        f.consumoDieselCidade.value = obj.consumoDieselCidade || "";
        f.consumoDieselEstrada.value = obj.consumoDieselEstrada || "";
      }
      if (group === "MOTORISTA") {
        f.numeroCnh.value = obj.numeroCnh || "";
        f.grupoCnh.value = obj.grupoCnh || obj.categoriaCnh || "";
        f.validadeCnh.value = String(obj.validadeCnh || "").slice(0,10);
        f.obsMotorista.value = obj.observacao || "";
      }
      if (group === "FORNECEDOR") {
        f.localFornecedor.value = obj.local || "";
        f.latitudeFornecedor.value = obj.latitude ?? "";
        f.longitudeFornecedor.value = obj.longitude ?? "";
      }
    }
  }
  if (group === "VEICULO") updateFuelReferenceFields();
  if (group === "FORNECEDOR") {
    $("#supplierGpsStatus").textContent = validCoordinate(f.latitudeFornecedor.value)
      ? "Coordenadas cadastradas. Este fornecedor pode ser sugerido pelo GPS."
      : "Cadastre as coordenadas para permitir a sugestão automática deste fornecedor.";
    updateMapLink($("#openSupplierMap"), f.latitudeFornecedor.value, f.longitudeFornecedor.value);
  }
  $("#registerTitle").textContent = id
    ? "Alterar cadastro"
    : "Incluir cadastro";
  $("#registerDialog").showModal();
}
function finishRegisterFlow(savedValue = "") {
  const context = entryContext;
  if ($("#registerDialog").open) $("#registerDialog").close();
  if (context && $("#entryDialog").open) {
    fillDrivers();
    fillOperationalLists();
    refreshMovementItemOptions();
    if (savedValue && context.target) context.target.value = savedValue;
    entryContext = null;
    setTimeout(() => $("#entryDialog").focus(), 0);
  } else {
    entryContext = null;
  }
}
function closeRegister() {
  finishRegisterFlow();
}
$$(".register-cancel").forEach((button) => button.onclick = closeRegister);
$("#registerDialog").addEventListener("cancel", (event) => {
  event.preventDefault();
  closeRegister();
});
function deleteRegister(id) {
  const g = $("#registerGroup").value;
  const target = g === "ITEM" ? registers.find((x) => x.id === id) : null;
  if (target?.technicalKey) {
    if (!confirm(`${target.item} sustenta um alerta técnico. Para excluir, os alertas técnicos deste item serão desativados e os movimentos históricos passarão a usar "${NI}". Deseja continuar?`)) return;
  } else if (!confirm("Excluir este cadastro?")) return;
  const stateBeforeSave = cloneDataState();
  try {
    if (target?.technicalKey) {
      technicalParameters.filter((p) => p.technicalKey === target.technicalKey).forEach((p) => p.active = false);
      alerts.filter((a) => a.technicalKey === target.technicalKey).forEach((a) => a.active = false);
      movements.filter((m) => m.item_id === id || m.item === target.item).forEach((m) => {
        m.item_id = "technical-ni";
        m.item = NI;
      });
    }
    if (g === "ITEM") registers = registers.filter((x) => x.id !== id);
    if (g === "MOTORISTA") drivers = drivers.filter((x) => x.id !== id);
    if (g === "VEICULO") vehicles = vehicles.filter((x) => x.id !== id);
    if (g === "FORNECEDOR") suppliers = suppliers.filter((x) => x.id !== id);
    if (g === "FORMA_PAGAMENTO") paymentMethods = paymentMethods.filter((x) => x.id !== id);
    save();
    showToast("Cadastro excluído com sucesso.");
  } catch (error) {
    restoreDataState(stateBeforeSave);
    console.error("Falha ao excluir o cadastro:", error);
    alert("Não foi possível excluir o cadastro. Nenhum dado foi alterado.");
  }
}
$("#registerForm [name=kmInicial]").oninput = (e) =>
  (e.target.value = intFmt(String(e.target.value).replace(/\D/g, "")));
$("#addRegister").onclick = () => openRegister();
$("#useSupplierLocation").onclick = () => {
  const f = $("#registerForm"),
    button = $("#useSupplierLocation"),
    status = $("#supplierGpsStatus");
  requestCurrentPosition(button, status, async (coords) => {
    f.latitudeFornecedor.value = Number(coords.latitude).toFixed(7);
    f.longitudeFornecedor.value = Number(coords.longitude).toFixed(7);
    updateMapLink($("#openSupplierMap"), f.latitudeFornecedor.value, f.longitudeFornecedor.value);
    status.textContent = "Coordenadas obtidas. Procurando fornecedor e endereço…";
    try {
      const place = await reverseGeocode(coords.latitude, coords.longitude);
      if (!f.nome.value.trim() && place.supplier) f.nome.value = place.supplier;
      if (place.address) f.localFornecedor.value = place.address;
      status.textContent = place.supplier
        ? `${place.supplier} identificado · precisão aproximada de ${Math.round(coords.accuracy || 0)} m. Confirme os dados.`
        : `Endereço e coordenadas preenchidos · precisão aproximada de ${Math.round(coords.accuracy || 0)} m. Informe o nome do fornecedor.`;
    } catch (error) {
      status.textContent = `Coordenadas preenchidas · precisão aproximada de ${Math.round(coords.accuracy || 0)} m. Não foi possível consultar o nome/endereço agora.`;
    }
  });
};
$("#registerGroup").onchange = renderRegisters;
$("#registerSearch").oninput = renderRegisters;
$("#registerStatusFilter").onchange = renderRegisters;
function showRegisterHub() {
  $("#registerHub").hidden = false;
  $("#registerDetail").hidden = true;
  $("#registerSearch").value = "";
  $("#registerStatusFilter").value = "TODOS";
  renderRegisters();
}
function showRegisterDetail(group) {
  $("#registerGroup").value = group;
  $("#registerSearch").value = "";
  $("#registerStatusFilter").value = "TODOS";
  $("#registerHub").hidden = true;
  $("#registerDetail").hidden = false;
  renderRegisters();
  window.scrollTo({top:0,behavior:"smooth"});
}
$("#backRegisterHub").onclick = showRegisterHub;
$$("[data-register-group]").forEach(button => button.onclick = () => {
  showRegisterDetail(button.dataset.registerGroup);
});
$("#registerForm").onsubmit = (e) => {
  if (e.submitter?.value === "cancel") return;
  e.preventDefault();
  const f = e.target,
    g = f.grupoCadastro.value,
    id = f.id.value;
  const stateBeforeSave = cloneDataState();
  let savedContextValue = "";
  if (g === "ITEM") {
    const obj = {
      id: id || crypto.randomUUID(),
      grupo: f.grupo.value,
      item: f.item.value.trim(),
      padrao: f.padrao.checked,
    };
    if (!obj.item) return alert("Informe o item de lançamento.");
    savedContextValue = obj.item;
    if (obj.padrao)
      registers.forEach((r) => {
        if (r.grupo === obj.grupo)
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
      kmInitialText = String(f.kmInicial.value || "").replace(/\D/g, ""),
      kmInicial = +kmInitialText;
    if (!name) return alert("Informe o nome do cadastro.");
    savedContextValue = name;
    if (g === "VEICULO" && (!kmInitialText || !(+f.capacidadeTanque.value > 0)))
      return alert("Informe o hodômetro inicial e a capacidade do tanque.");
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
        item.motorizacao = f.motorizacao.value;
        item.consumoEtanolCidade = +f.consumoEtanolCidade.value || "";
        item.consumoEtanolEstrada = +f.consumoEtanolEstrada.value || "";
        item.consumoGasolinaCidade = +f.consumoGasolinaCidade.value || "";
        item.consumoGasolinaEstrada = +f.consumoGasolinaEstrada.value || "";
        item.consumoDieselCidade = +f.consumoDieselCidade.value || "";
        item.consumoDieselEstrada = +f.consumoDieselEstrada.value || "";
        if (!isActive) item.padrao = false;
      }
      if (g === "MOTORISTA") {
        item.numeroCnh=f.numeroCnh.value.trim(); item.grupoCnh=f.grupoCnh.value.trim();
        item.validadeCnh=f.validadeCnh.value; item.observacao=f.obsMotorista.value.trim();
      }
      if (g === "FORNECEDOR") {
        item.local=f.localFornecedor.value.trim();
        item.latitude=validCoordinate(f.latitudeFornecedor.value) ? Number(f.latitudeFornecedor.value) : "";
        item.longitude=validCoordinate(f.longitudeFornecedor.value) ? Number(f.longitudeFornecedor.value) : "";
        item.ativo=isActive;
      }
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
        motorizacao: g === "VEICULO" ? f.motorizacao.value : undefined,
        consumoEtanolCidade: g === "VEICULO" ? (+f.consumoEtanolCidade.value || "") : undefined,
        consumoEtanolEstrada: g === "VEICULO" ? (+f.consumoEtanolEstrada.value || "") : undefined,
        consumoGasolinaCidade: g === "VEICULO" ? (+f.consumoGasolinaCidade.value || "") : undefined,
        consumoGasolinaEstrada: g === "VEICULO" ? (+f.consumoGasolinaEstrada.value || "") : undefined,
        consumoDieselCidade: g === "VEICULO" ? (+f.consumoDieselCidade.value || "") : undefined,
        consumoDieselEstrada: g === "VEICULO" ? (+f.consumoDieselEstrada.value || "") : undefined,
        numeroCnh: g === "MOTORISTA" ? f.numeroCnh.value.trim() : undefined,
        grupoCnh: g === "MOTORISTA" ? f.grupoCnh.value.trim() : undefined,
        validadeCnh: g === "MOTORISTA" ? f.validadeCnh.value : undefined,
        observacao: g === "MOTORISTA" ? f.obsMotorista.value.trim() : undefined,
        local: g === "FORNECEDOR" ? f.localFornecedor.value.trim() : undefined,
        latitude: g === "FORNECEDOR" && validCoordinate(f.latitudeFornecedor.value) ? Number(f.latitudeFornecedor.value) : undefined,
        longitude: g === "FORNECEDOR" && validCoordinate(f.longitudeFornecedor.value) ? Number(f.longitudeFornecedor.value) : undefined,
        padrao: isDefault || arr.length === 0,
        ativo: isActive,
      });
    if (g === "VEICULO" && !arr.some((x) => x.padrao && x.ativo !== false)) {
      const first = arr.find((x) => x.ativo !== false);
      if (first) first.padrao = true;
    }
  }
  try {
    recalculateDistances();
    save();
  } catch (error) {
    restoreDataState(stateBeforeSave);
    console.error("Falha ao salvar o cadastro:", error);
    alert("Não foi possível salvar o cadastro. Verifique os dados e tente novamente.");
    return;
  }
  finishRegisterFlow(
    entryContext && ["ITEM", "MOTORISTA", "FORNECEDOR"].includes(g)
      ? savedContextValue
      : "",
  );
  showToast("Cadastro salvo com sucesso.");
};
// O veículo dos movimentos é controlado exclusivamente pela seleção da tela inicial.
$("#typeFilter").innerHTML =
  '<option value="">Todos os grupos</option>' +
  GROUPS
    .map((group) => `<option>${group}</option>`)
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
    movements, registers, drivers, vehicles, suppliers, paymentMethods,
    alerts, alertHistory, technicalParameters
  });
}
window.vehicleAppBridge = {
  getState: () => ({ movements, registers, drivers, vehicles, suppliers, paymentMethods, alerts, alertHistory, technicalParameters }),
  applyState: (state) => {
    if (!state) return;
    registers = (state.registers || defaults).map(normalizeRegister);
    enforceSingleDefaults();
    movements = (state.movements || []).map((m, i) => enforceItemGroup(normalizeMovement(m, i)));
    drivers = state.drivers || [];
    vehicles = (state.vehicles || []).map(normalizeVehicle);
    suppliers = state.suppliers || [];
    paymentMethods = state.paymentMethods || [];
    alerts = state.alerts || [];
    alertHistory = state.alertHistory || [];
    technicalParameters = state.technicalParameters || [];
    ensureTechnicalData();
    recalculateDistances();
    save(false);
    setTimeout(() => evaluateAlerts(true), 0);
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
const isNativeApp = () =>
  Boolean(window.Capacitor?.isNativePlatform?.());
const isStandalone = () =>
  isNativeApp() ||
  window.matchMedia("(display-mode: standalone)").matches ||
  window.navigator.standalone === true;
const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
const isAndroid = () => /android/i.test(navigator.userAgent);
function manualInstallMessage() {
  if (isIos())
    return "No Safari, toque em Compartilhar e depois em Adicionar à Tela de Início.";
  if (isAndroid())
    return "No Chrome, toque no menu ⋮ e escolha Instalar aplicativo ou Adicionar à tela inicial.";
  return "Abra o menu do navegador e escolha Instalar aplicativo, Instalar MyCar+ ou Criar atalho.";
}
function refreshInstallControls() {
  const canInstall = Boolean(deferredInstallPrompt) && !isStandalone();
  installButtons().forEach((button) => {
    button.hidden = isStandalone();
    button.disabled = isStandalone();
  });
  const help = $("#installHelpText");
  if (help)
    help.textContent = isStandalone()
      ? "O MyCar+ já está instalado neste aparelho."
      : canInstall
        ? "Toque no botão para instalar o aplicativo neste aparelho."
        : manualInstallMessage();
}
window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  refreshInstallControls();
});
installButtons().forEach((button) => {
  button.addEventListener("click", async () => {
    if (isStandalone()) {
      alert("O MyCar+ já está instalado neste aparelho.");
      return;
    }
    if (!deferredInstallPrompt) {
      alert(manualInstallMessage());
      return;
    }
    deferredInstallPrompt.prompt();
    const choice = await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    refreshInstallControls();
    if (choice.outcome !== "accepted")
      alert("A instalação não foi concluída. Você pode tentar novamente pelo menu do navegador.");
  });
});
window.addEventListener("appinstalled", () => {
  deferredInstallPrompt = null;
  refreshInstallControls();
});
refreshInstallControls();

async function configureNativeStatusBar() {
  if (!isNativeApp()) return;
  document.documentElement.classList.add("native-app");
  const statusBar = window.Capacitor?.Plugins?.StatusBar;
  if (!statusBar) return;
  try {
    await statusBar.setOverlaysWebView({ overlay: false });
    await statusBar.setBackgroundColor({ color: "#0788E8" });
    await statusBar.setStyle({ style: "LIGHT" });
  } catch (error) {
    console.warn("Não foi possível ajustar a barra de status:", error);
  }
}
configureNativeStatusBar();

function closeReportViewer() {
  const dialog = $("#reportViewerDialog");
  const frame = $("#reportViewerFrame");
  if (dialog?.open) dialog.close();
  if (frame) {
    frame.onload = null;
    frame.srcdoc = "";
  }
}
const reportViewerDialog = $("#reportViewerDialog");
if (reportViewerDialog) {
  reportViewerDialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeReportViewer();
  });
}
async function shareReportHtmlFromViewer(data = {}) {
  const html = String(data.html || "");
  if (!html.trim()) {
    alert("Não foi possível preparar o relatório para compartilhamento.");
    return;
  }
  const jobName = String(data.jobName || "MyCarPlus_Relatorio").trim() || "MyCarPlus_Relatorio";
  const bridge = window.MyCarNative;
  if (isNativeApp()) {
    if (bridge && typeof bridge.shareHtml === "function") {
      try {
        bridge.shareHtml(jobName, html);
        return;
      } catch (error) {
        console.error("Falha ao compartilhar o relatório pelo Android:", error);
      }
    }
    alert("O módulo de compartilhamento não está disponível. Feche e abra novamente o aplicativo.");
    return;
  }

  const safeName = jobName.replace(/[^a-zA-Z0-9._-]+/g, "_").replace(/_+/g, "_") || "MyCarPlus_Relatorio";
  const file = new File([html], `${safeName}.html`, { type: "text/html;charset=utf-8" });
  try {
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      await navigator.share({
        title: jobName.replaceAll("_", " "),
        files: [file],
      });
      return;
    }
  } catch (error) {
    if (error?.name === "AbortError") return;
    console.error("Falha no compartilhamento Web:", error);
  }

  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = file.name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
window.addEventListener("message", (event) => {
  const data = event.data || {};
  if (data.type === "mycar-close-report") {
    closeReportViewer();
    return;
  }
  if (data.type === "mycar-share-report-html") {
    shareReportHtmlFromViewer(data);
  }
});
function openReportDocument(content, { title = "Relatório MyCar+",
  popupMessage = "Permita janelas pop-up para abrir o relatório." } = {}) {
  if (isNativeApp()) {
    const dialog = $("#reportViewerDialog"), frame = $("#reportViewerFrame");
    if (!dialog || !frame) return null;
    frame.title = title;
    frame.srcdoc = content;
    if (!dialog.open) dialog.showModal();
    return frame.contentWindow;
  }
  const win = window.open("", "_blank");
  if (!win) {
    alert(popupMessage);
    return null;
  }
  win.document.open();
  win.document.write(content);
  win.document.close();
  return win;
}

function exportPdfReport() {
  const selectedVehicle = selectedVehicleName();
  const vehicleLabel = selectedVehicle || "Nenhum veículo selecionado";
  const ms = filterByPeriod(filtered(selectedVehicle), "report");
  if (!periodIsValid("report")) return alert("Corrija o período antes de gerar o relatório.");
  if (!ms.length) return alert("Não existem movimentos no veículo e período selecionados.");

  ensureTechnicalData();
  const s = stats(ms), groups = groupTotals(ms);
  const expenseGroups = [
    ["Combustível", +groups.Combustível || 0],
    ["Manutenção", +groups.Manutenção || 0],
    ["Administrativo", +groups.Administrativo || 0],
  ];
  const gross = expenseGroups.reduce((a, [, v]) => a + v, 0);
  const income = +groups.Receitas || 0;
  const net = gross - income;
  const costKm = s.km ? net / s.km : 0;
  const costDay = s.days ? net / s.days : 0;
  const e = (v) => String(v ?? "").replace(/[&<>\"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"})[c]);
  const dateBR = (v) => { const p = String(v || "").slice(0,10).split("-"); return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : "—"; };
  const pct = (v, t) => t ? num(v / t * 100, 1) + "%" : "0,0%";
  const period = periodText("report");
  const emitted = new Intl.DateTimeFormat("pt-BR", { dateStyle:"short", timeStyle:"short" }).format(new Date());
  const currentVehicle = selectedVehicleObject();

  const fuelRows = {};
  ms.filter(m => m.grupo === "COMBUSTÍVEL").forEach(m => {
    const key = m.item || "Combustível";
    const x = fuelRows[key] ||= { liters:0, distance:0, cost:0 };
    if (m.tanque_completo !== "NAO") {
      x.liters += +m.quantidade_litros || 0;
      x.distance += +(m.distancia_abastecimento_km ?? m.distancia_km) || 0;
    }
    x.cost += +m.valor || 0;
  });
  const fuelTotal = Object.values(fuelRows).reduce((a,x)=>({liters:a.liters+x.liters,distance:a.distance+x.distance,cost:a.cost+x.cost}),{liters:0,distance:0,cost:0});
  const fuelConsumption = fuelTotal.liters ? fuelTotal.distance / fuelTotal.liters : 0;
  const fuelCostKm = fuelTotal.distance ? fuelTotal.cost / fuelTotal.distance : 0;
  const fuelEntries = Object.entries(fuelRows).sort((a,b)=>b[1].cost-a[1].cost);
  const fuelHtml = fuelEntries.length ? fuelEntries.map(([name,x])=>`<tr><td data-label="Combustível">${e(name)}</td><td data-label="Litros" class="num">${num(x.liters,1)} L</td><td data-label="Consumo" class="num">${num(x.liters?x.distance/x.liters:0,2)} km/L</td><td data-label="Custo/km" class="num">${money(x.distance?x.cost/x.distance:0)}</td><td data-label="Gasto" class="num">${money(x.cost)}</td></tr>`).join("") : '<tr><td colspan="5">Sem abastecimentos.</td></tr>';

  const monthly = {};
  ms.filter(m => m.grupo !== "RECEITA").forEach(m => {
    const k = String(m.data_hora || "").slice(0,7);
    if (k) monthly[k] = (monthly[k] || 0) + (+m.valor || 0);
  });
  const monthKeys = Object.keys(monthly).sort().slice(-12);
  const monthLabels = monthKeys.map(k => {
    const [y,m] = k.split("-");
    return ["JAN","FEV","MAR","ABR","MAI","JUN","JUL","AGO","SET","OUT","NOV","DEZ"][Number(m)-1] + "/" + y.slice(2);
  });
  function monthlyChart(labels, values) {
    if (!labels.length) return '<div class="empty">Sem dados suficientes.</div>';
    const W=760,H=225,L=62,R=16,T=18,B=42;
    const maxValue=Math.max(...values,500), yMax=Math.ceil(maxValue/500)*500;
    const ticks=[]; for(let v=0;v<=yMax;v+=500) ticks.push(v);
    const grid=ticks.map(v=>{const y=T+(yMax-v)/yMax*(H-T-B);return `<line x1="${L}" y1="${y}" x2="${W-R}" y2="${y}"/><text x="${L-8}" y="${y+3}" text-anchor="end">R$ ${intFmt(v)}</text>`;}).join("");
    const step=(W-L-R)/labels.length,bw=Math.min(38,step*.58);
    const bars=values.map((v,i)=>{const h=(v/yMax)*(H-T-B),x=L+i*step+(step-bw)/2,y=H-B-h;return `<rect x="${x}" y="${y}" width="${bw}" height="${h}" rx="4"><title>${labels[i]}: ${money(v)}</title></rect><text x="${x+bw/2}" y="${H-18}" text-anchor="middle">${e(labels[i])}</text>`;}).join("");
    return `<svg viewBox="0 0 ${W} ${H}" class="svg-chart monthly"><g class="grid">${grid}</g><g class="bars">${bars}</g></svg>`;
  }
  function barSvg(labels, values) {
    const max=Math.max(...values,1), W=620,H=170,L=42,R=12,T=15,B=38,step=(W-L-R)/Math.max(labels.length,1),bw=Math.min(70,step*.56);
    const bars=values.map((v,i)=>{const h=v/max*(H-T-B),x=L+i*step+(step-bw)/2,y=H-B-h;return `<rect x="${x}" y="${y}" width="${bw}" height="${h}" rx="4"><title>${labels[i]}: ${money(v)}</title></rect><text x="${x+bw/2}" y="${H-15}" text-anchor="middle">${e(labels[i])}</text>`;}).join("");
    return `<svg viewBox="0 0 ${W} ${H}" class="svg-chart"><line x1="${L}" y1="${H-B}" x2="${W-R}" y2="${H-B}" class="axis"/><g class="bars">${bars}</g></svg>`;
  }

  const groupOrder = ["COMBUSTÍVEL","MANUTENÇÃO","ADMINISTRATIVO","RECEITA"];
  const latestRows = groupOrder.flatMap(group => ms.filter(m => m.grupo === group).sort((a,b)=>new Date(b.data_hora)-new Date(a.data_hora)).slice(0,2));
  const latestHtml = latestRows.length ? latestRows.map(m=>`<tr><td data-label="Grupo"><span class="tag ${m.grupo.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')}">${e(m.grupo)}</span></td><td data-label="Item">${e(m.item || "—")}</td><td data-label="Data">${dateBR(m.data_hora)}</td><td data-label="Hodômetro" class="num">${m.hodometro_km ? intFmt(m.hodometro_km)+" km" : "—"}</td><td data-label="Valor" class="num">${money(m.valor)}</td></tr>`).join("") : '<tr><td colspan="5">Sem lançamentos.</td></tr>';

  const essentialNames = ["Troca de Óleo","Filtro de Óleo","Filtro de Ar do Motor","Fluido de Freio","Aditivo do Radiador","Pastilhas de Freio","Pneus","Rodízio dos Pneus","Calibração dos Pneus","Bateria","Alinhamento e Balanceamento","Correia Dentada / Corrente"];
  const vehicleAlerts = alerts.filter(a => a.vehicleId === currentVehicle?.id && !a.archived);
  const normalizeText = v => String(v || "").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
  const maintenanceMovements = movements.filter(m => m.veiculo === currentVehicle?.nome && m.grupo === "MANUTENÇÃO").sort((a,b)=>new Date(b.data_hora)-new Date(a.data_hora));
  const essentialRows = essentialNames.map(name => {
    const n=normalizeText(name);
    const alertItem=vehicleAlerts.find(a=>normalizeText(a.description).includes(n) || n.includes(normalizeText(a.description)) || (name==="Troca de Óleo" && a.technicalKey==="OIL") || (name==="Bateria" && a.technicalKey==="BATTERY"));
    const movement=maintenanceMovements.find(m=>{const x=normalizeText(m.item); return x.includes(n) || n.includes(x) || (name==="Troca de Óleo" && x.includes("oleo"));});
    const history=alertItem ? alertHistory.filter(h=>h.vehicleId===currentVehicle?.id && (h.alertId===alertItem.id || (h.technicalKey && h.technicalKey===alertItem.technicalKey))).sort((a,b)=>new Date(b.completedAt)-new Date(a.completedAt))[0] : null;
    let lastDate=movement?.data_hora, lastKm=movement?.hodometro_km;
    if (history && (!lastDate || new Date(history.completedAt)>new Date(lastDate))) { lastDate=history.completedAt; lastKm=history.completedKm; }
    const status=alertItem ? alertStatus(alertItem) : "SEM REGISTRO";
    const forecast=alertItem ? alertForecast(alertItem) : "Não configurado";
    return {name,lastDate,lastKm,forecast,status,active:alertItem?.active};
  });
  const maintenanceHtml = essentialRows.map(r=>`<tr><td data-label="Serviço">${e(r.name)}</td><td data-label="Último registro">${r.lastDate ? dateBR(r.lastDate) : "Sem registro"}</td><td data-label="Hodômetro" class="num">${r.lastKm ? intFmt(r.lastKm)+" km" : "—"}</td><td data-label="Próxima referência">${e(r.forecast)}</td><td data-label="Situação técnica"><span class="status ${String(r.status).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')}">${e(r.status === "INATIVO" ? "Monitoramento inativo" : r.status)}</span></td><td data-label="Alerta">${r.active === true ? "Ativo" : r.active === false ? "Inativo" : "—"}</td></tr>`).join("");

  const biggest = expenseGroups.slice().sort((a,b)=>b[1]-a[1])[0];
  const content = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1"><title>Relatório Executivo MyCar+</title><style>
  :root{--navy:#12395b;--blue:#246b9e;--surface:#eaf4fb;--border:#8a5a35;--text:#111;--muted:#5c6872;--number:#e87519;--green:#1f8a70;--red:#b3261e}*{box-sizing:border-box}body{margin:0;background:#e9edf0;color:var(--text);font-family:Arial,Helvetica,sans-serif}.actions{display:flex;justify-content:center;gap:10px;padding:14px 12px calc(14px + env(safe-area-inset-bottom));background:#12395b}.actions button{border:0;border-radius:8px;padding:10px 14px;font-weight:800;cursor:pointer}.actions .primary{background:#0788e8;color:#fff}.actions .danger{background:#b3261e;color:#fff}.page{width:210mm;min-height:297mm;margin:8px auto;background:#fff;padding:10mm 11mm 9mm;box-shadow:0 4px 18px #0002;display:flex;flex-direction:column}.header{display:grid;grid-template-columns:1fr auto;gap:14px;align-items:end;border-bottom:3px solid var(--navy);padding-bottom:7px;margin-bottom:8px}.header h1{margin:0;font-size:18px;color:var(--navy)}.brand{font-size:10px;font-weight:800;color:var(--blue)}.meta{font-size:8.5px;line-height:1.5;text-align:right;color:var(--muted)}.section{margin-top:8px;break-inside:avoid}.section-title{margin:0 0 5px;font-size:10px;text-transform:uppercase;letter-spacing:.45px;color:var(--navy)}.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:5px}.kpi,.card{background:var(--surface);border:1px solid var(--border);border-radius:7px;padding:7px}.kpi small{display:block;font-size:7px;color:var(--muted)}.kpi strong{display:block;margin-top:3px;font-size:13px;color:var(--number)}.kpi span{font-size:6.8px;color:var(--muted)}.grid2{display:grid;grid-template-columns:1fr 1fr;gap:7px}.card h3{margin:0 0 4px;font-size:9px;color:var(--navy)}table{width:100%;border-collapse:collapse;font-size:7.4px;background:#fff;border:1px solid var(--border)}thead{display:table-header-group}tr{break-inside:avoid}th{background:var(--surface);color:var(--navy);text-align:left}th,td{padding:4px 5px;border-bottom:1px solid #d9c6b6;vertical-align:middle}.num{text-align:right;color:var(--number);font-weight:700}.note{background:#fff8f0;border:1px solid var(--border);border-left:4px solid var(--number);border-radius:6px;padding:8px;font-size:8px;line-height:1.45}.svg-chart{width:100%;height:105px;display:block}.svg-chart.monthly{height:150px}.svg-chart .grid line,.axis{stroke:#d6dde3}.svg-chart .line{fill:none;stroke:var(--blue);stroke-width:3}.svg-chart .bars rect{fill:var(--number)}.svg-chart text{font-size:8px;fill:#5c6872;font-weight:700}.empty{height:112px;display:grid;place-items:center;font-size:8px;color:var(--muted)}.tag,.status{display:inline-block;border-radius:999px;padding:2px 6px;font-size:6.6px;font-weight:800;white-space:nowrap}.tag.combustivel{background:#e5f5ee;color:#176b50}.tag.manutencao{background:#fff0d9;color:#8a4c00}.tag.administrativo{background:#edf0ff;color:#3949ab}.tag.receita{background:#e4f5e7;color:#206b31}.status.programado,.status.em-dia{background:#e5f5ee;color:#176b50}.status.atencao{background:#fff0d9;color:#8a4c00}.status.vencido{background:#fde5e5;color:#9e2525}.status.inativo,.status.sem-registro{background:#eceff1;color:#59636b}.footer{margin-top:auto;border-top:1px solid var(--border);padding-top:4px;display:flex;justify-content:space-between;font-size:7px;color:var(--muted)}@page{size:A4 portrait;margin:0}@media print{html,body{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;background:#fff!important}.actions{display:none!important}.page{width:210mm;min-height:297mm;margin:0!important;padding:10mm 11mm 9mm!important;box-shadow:none!important;page-break-after:always;break-after:page}.page:last-child{page-break-after:auto;break-after:auto}}@media screen and (max-width:760px){html,body{width:100%;max-width:100%;overflow-x:hidden}body{background:#f4f7f9}.actions{position:sticky;bottom:0;z-index:20;flex-wrap:wrap;padding:10px}.actions button{flex:1 1 145px;min-height:44px}.page{width:100%;max-width:100%;min-height:0;margin:0 0 10px;padding:14px 10px;box-shadow:none;overflow:hidden}.header{grid-template-columns:1fr;align-items:start;gap:7px}.header h1{font-size:20px;line-height:1.15;overflow-wrap:anywhere}.brand{font-size:12px}.meta{text-align:left;font-size:11px;overflow-wrap:anywhere}.section{margin-top:14px;max-width:100%}.section-title{font-size:13px;margin-bottom:8px}.kpis{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.kpi,.card{min-width:0;padding:10px;overflow:hidden}.kpi small{font-size:10px}.kpi strong{font-size:15px;overflow-wrap:anywhere}.kpi span{font-size:9px}.grid2{grid-template-columns:minmax(0,1fr);gap:10px}.card h3{font-size:12px}.responsive-table{display:block;width:100%;max-width:100%;border:0;background:transparent}.responsive-table thead{display:none}.responsive-table tbody{display:block;width:100%}.responsive-table tr{display:block;width:100%;margin:0 0 10px;border:1px solid var(--border);border-radius:8px;overflow:hidden;background:#fff}.responsive-table td{display:grid;grid-template-columns:minmax(104px,40%) minmax(0,1fr);gap:8px;align-items:start;width:100%;padding:7px 8px;border-bottom:1px solid #e6d9cf;white-space:normal;overflow-wrap:anywhere;word-break:normal;text-align:left!important;font-size:10px}.responsive-table td:last-child{border-bottom:0}.responsive-table td::before{content:attr(data-label);font-weight:800;color:var(--navy);font-size:9px}.responsive-table td[colspan]{display:block;text-align:center!important}.responsive-table td[colspan]::before{content:none}.num{text-align:left!important}.note{font-size:11px;padding:10px;overflow-wrap:anywhere}.svg-chart{width:100%;max-width:100%;height:auto;min-height:145px}.svg-chart.monthly{height:auto;min-height:180px}.svg-chart text{font-size:10px}.tag,.status{max-width:100%;font-size:8.5px;white-space:normal}.footer{gap:8px;font-size:9px;padding-top:7px}.footer span{min-width:0;overflow-wrap:anywhere}}@media screen and (max-width:390px){.kpis{grid-template-columns:1fr}.header h1{font-size:18px}.actions button{flex-basis:100%}.responsive-table td{grid-template-columns:minmax(92px,38%) minmax(0,1fr)}}
  </style></head><body><main class="page"><div class="header"><div><div class="brand">MyCar+</div><h1>Relatório Executivo Veicular</h1></div><div class="meta"><b>Veículo:</b> ${e(vehicleLabel)}<br><b>Período:</b> ${e(period)}<br><b>Emissão:</b> ${e(emitted)} · <b>Versão:</b> ${e(APP_VERSION)}</div></div>
  <section class="section"><h2 class="section-title">Indicadores principais</h2><div class="kpis">
  <div class="kpi"><small>Distância percorrida</small><strong>${intFmt(s.km)} km</strong><span>${num(s.days?s.km/s.days:0,1)} km/dia</span></div><div class="kpi"><small>Consumo médio geral</small><strong>${num(fuelConsumption,2)} km/L</strong><span>combustíveis consolidados</span></div><div class="kpi"><small>Custo bruto</small><strong>${money(gross)}</strong><span>despesas do período</span></div><div class="kpi"><small>Custo líquido</small><strong>${money(net)}</strong><span>receitas: ${money(income)}</span></div><div class="kpi"><small>Custo por km</small><strong>${money(costKm)}</strong><span>líquido ÷ distância</span></div><div class="kpi"><small>Custo diário</small><strong>${money(costDay)}</strong><span>${intFmt(s.days)} dias</span></div><div class="kpi"><small>Combustível</small><strong>${money(fuelTotal.cost)}</strong><span>${pct(fuelTotal.cost,gross)} do custo bruto</span></div><div class="kpi"><small>Manutenção</small><strong>${money(+groups.Manutenção||0)}</strong><span>${pct(+groups.Manutenção||0,gross)} do custo bruto</span></div></div></section>
  <section class="section"><h2 class="section-title">Evolução mensal dos gastos — últimos 12 meses</h2><div class="card">${monthlyChart(monthLabels,monthKeys.map(k=>monthly[k]))}</div></section>
  <section class="section"><h2 class="section-title">Desempenho e composição dos custos</h2><div class="grid2"><div class="card"><h3>Custo por grupo</h3>${barSvg(expenseGroups.map(x=>x[0]),expenseGroups.map(x=>x[1]))}</div><div class="card"><h3>Indicadores de combustível</h3><table class="responsive-table"><thead><tr><th>Combustível</th><th class="num">Litros</th><th class="num">Consumo</th><th class="num">Custo/km</th><th class="num">Gasto</th></tr></thead><tbody>${fuelHtml}<tr><td data-label="Combustível"><b>Total</b></td><td data-label="Litros" class="num">${num(fuelTotal.liters,1)} L</td><td data-label="Consumo" class="num">${num(fuelConsumption,2)} km/L</td><td data-label="Custo/km" class="num">${money(fuelCostKm)}</td><td data-label="Gasto" class="num">${money(fuelTotal.cost)}</td></tr></tbody></table></div></div></section>
  <section class="section"><h2 class="section-title">Leitura executiva</h2><div class="note">O maior grupo de gastos foi <b>${e(biggest[0])}</b>, com <b>${pct(biggest[1],gross)}</b> do custo bruto. O consumo médio geral foi de <b>${num(fuelConsumption,2)} km/L</b> e o custo líquido por quilômetro foi de <b>${money(costKm)}</b>. Foram consolidados <b>${ms.length}</b> lançamentos.</div></section><div class="footer"><span>MyCar+ · Relatório Executivo</span><span>Página 1 de 2 · v${e(APP_VERSION)}</span></div></main>
  <main class="page"><div class="header"><div><div class="brand">MyCar+</div><h1>Movimentações e manutenção</h1></div><div class="meta"><b>Veículo:</b> ${e(vehicleLabel)}<br><b>Período:</b> ${e(period)}</div></div>
  <section class="section"><h2 class="section-title">Últimos lançamentos por grupo</h2><table class="responsive-table"><thead><tr><th>Grupo</th><th>Item</th><th>Data</th><th class="num">Km</th><th class="num">Valor</th></tr></thead><tbody>${latestHtml}</tbody></table></section>
  <section class="section"><h2 class="section-title">Manutenções essenciais</h2><table class="responsive-table"><thead><tr><th>Serviço</th><th>Último registro</th><th class="num">Km</th><th>Próxima referência</th><th>Situação técnica</th><th>Alerta</th></tr></thead><tbody>${maintenanceHtml}</tbody></table><div class="note" style="margin-top:7px"><b>Referência:</b> parâmetros dos alertas ativos e inativos do veículo selecionado, cruzados com o histórico de manutenção. Alertas inativos são exibidos apenas como referência histórica e não geram avisos.</div></section>
  <div class="footer"><span>MyCar+ · Relatório Executivo</span><span>Página 2 de 2 · v${e(APP_VERSION)}</span></div></main><div class="actions"><button type="button" id="reportCloseButton" class="danger">Fechar</button><button type="button" id="reportShareButton" class="primary">Compartilhar</button></div><script>(function(){
  function printableDocument(){
    var clone=document.documentElement.cloneNode(true);
    clone.querySelectorAll('.actions,script').forEach(function(node){node.remove()});
    return '<!doctype html>'+clone.outerHTML;
  }
  function shareHtml(){
    try{
      if(window.parent&&window.parent!==window){
        window.parent.postMessage({type:'mycar-share-report-html',jobName:'Relatorio_Executivo_MyCarPlus',html:printableDocument()},'*');
        return;
      }
    }catch(e){}
    try{
      var html=printableDocument();
      var blob=new Blob([html],{type:'text/html;charset=utf-8'});
      var url=URL.createObjectURL(blob);
      var a=document.createElement('a');
      a.href=url;a.download='Relatorio_Executivo_MyCarPlus.html';
      document.body.appendChild(a);a.click();a.remove();
      setTimeout(function(){URL.revokeObjectURL(url)},1500)
    }catch(e){alert('Não foi possível preparar o arquivo HTML.')}
  }
  function closeReport(){
    try{
      if(window.parent&&window.parent!==window){
        window.parent.postMessage({type:'mycar-close-report'},'*');
        return;
      }
    }catch(e){}
    try{window.close()}catch(e){}
    setTimeout(function(){
      if(!window.closed){
        try{if(history.length>1){history.back()}else{location.replace('about:blank')}}catch(e){}
      }
    },150)
  }
  document.getElementById('reportShareButton').addEventListener('click',shareHtml);
  document.getElementById('reportCloseButton').addEventListener('click',closeReport);
  document.addEventListener('keydown',function(e){if(e.key==='Escape')closeReport()});
})();<\/script></body></html>`;
  openReportDocument(content, {
    title: "Relatório Executivo Veicular",
    popupMessage: "Permita janelas pop-up para gerar o relatório.",
  });
}

const pdfButton = $("#exportPdf"); if (pdfButton) pdfButton.onclick = exportPdfReport;
const DATA_TABLES = {
  movements: "Movimentos",
  registers: "Itens de lançamento",
  vehicles: "Veículos",
  drivers: "Motoristas",
  suppliers: "Fornecedores",
  paymentMethods: "Formas de pagamento",
  alerts: "Alertas",
  alertHistory: "Histórico de alertas",
  technicalParameters: "Parâmetros técnicos",
};
function dataState() {
  return { movements, registers, vehicles, drivers, suppliers, paymentMethods, alerts, alertHistory, technicalParameters };
}
function cloneDataState() {
  return JSON.parse(JSON.stringify(dataState()));
}
function restoreDataState(state, rerender = true) {
  movements = state.movements || [];
  registers = state.registers || [];
  vehicles = state.vehicles || [];
  drivers = state.drivers || [];
  suppliers = state.suppliers || [];
  paymentMethods = state.paymentMethods || [];
  alerts = state.alerts || [];
  alertHistory = state.alertHistory || [];
  technicalParameters = state.technicalParameters || [];
  if (rerender) {
    try { renderAll(); } catch (_) {}
  }
}
function downloadBackup(keys) {
  const tables = {};
  const state = dataState();
  keys.forEach((key) => (tables[key] = JSON.parse(JSON.stringify(state[key]))));
  const payload = {
    app: APP_NAME,
    version: APP_VERSION,
    schemaVersion: 8,
    createdAt: new Date().toISOString(),
    tables,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `MyCarPlus_Backup_${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}
function selectedDataTables(host) {
  return [...host.querySelectorAll("input[type=checkbox]:checked")].map((x) => x.value);
}
function openDataSelector(mode) {
  const dialog = document.createElement("dialog");
  dialog.className = "compact-dialog data-security-dialog";
  const title = mode === "backup" ? "Criar backup" : mode === "restore" ? "Restaurar backup" : "Excluir bases de dados";
  dialog.innerHTML = `<form method="dialog" class="sectioned-form"><div class="dialog-head"><div><small>Gestão de dados</small><h2>${title}</h2></div><button value="cancel">×</button></div><div class="form-scroll"><p class="field-help">${mode === "restore" ? "As tabelas selecionadas serão substituídas integralmente." : "Marque cada base individualmente."}</p><div class="data-table-choices">${Object.entries(DATA_TABLES).map(([key,label]) => `<label><input type="checkbox" value="${key}"><span><b>${label}</b><small>${dataState()[key].length} registro(s)</small></span></label>`).join("")}</div>${mode === "restore" ? '<label>Arquivo de backup<input class="backup-file" type="file" accept=".json,application/json"></label>' : ""}<p class="form-error"></p></div><div class="form-footer"><button class="form-cancel" value="cancel">Cancelar</button><button class="primary run-data-action" type="button">Continuar</button></div></form>`;
  document.body.appendChild(dialog);
  dialog.addEventListener("close", () => dialog.remove());
  dialog.querySelector(".run-data-action").onclick = async () => {
    const keys = selectedDataTables(dialog);
    const error = dialog.querySelector(".form-error");
    if (!keys.length) return (error.textContent = "Selecione pelo menos uma base.");
    if (mode === "backup") {
      downloadBackup(keys);
      dialog.close();
      return;
    }
    if (mode === "restore") {
      const file = dialog.querySelector(".backup-file").files[0];
      if (!file) return (error.textContent = "Selecione o arquivo de backup.");
      let stateBeforeRestore = null;
      try {
        const backup = JSON.parse(await file.text());
        if (backup.app !== APP_NAME || !backup.tables) throw new Error("Arquivo incompatível.");
        if (keys.some((key) => !Array.isArray(backup.tables[key]))) throw new Error("O backup não contém todas as bases selecionadas.");
        if (!confirm(`Substituir integralmente: ${keys.map((k) => DATA_TABLES[k]).join(", ")}?`)) return;
        stateBeforeRestore = cloneDataState();
        keys.forEach((key) => {
          if (key === "movements") movements = backup.tables[key].map(normalizeMovement);
          if (key === "registers") registers = backup.tables[key].map(normalizeRegister);
          if (key === "vehicles") vehicles = backup.tables[key].map(normalizeVehicle);
          if (key === "drivers") drivers = backup.tables[key];
          if (key === "suppliers") suppliers = backup.tables[key];
          if (key === "paymentMethods") paymentMethods = backup.tables[key];
          if (key === "alerts") alerts = backup.tables[key];
          if (key === "alertHistory") alertHistory = backup.tables[key];
          if (key === "technicalParameters") technicalParameters = backup.tables[key];
        });
        ensureTechnicalData();
        enforceSingleDefaults();
        movements.forEach(enforceItemGroup);
        recalculateDistances();
        save();
        dialog.close();
        alert("Restauração concluída. As bases selecionadas foram substituídas.");
      } catch (e) {
        if (stateBeforeRestore) restoreDataState(stateBeforeRestore);
        console.error("Falha na restauração de dados:", e);
        error.textContent = e.message || "Não foi possível restaurar este backup. Nenhuma base foi alterada.";
      }
      return;
    }
    const dependent = keys.some((key) => key !== "movements");
    if (dependent && movements.length && !keys.includes("movements"))
      return (error.textContent = "Para excluir bases cadastrais com movimentos existentes, selecione também Movimentos. Essa proteção evita referências inconsistentes.");
    const makeBackup = confirm("Deseja fazer um backup das bases selecionadas antes de excluí-las?\n\nOK: fazer backup e continuar.\nCancelar: escolher entre continuar sem backup ou sair.");
    if (makeBackup) downloadBackup(keys);
    else if (!confirm("Continuar sem fazer backup?")) return;
    if (!confirm(`Primeira confirmação:\n\nExcluir ${keys.map((k) => DATA_TABLES[k]).join(", ")}?`)) return;
    if (prompt('Segunda confirmação: digite EXCLUIR') !== "EXCLUIR") return (error.textContent = "Confirmação inválida. Nada foi excluído.");
    const stateBeforeDelete = cloneDataState();
    keys.forEach((key) => {
      if (key === "movements") movements = [];
      if (key === "registers") registers = [];
      if (key === "vehicles") vehicles = [];
      if (key === "drivers") drivers = [];
      if (key === "suppliers") suppliers = [];
      if (key === "paymentMethods") paymentMethods = [];
      if (key === "alerts") alerts = [];
      if (key === "alertHistory") alertHistory = [];
      if (key === "technicalParameters") technicalParameters = [];
    });
    try {
      save();
      dialog.close();
      alert("As bases selecionadas foram excluídas.");
    } catch (e) {
      restoreDataState(stateBeforeDelete);
      console.error("Falha na exclusão das bases:", e);
      error.textContent = "Não foi possível excluir as bases. Nenhum dado foi alterado.";
    }
  };
  dialog.showModal();
}
$("#openBackup").onclick = () => openDataSelector("backup");
$("#openRestore").onclick = () => openDataSelector("restore");
$("#openDeleteData").onclick = () => openDataSelector("delete");

function addMonths(date, months) {
  const value = new Date(date);
  value.setMonth(value.getMonth() + Number(months || 0));
  return value;
}
function dateOnly(value) {
  return value ? new Date(String(value).slice(0, 10) + "T12:00:00") : null;
}
function technicalBase(vehicle, key) {
  const label = TECHNICAL_ITEMS[key].label.toLocaleLowerCase("pt-BR");
  const related = movements.filter((m) =>
    m.veiculo === vehicle.nome &&
    String(m.item || "").toLocaleLowerCase("pt-BR") === label)
    .sort(newestFirst)[0];
  const completed = alertHistory.filter((h) => h.vehicleId === vehicle.id && h.technicalKey === key)
    .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))[0];
  if (completed && (!related || new Date(completed.completedAt) > new Date(related.data_hora)))
    return { date: completed.completedAt, km: Number(completed.completedKm || vehicle.kmInicial || 0) };
  if (related) return { date: related.data_hora, km: Number(related.hodometro_km || 0) };
  const first = movements.filter((m) => m.veiculo === vehicle.nome).sort((a, b) => new Date(a.data_hora) - new Date(b.data_hora))[0];
  return { date: first?.data_hora || vehicle.criadoEm || new Date().toISOString(), km: Number(first?.hodometro_km ?? vehicle.kmInicial ?? 0) };
}
function ensureTechnicalData() {
  alerts = alerts.map(normalizeAlertRecord);
  alertHistory = alertHistory.map(normalizeAlertHistoryRecord);
  technicalParameters = technicalParameters.map(normalizeTechnicalParameter);
  registers.forEach((r) => {
    const name = String(r.item || "").toLocaleLowerCase("pt-BR");
    if (name === "troca de óleo") r.technicalKey = "OIL";
    if (name === "bateria") r.technicalKey = "BATTERY";
  });
  if (!registers.some((r) => r.item === NI))
    registers.push({ id: "technical-ni", grupo: "MANUTENÇÃO", item: NI, padrao: false, ativo: true });
  alerts.forEach((item) => {
    item.group = "MANUTENÇÃO";
    item.technical = true;
    const vehicle = vehicles.find((v) => v.id === item.vehicleId);
    if (!vehicle) {
      item.active = false;
      item.orphaned = true;
      return;
    }
    delete item.orphaned;
    if (vehicle.ativo === false) {
      if (item.active) item.activeBeforeVehicleInactive = true;
      item.active = false;
    } else if (item.activeBeforeVehicleInactive) {
      item.active = true;
      delete item.activeBeforeVehicleInactive;
    }
  });
  vehicles.filter((v) => v.ativo !== false).forEach((vehicle) => {
    Object.values(TECHNICAL_ITEMS).forEach((spec) => {
      let parameter = technicalParameters.find((p) => p.vehicleId === vehicle.id && p.technicalKey === spec.key);
      if (!parameter) {
        parameter = { id: crypto.randomUUID(), vehicleId: vehicle.id, technicalKey: spec.key,
          intervalKm: spec.km, intervalMonths: spec.months, active: true, deleted: false };
        technicalParameters.push(parameter);
      }
      if (parameter.deleted === true) return;
      let item = alerts.find((a) => a.vehicleId === vehicle.id && a.technicalKey === spec.key && !a.archived);
      if (!item) {
        item = { id: crypto.randomUUID(), vehicleId: vehicle.id, group: "MANUTENÇÃO",
          itemId: registers.find((r) => r.technicalKey === spec.key)?.id || "",
          description: spec.label, technicalKey: spec.key, active: parameter.active,
          technical: true, manualSchedule: false,
          recurrence: spec.key === "OIL" ? "BOTH" : "MONTHS", leadDays: 30, leadKm: spec.key === "OIL" ? 500 : 0 };
        alerts.push(item);
      }
      Object.assign(item, {
        technical: true,
        active: parameter.active,
        recurrenceKm: Number(parameter.intervalKm || 0),
        recurrenceMonths: Number(parameter.intervalMonths || 0),
      });
      if (!item.manualSchedule) {
        item.criterion = parameter.intervalKm > 0 && parameter.intervalMonths > 0 ? "BOTH" :
          parameter.intervalKm > 0 ? "KM" : "DATE";
        const base = technicalBase(vehicle, spec.key);
        item.dueKm = parameter.intervalKm ? base.km + Number(parameter.intervalKm) : 0;
        item.dueDate = parameter.intervalMonths ? addMonths(dateOnly(base.date), parameter.intervalMonths).toISOString().slice(0, 10) : "";
      }
    });
  });
}
function alertStatus(item) {
  if (!item.active) return "INATIVO";
  if (item.completed) return "CONCLUÍDO";
  const vehicle = vehicles.find((v) => v.id === item.vehicleId);
  if (!vehicle || vehicle.ativo === false) return "INATIVO";
  const km = vehicle ? vehicleSummary(vehicle).last : 0;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const dueDate = dateOnly(item.dueDate);
  const dateDue = dueDate && today >= dueDate;
  const kmDue = Number(item.dueKm) > 0 && km >= Number(item.dueKm);
  if ((item.criterion !== "KM" && dateDue) || (item.criterion !== "DATE" && kmDue)) return "VENCIDO";
  const attentionDate = dueDate && today >= new Date(dueDate.getTime() - Number(item.leadDays || 0) * 86400000);
  const attentionKm = Number(item.dueKm) > 0 && km >= Number(item.dueKm) - Number(item.leadKm || 0);
  return ((item.criterion !== "KM" && attentionDate) || (item.criterion !== "DATE" && attentionKm)) ? "ATENÇÃO" : "PROGRAMADO";
}
function alertForecast(item) {
  const parts = [];
  if (item.criterion !== "KM" && item.dueDate) parts.push(new Date(item.dueDate + "T12:00:00").toLocaleDateString("pt-BR"));
  if (item.criterion !== "DATE" && Number(item.dueKm)) parts.push(`${intFmt(item.dueKm)} km`);
  return parts.join(" ou ") || "Sem previsão";
}
function evaluateAlerts(notify = false) {
  ensureTechnicalData();
  const selected = selectedVehicleObject();
  const due = selected?.ativo === false ? [] : alerts.filter((a) =>
    a.vehicleId === selected?.id && ["ATENÇÃO", "VENCIDO"].includes(alertStatus(a)));
  renderAlerts();
  if (notify && due.length) alert(`${due.length} alerta(s) técnico(s) requer(em) atenção para o veículo selecionado.`);
}
function deleteAlert(id) {
  const item = alerts.find((a) => a.id === id);
  if (!item) return;
  const vehicle = vehicles.find((v) => v.id === item.vehicleId);
  if (vehicle?.ativo === false)
    return alert("Veículo inativo: os alertas estão disponíveis somente para consulta.");
  if (!confirm(
    "Excluir alerta técnico?\n\n" +
    "Os alertas são utilizados na programação das manutenções do veículo. " +
    "A exclusão removerá somente este alerta e sua programação futura e não apagará " +
    "os registros do histórico técnico.\n\n" +
    "Tem certeza de que deseja excluir?",
  )) return;
  const stateBeforeSave = cloneDataState();
  if (item.technicalKey) {
    let parameter = technicalParameters.find((p) =>
      p.vehicleId === item.vehicleId && p.technicalKey === item.technicalKey);
    if (!parameter) {
      parameter = { id: crypto.randomUUID(), vehicleId: item.vehicleId,
        technicalKey: item.technicalKey, intervalKm: 0, intervalMonths: 0 };
      technicalParameters.push(parameter);
    }
    parameter.active = false;
    parameter.deleted = true;
  }
  alerts = alerts.filter((a) => a.id !== id);
  try {
    save();
    showToast("Alerta excluído. O histórico técnico foi preservado.");
  } catch (error) {
    restoreDataState(stateBeforeSave);
    console.error("Falha ao excluir o alerta técnico:", error);
    alert("Não foi possível excluir o alerta. Nenhum dado foi alterado.");
  }
}
function technicalHistoryRecords(vehicleId) {
  if (!vehicleId) return [];
  const vehicle = vehicles.find((v) => v.id === vehicleId);
  const completed = alertHistory
    .filter((h) => h.vehicleId === vehicleId)
    .map((h) => ({
      id: `history-${h.id}`,
      date: h.completedAt,
      km: Number(h.completedKm || 0),
      description: h.description || "Manutenção concluída",
      supplier: NI,
      observation: "Conclusão registrada no histórico técnico",
      value: 0,
      status: "CONCLUÍDO",
      forecast: "Histórico preservado",
      source: "ALERTA",
    }));
  const maintenance = movements
    .filter((m) => m.grupo === "MANUTENÇÃO" &&
      (m.veiculo_id === vehicleId || m.veiculo === vehicle?.nome))
    .map((m) => {
      const related = alerts.find((a) => a.vehicleId === vehicleId &&
        (a.itemId === m.item_id || a.description === m.item));
      return {
        id: `movement-${m.id}`,
        date: m.data_hora,
        km: Number(m.hodometro_km || 0),
        description: m.item || "Manutenção",
        supplier: m.fornecedor || NI,
        observation: m.observacao || "",
        value: Number(m.valor || 0),
        status: related ? alertStatus(related) : "REGISTRADO",
        forecast: related ? alertForecast(related) : "—",
        source: "MOVIMENTO",
      };
    });
  const seen = new Set();
  return [...completed, ...maintenance]
    .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0) || b.km - a.km)
    .filter((record) => {
      const key = `${String(record.date || "").slice(0, 10)}|${record.km}|${normalizeText(record.description)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}
function renderAlerts() {
  if (!$("#alertList")) return;
  ensureTechnicalData();
  const selectedVehicle = selectedVehicleObject();
  const vehicleSelect = $("#alertVehicle");
  vehicleSelect.innerHTML = selectedVehicle ? `<option value="${selectedVehicle.id}">${esc(selectedVehicle.nome)}${selectedVehicle.ativo === false ? " (Inativo)" : ""}</option>` : '<option value="">Nenhum veículo selecionado</option>';
  vehicleSelect.value = selectedVehicle?.id || ""; vehicleSelect.disabled = true;
  $("#newAlert").disabled = !selectedVehicle || selectedVehicle.ativo === false;
  $("#newAlert").title = selectedVehicle?.ativo === false
    ? "Veículos inativos não podem receber novos alertas."
    : "Novo alerta técnico";
  const filteredAlerts = alerts.filter((a) => a.vehicleId === selectedVehicle?.id);
  const rows = filteredAlerts.filter((a) => !$("#alertStatus").value || alertStatus(a) === $("#alertStatus").value);
  const counts = ["VENCIDO", "ATENÇÃO", "PROGRAMADO", "CONCLUÍDO", "INATIVO"].map((status) => [status, filteredAlerts.filter((a) => alertStatus(a) === status).length]);
  $("#alertSummary").innerHTML = counts.map(([status,total]) => `<article><small>${status}</small><b>${total}</b></article>`).join("");
  $("#alertList").innerHTML = rows.map((a) => { const status=alertStatus(a), vehicle=vehicles.find((v)=>v.id===a.vehicleId), canOperate=vehicle?.ativo!==false; return `<article class="item alert-card" data-status="${status}"><div><b>⚙ ${esc(a.description)}</b><small>${esc(vehicle?.nome || "Veículo não localizado")} · ${esc(a.group || "")}</small><div class="alert-meta"><span>${status}</span><span>Previsão: ${alertForecast(a)}</span><span>Alerta técnico</span></div></div><div class="movement-actions">${canOperate ? `<button type="button" data-alert-edit="${a.id}">Alterar</button>` : ""}${canOperate && !["CONCLUÍDO","INATIVO"].includes(status) ? `<button type="button" data-alert-complete="${a.id}">Concluir</button>` : ""}${canOperate ? `<button type="button" data-alert-toggle="${a.id}">${a.active ? "Desativar" : "Ativar"}</button>` : ""}${canOperate ? `<button type="button" data-alert-delete="${a.id}">Excluir</button>` : ""}</div></article>`; }).join("") || '<p class="muted">Nenhum alerta de manutenção encontrado para o veículo selecionado.</p>';
  const history = technicalHistoryRecords(selectedVehicle?.id);
  $("#technicalHistoryList").innerHTML = history.length
    ? history.map((record) => `<article class="item"><div><b>${esc(record.description)}</b><small>${record.date ? new Date(record.date).toLocaleDateString("pt-BR") : "Data não informada"} · ${intFmt(record.km)} km · ${record.source === "ALERTA" ? "Conclusão de alerta" : "Lançamento de manutenção"}</small><div class="alert-meta"><span>${esc(record.status)}</span><span>${esc(record.supplier)}</span>${record.observation ? `<span>${esc(record.observation)}</span>` : ""}</div></div><div class="amount"><b>${record.value ? money(record.value) : "Histórico"}</b><small>${esc(record.forecast)}</small></div></article>`).join("")
    : '<div class="technical-history-empty">Nenhum registro técnico para o veículo selecionado.</div>';
  $$("[data-alert-edit]").forEach((b)=>b.onclick=()=>openAlert(b.dataset.alertEdit)); $$("[data-alert-complete]").forEach((b)=>b.onclick=()=>completeAlert(b.dataset.alertComplete)); $$("[data-alert-toggle]").forEach((b)=>b.onclick=()=>toggleAlert(b.dataset.alertToggle)); $$("[data-alert-delete]").forEach((b)=>b.onclick=()=>deleteAlert(b.dataset.alertDelete));
}
function fillAlertItems() {
  const f = $("#alertForm");
  f.itemId.innerHTML = alpha(
    registers.filter((r) => r.grupo === "MANUTENÇÃO" && r.ativo !== false),
    "item",
  ).map((r) => `<option value="${r.id}">${esc(r.item)}</option>`).join("");
}
function openAlert(id = "") {
  const f = $("#alertForm"), item = alerts.find((a) => a.id === id);
  f.reset(); f.id.value = id;
  const selectedVehicle = selectedVehicleObject();
  if (!item && (!selectedVehicle || selectedVehicle.ativo === false)) {
    alert("Selecione um veículo ativo antes de incluir um alerta técnico.");
    return;
  }
  f.vehicleId.innerHTML = selectedVehicle ? `<option value="${selectedVehicle.id}">${esc(selectedVehicle.nome)}</option>` : "";
  f.vehicleId.value = item?.vehicleId || selectedVehicle?.id || "";
  f.vehicleId.disabled = true;
  f.group.innerHTML = '<option value="MANUTENÇÃO">MANUTENÇÃO</option>';
  f.group.value = "MANUTENÇÃO";
  f.group.disabled = true;
  fillAlertItems();
  if (item) Object.entries(item).forEach(([key, value]) => {
    if (!f.elements[key]) return;
    if (f.elements[key].type === "checkbox") f.elements[key].checked = Boolean(value);
    else f.elements[key].value = value ?? "";
  });
  if (item) {
    f.group.value = "MANUTENÇÃO";
    fillAlertItems();
    f.itemId.value = item.itemId || "";
  }
  $("#alertFormTitle").textContent = item ? "Alterar alerta de manutenção" : "Novo alerta de manutenção";
  $("#alertFormError").textContent = "";
  $("#alertDialog").showModal();
}
function completeAlert(id) {
  const item = alerts.find((a) => a.id === id);
  if (!item) return;
  const vehicle = vehicles.find((v) => v.id === item.vehicleId);
  const date = prompt("Data da conclusão (AAAA-MM-DD):", new Date().toISOString().slice(0, 10));
  if (!date) return;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(dateOnly(date)?.getTime()))
    return alert("Informe uma data válida no formato AAAA-MM-DD.");
  const kmAnswer = prompt("Hodômetro da conclusão:", String(vehicle ? vehicleSummary(vehicle).last : 0));
  if (kmAnswer == null) return;
  const km = Number(String(kmAnswer).replace(/\D/g, ""));
  if (!(km >= 0)) return alert("Informe um hodômetro válido.");
  const stateBeforeSave = cloneDataState();
  alertHistory.push({ id: crypto.randomUUID(), alertId: item.id, vehicleId: item.vehicleId,
    technicalKey: item.technicalKey || "", description: item.description, completedAt: date + "T12:00:00", completedKm: km });
  if (item.recurrence !== "NONE") {
    if (["MONTHS","BOTH"].includes(item.recurrence) && item.recurrenceMonths)
      item.dueDate = addMonths(dateOnly(date), item.recurrenceMonths).toISOString().slice(0, 10);
    if (["KM","BOTH"].includes(item.recurrence) && item.recurrenceKm)
      item.dueKm = km + Number(item.recurrenceKm);
    item.completed = false;
    item.manualSchedule = true;
  } else item.completed = true;
  try {
    save();
    showToast("Manutenção concluída e histórico técnico atualizado.");
  } catch (error) {
    restoreDataState(stateBeforeSave);
    console.error("Falha ao concluir o alerta:", error);
    alert("Não foi possível registrar a conclusão. Nenhum histórico foi alterado.");
  }
}
function toggleAlert(id) {
  const item = alerts.find((a) => a.id === id);
  const vehicle = vehicles.find((v) => v.id === item?.vehicleId);
  if (!item || vehicle?.ativo === false) return alert("Alarmes só podem ser ativados para veículos ativos.");
  const stateBeforeSave = cloneDataState();
  item.active = !item.active;
  if (item.technicalKey) {
    const p = technicalParameters.find((x) => x.vehicleId === item.vehicleId && x.technicalKey === item.technicalKey);
    if (p) p.active = item.active;
  }
  try {
    save();
    showToast(item.active ? "Alerta técnico ativado." : "Alerta técnico desativado.");
  } catch (error) {
    restoreDataState(stateBeforeSave);
    console.error("Falha ao alterar a situação do alerta:", error);
    alert("Não foi possível alterar a situação do alerta. Nenhum dado foi alterado.");
  }
}
$("#newAlert").onclick = () => openAlert();
$("#alertVehicle").onchange = renderAlerts;
$("#alertStatus").onchange = renderAlerts;
$$(".alert-cancel").forEach((b) => b.onclick = () => $("#alertDialog").close());
$("#alertForm").onsubmit = (event) => {
  event.preventDefault();
  const f = event.target, data = Object.fromEntries(new FormData(f));
  data.vehicleId = f.vehicleId.value;
  data.group = "MANUTENÇÃO";
  const current = alerts.find((a) => a.id === data.id);
  if (!data.vehicleId || !data.description || !data.itemId) return ($("#alertFormError").textContent = "Preencha veículo, item de manutenção e descrição.");
  const vehicle = vehicles.find((v) => v.id === data.vehicleId);
  if (!vehicle || vehicle.ativo === false)
    return ($("#alertFormError").textContent = "Alertas somente podem ser gravados para veículos ativos.");
  const dueKm = Number(data.dueKm || 0);
  if (["DATE", "BOTH"].includes(data.criterion) && !data.dueDate)
    return ($("#alertFormError").textContent = "Informe a data prevista para o critério selecionado.");
  if (["KM", "BOTH"].includes(data.criterion) && !(dueKm > 0))
    return ($("#alertFormError").textContent = "Informe a quilometragem prevista para o critério selecionado.");
  const selectedRegister = registers.find((r) => r.id === data.itemId);
  const oldTechnicalKey = current?.technicalKey || "";
  const technicalKey = selectedRegister?.technicalKey || "";
  const stateBeforeSave = cloneDataState();
  if (oldTechnicalKey && oldTechnicalKey !== technicalKey) {
    const previousParameter = technicalParameters.find((p) =>
      p.vehicleId === data.vehicleId && p.technicalKey === oldTechnicalKey);
    if (previousParameter) Object.assign(previousParameter, { active: false, deleted: true });
  }
  const object = { ...current, ...data, id: data.id || crypto.randomUUID(), active: f.active.checked,
    group: "MANUTENÇÃO", technical: true, technicalKey, manualSchedule: true, completed: false,
    leadDays: Number(data.leadDays || 0), leadKm: Number(data.leadKm || 0), dueKm: Number(data.dueKm || 0),
    recurrenceMonths: Number(data.recurrenceMonths || 0), recurrenceKm: Number(data.recurrenceKm || 0) };
  if (current) Object.assign(current, object); else alerts.push(object);
  if (object.technicalKey) {
    let p = technicalParameters.find((x) => x.vehicleId === object.vehicleId && x.technicalKey === object.technicalKey);
    if (!p) {
      p = { id: crypto.randomUUID(), vehicleId: object.vehicleId, technicalKey: object.technicalKey };
      technicalParameters.push(p);
    }
    Object.assign(p, { active: object.active, deleted: false,
      intervalKm: object.recurrenceKm, intervalMonths: object.recurrenceMonths });
  }
  try {
    save();
    $("#alertDialog").close();
    showToast("Alerta de manutenção salvo com sucesso.");
  } catch (error) {
    restoreDataState(stateBeforeSave);
    console.error("Falha ao salvar o alerta técnico:", error);
    $("#alertFormError").textContent = "Não foi possível salvar o alerta. Verifique os dados e tente novamente.";
  }
};
function exportTechnicalPdf() {
  const vehicle = selectedVehicleObject();
  const records = technicalHistoryRecords(vehicle?.id || "");
  const rows = records.map((record) =>
    `<tr><td>${record.date ? new Date(record.date).toLocaleDateString("pt-BR") : "—"}</td><td>${intFmt(record.km)}</td><td>${esc(record.description)}</td><td>${esc(record.supplier || NI)}</td><td>${esc(record.observation || "")}</td><td>${record.value ? money(record.value) : "—"}</td><td>${esc(record.status)}</td><td>${esc(record.forecast)}</td></tr>`,
  ).join("");
  const content = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Histórico técnico</title><style>@page{size:A4 landscape;margin:12mm}body{font:12px Arial;color:#203040;margin:0;padding:12px}h1{color:#0f3f66}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ccd8e0;padding:6px;text-align:left}th{background:#eaf1f6}.actions{display:flex;gap:8px;margin-bottom:14px}.actions button{border:0;border-radius:8px;padding:10px 13px;font-weight:800}.actions .primary{background:#0788e8;color:#fff}.actions .danger{background:#b3261e;color:#fff}@media print{.actions{display:none}}</style></head><body><div class="actions"><button type="button" id="technicalClose" class="danger">Fechar</button><button type="button" id="technicalPrint">Imprimir</button><button type="button" id="technicalSave" class="primary">Histórico técnico PDF</button></div><h1>Histórico técnico de manutenção</h1><p>Veículo: ${esc(vehicle?.nome || "Nenhum veículo selecionado")} · Emissão: ${new Date().toLocaleDateString("pt-BR")}</p><table><thead><tr><th>Data</th><th>Hodômetro</th><th>Serviço/item</th><th>Fornecedor/oficina</th><th>Descrição</th><th>Valor</th><th>Situação</th><th>Próxima previsão</th></tr></thead><tbody>${rows || '<tr><td colspan="8">Sem registros técnicos para o veículo selecionado.</td></tr>'}</tbody></table><script>(function(){function bridge(){try{return window.MyCarNative||(window.parent&&window.parent.MyCarNative)||(window.opener&&window.opener.MyCarNative)||null}catch(e){return null}}function printable(){var clone=document.documentElement.cloneNode(true);clone.querySelectorAll('.actions,script').forEach(function(n){n.remove()});return '<!doctype html>'+clone.outerHTML}function closeMe(){try{if(window.parent&&window.parent!==window){window.parent.postMessage({type:'mycar-close-report'},'*');return}}catch(e){}try{window.close()}catch(e){}}function printMe(){var b=bridge();if(b&&typeof b.printHtml==='function'){try{b.printHtml('Historico_Tecnico_MyCarPlus',printable());return}catch(e){}}try{window.focus();window.print()}catch(e){alert('Não foi possível abrir a impressão neste dispositivo.')}}document.getElementById('technicalClose').onclick=closeMe;document.getElementById('technicalPrint').onclick=printMe;document.getElementById('technicalSave').onclick=printMe;document.addEventListener('keydown',function(e){if(e.key==='Escape')closeMe()});})();<\/script></body></html>`;
  openReportDocument(content, {
    title: "Histórico técnico de manutenção",
    popupMessage: "Permita janelas pop-up para gerar o histórico técnico.",
  });
}
$("#technicalPdf").onclick = exportTechnicalPdf;

function applyTheme(mode) {
  const dark = mode === "dark" || (mode === "auto" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  localStorage.setItem("mycar_theme", mode);
  $$("[data-theme-mode]").forEach((button) => {
    button.classList.toggle("active", button.dataset.themeMode === mode);
    button.setAttribute("aria-pressed", String(button.dataset.themeMode === mode));
  });
}
$$("[data-theme-mode]").forEach((button) => {
  button.onclick = () => {
    const returnPage = pageTrail.at(-1);
    applyTheme(button.dataset.themeMode);
    if (currentPageId === "configuracoes" && returnPage && returnPage !== "configuracoes") {
      pageTrail.pop();
      go(returnPage, { fromBack: true, instant: true });
    }
  };
});
$$("[data-quick-theme]").forEach((button) => {
  button.onclick = (event) => {
    event.stopPropagation();
    applyTheme(button.dataset.quickTheme);
    headerMenu.hidden = true;
    menuBtn.setAttribute("aria-expanded", "false");
  };
});
applyTheme(localStorage.getItem("mycar_theme") || "dark");
const gpsRadiusSelect = $("#gpsSupplierRadius");
if (gpsRadiusSelect) {
  gpsRadiusSelect.value = String(gpsSupplierRadiusMeters());
  gpsRadiusSelect.onchange = () => {
    localStorage.setItem("mycar_gps_supplier_radius", gpsRadiusSelect.value);
  };
}
const systemTheme = matchMedia("(prefers-color-scheme: dark)");
systemTheme.addEventListener?.("change", () => {
  if ((localStorage.getItem("mycar_theme") || "dark") === "auto") applyTheme("auto");
});
let lastAiReport = null;

function escapeAiHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char]);
}

function aiPeriodRows(vehicleId, start, end) {
  const vehicle = vehicles.find((v) => v.id === vehicleId);
  const name = vehicle?.nome || "";
  return movements.filter((m) => {
    const day = String(m.data_hora || "").slice(0, 10);
    return (m.veiculo_id === vehicleId || (!m.veiculo_id && m.veiculo === name)) &&
      day >= start && day <= end;
  });
}

function buildAiIndicators(vehicleId, start, end, analysisType) {
  const vehicle = vehicles.find((v) => v.id === vehicleId);
  const rows = aiPeriodRows(vehicleId, start, end);
  const movementMap = new Map();
  rows.forEach((row) => {
    const key = row.movimento_id || row.id;
    if (!movementMap.has(key)) movementMap.set(key, row);
  });
  const uniqueMovements = [...movementMap.values()];
  const expenseRows = rows.filter((m) => m.grupo !== "RECEITA");
  const incomeRows = rows.filter((m) => m.grupo === "RECEITA");
  const gross = expenseRows.reduce((sum, m) => sum + (+m.valor || 0), 0);
  const income = incomeRows.reduce((sum, m) => sum + (+m.valor || 0), 0);
  const odometers = uniqueMovements.map((m) => +m.hodometro_km || 0).filter(Boolean);
  const distance = odometers.length > 1 ? Math.max(...odometers) - Math.min(...odometers) : 0;
  const days = Math.max(1, Math.round((new Date(end + "T12:00:00") - new Date(start + "T12:00:00")) / 86400000) + 1);
  const completeFuel = rows.filter((m) => m.grupo === "COMBUSTÍVEL" && m.tanque_completo !== "NAO" && (+m.quantidade_litros || 0) > 0);
  const incompleteFuel = rows.filter((m) => m.grupo === "COMBUSTÍVEL" && m.tanque_completo === "NAO");
  const fuelLiters = completeFuel.reduce((sum, m) => sum + (+m.quantidade_litros || 0), 0);
  const fuelDistance = completeFuel.reduce((sum, m) => sum + (+(m.distancia_abastecimento_km ?? m.distancia_km) || 0), 0);
  const byGroup = {};
  rows.forEach((m) => {
    byGroup[m.grupo] = (byGroup[m.grupo] || 0) + (+m.valor || 0);
  });
  const byFuel = {};
  completeFuel.forEach((m) => {
    const key = m.item || "Não informado";
    byFuel[key] ||= { litros: 0, valor: 0, distancia: 0, registros: 0 };
    byFuel[key].litros += +m.quantidade_litros || 0;
    byFuel[key].valor += +m.valor || 0;
    byFuel[key].distancia += +(m.distancia_abastecimento_km ?? m.distancia_km) || 0;
    byFuel[key].registros++;
  });
  Object.values(byFuel).forEach((x) => {
    x.consumo_km_l = x.litros ? x.distancia / x.litros : 0;
    x.custo_km = x.distancia ? x.valor / x.distancia : 0;
  });
  const suppliersSummary = {};
  rows.filter((m) => m.grupo !== "RECEITA").forEach((m) => {
    const key = m.fornecedor || "NI - Não informado";
    suppliersSummary[key] ||= { registros: 0, valor: 0 };
    suppliersSummary[key].registros++;
    suppliersSummary[key].valor += +m.valor || 0;
  });
  const values = expenseRows.map((m) => +m.valor || 0);
  const avgValue = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  const highValues = expenseRows.filter((m) => avgValue && +m.valor > avgValue * 2.5)
    .slice(0, 5).map((m) => ({ data: String(m.data_hora).slice(0, 10), item: m.item, valor: +m.valor }));
  const vehicleAlerts = alerts.filter((item) => item.vehicleId === vehicleId).map((item) => ({
    description: item.description,
    status: alertStatus(item),
    forecast: alertForecast(item),
    technical: true,
    active: Boolean(item.active),
  }));
  return {
    schema_version: 1,
    analysis_type: analysisType,
    vehicle: {
      id: vehicleId, name: vehicle?.nome || "Veículo", plate: vehicle?.placa || "", active: vehicle?.ativo !== false,
      consumption_reference: {
        ethanol_city: +vehicle?.consumoEtanolCidade || 0, ethanol_road: +vehicle?.consumoEtanolEstrada || 0,
        gasoline_city: +vehicle?.consumoGasolinaCidade || 0, gasoline_road: +vehicle?.consumoGasolinaEstrada || 0,
        diesel_city: +vehicle?.consumoDieselCidade || 0, diesel_road: +vehicle?.consumoDieselEstrada || 0,
      },
    },
    period: { start, end, days },
    sample: { movements: uniqueMovements.length, item_rows: rows.length, complete_refuels: completeFuel.length, incomplete_refuels: incompleteFuel.length },
    financial: { gross_cost: gross, income, net_cost: gross - income, cost_per_km: distance ? (gross - income) / distance : 0, daily_cost: (gross - income) / days },
    usage: { distance_km: distance, daily_km: distance / days, min_odometer: odometers.length ? Math.min(...odometers) : 0, max_odometer: odometers.length ? Math.max(...odometers) : 0 },
    fuel: { complete_liters: fuelLiters, consumption_km_l: fuelLiters ? fuelDistance / fuelLiters : 0, by_type: byFuel },
    costs_by_group: byGroup,
    suppliers: suppliersSummary,
    maintenance: rows.filter((m) => m.grupo === "MANUTENÇÃO").map((m) => ({ date: String(m.data_hora).slice(0, 10), item: m.item, odometer_km: +m.hodometro_km || 0, value: +m.valor || 0 })).slice(-30),
    alert_snapshot: vehicleAlerts,
    quality: { missing_supplier: rows.filter((m) => !m.fornecedor || /^N\.?I/i.test(m.fornecedor)).length, unusually_high_values: highValues },
  };
}

function aiHealthSummary(indicators) {
  const activeAlerts = (indicators.alert_snapshot || []).filter((a) => a.active);
  const critical = activeAlerts.filter((a) => /vencid|crític|atrasad/i.test(`${a.status} ${a.forecast}`)).length;
  const attention = Math.max(0, activeAlerts.length - critical);
  const missing = +indicators.quality?.missing_supplier || 0;
  const rows = +indicators.sample?.item_rows || 0;
  const incomplete = +indicators.sample?.incomplete_refuels || 0;
  const refuels = (+indicators.sample?.complete_refuels || 0) + incomplete;
  let score = 100;
  score -= Math.min(35, critical * 15);
  score -= Math.min(20, attention * 5);
  score -= rows ? Math.min(10, (missing / rows) * 20) : 5;
  score -= refuels ? Math.min(10, (incomplete / refuels) * 20) : 5;
  score = Math.max(0, Math.round(score));
  const status = score >= 85 ? "Excelente" : score >= 70 ? "Bom" : score >= 50 ? "Atenção" : "Crítico";
  return { score, status, critical, attention };
}

function aiRecommendationRows(items) {
  return (items || []).map((text, index) => {
    const priority = index === 0 ? "Alta" : index < 3 ? "Média" : "Baixa";
    const impact = priority === "Alta" ? "Redução de risco ou custo prioritário" : priority === "Média" ? "Melhoria operacional relevante" : "Aprimoramento preventivo";
    return `<tr><td data-label="Prioridade"><span class="ai-priority ai-priority-${priority.toLowerCase()}">${priority}</span></td><td data-label="Recomendação">${escapeAiHtml(text)}</td><td data-label="Impacto esperado">${impact}</td></tr>`;
  }).join("") || '<tr><td colspan="3">Nenhuma recomendação relevante.</td></tr>';
}

function aiAnomalyRows(items) {
  return (items || []).map((text, index) => {
    const level = /vencid|crític|risco|falha|muito acima/i.test(text) ? "Crítico" : index === 0 ? "Atenção" : "Normal";
    return `<li><strong>${level}:</strong> ${escapeAiHtml(text)}</li>`;
  }).join("") || "<li>Nenhuma ocorrência relevante.</li>";
}

function renderAiReport(report) {
  const k = report.indicators;
  const health = aiHealthSummary(k);
  const annualProjection = k.period.days ? (k.financial.net_cost / k.period.days) * 365 : 0;
  const topCost = Object.entries(k.costs_by_group || {}).sort((a,b) => b[1] - a[1])[0] || ["Sem dados", 0];
  const mainRisk = health.critical ? `${health.critical} alerta(s) crítico(s)` : health.attention ? `${health.attention} alerta(s) em atenção` : "Nenhum alerta crítico ativo";
  const mainRecommendation = (report.recommendations || ["Manter os registros atualizados."])[0];
  return `<p class="ai-meta"><b>Veículo:</b> ${escapeAiHtml(k.vehicle.name)} · <b>Período:</b> ${escapeAiHtml(k.period.start)} a ${escapeAiHtml(k.period.end)} · <b>Movimentos:</b> ${k.sample.movements}</p>
  <div class="ai-kpis"><div><small>Saúde veicular</small><strong>${health.score}/100 · ${health.status}</strong></div><div><small>Distância</small><strong>${intFmt(k.usage.distance_km)} km</strong></div><div><small>Custo líquido</small><strong>${money(k.financial.net_cost)}</strong></div><div><small>Custo por km</small><strong>${money(k.financial.cost_per_km)}</strong></div><div><small>Consumo médio</small><strong>${num(k.fuel.consumption_km_l,2)} km/L</strong></div><div><small>Confiança</small><strong>${escapeAiHtml(report.confidence)}</strong></div></div>
  <div class="ai-executive-cards"><div><small>Principal custo</small><strong>${escapeAiHtml(topCost[0])}</strong><span>${money(topCost[1])}</span></div><div><small>Principal risco</small><strong>${escapeAiHtml(mainRisk)}</strong></div><div><small>Principal recomendação</small><strong>${escapeAiHtml(mainRecommendation)}</strong></div></div>
  <section class="ai-report-section"><h4>1. Resumo executivo</h4><p>${escapeAiHtml(report.executive_summary)}</p></section>
  <section class="ai-report-section"><h4>2. Combustível e consumo</h4><p>${escapeAiHtml(report.fuel_analysis)}</p><small>${k.sample.incomplete_refuels} abastecimento(s) incompleto(s) excluído(s) do consumo em km/L e mantido(s) nos custos.</small></section>
  <section class="ai-report-section"><h4>3. Custos, uso e projeção</h4><p>${escapeAiHtml(report.cost_analysis)}</p><p><b>Projeção anual pelo ritmo do período:</b> ${money(annualProjection)}. A projeção é linear e não representa garantia de gasto futuro.</p></section>
  <section class="ai-report-section"><h4>4. Anomalias classificadas</h4><ul>${aiAnomalyRows(report.anomalies)}</ul></section>
  <section class="ai-report-section"><h4>5. Manutenção e alertas</h4><p>${escapeAiHtml(report.maintenance_analysis)}</p><p><b>Painel:</b> ${health.critical} crítico(s), ${health.attention} em atenção e ${(k.alert_snapshot || []).filter(a=>a.active).length} alerta(s) ativo(s).</p></section>
  <section class="ai-report-section"><h4>6. Fornecedores</h4><p>${escapeAiHtml(report.supplier_analysis)}</p></section>
  <section class="ai-report-section"><h4>7. Plano de ação priorizado</h4><table class="ai-action-table"><thead><tr><th>Prioridade</th><th>Recomendação</th><th>Impacto esperado</th></tr></thead><tbody>${aiRecommendationRows(report.recommendations)}</tbody></table></section>
  <section class="ai-report-section"><h4>8. Critérios e limitações</h4><p>${escapeAiHtml(report.limitations)}</p><small>Indicadores calculados pelo MyCar+. Interpretação gerada por Inteligência Artificial. Esta análise não substitui avaliação mecânica profissional.</small></section>`;
}

function openAiPrintableReport() {
  if (!lastAiReport) return;
  const reportBody = renderAiReport(lastAiReport);
  const documentHtml = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1"><title>Relatório MyCar+ Intelligence</title><style>
  :root{--navy:#12395b;--blue:#0788e8;--surface:#f1f7fb;--border:#c7d8e4;--text:#243746;--muted:#607080}*{box-sizing:border-box}html,body{width:100%;max-width:100%;overflow-x:hidden}body{font-family:Arial,sans-serif;color:var(--text);line-height:1.45;width:100%;max-width:185mm;margin:0 auto;padding:14px 10px 0;background:#fff;overflow-wrap:anywhere}h1,h2,h4{color:var(--navy)}.header{border-bottom:3px solid var(--blue);margin-bottom:16px}.header h1{margin-bottom:6px;line-height:1.15}.header p{margin-top:0}.ai-meta{color:var(--muted)}.ai-kpis{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.ai-kpis div{min-width:0;background:var(--surface);padding:10px;border:1px solid var(--border);border-radius:8px}.ai-kpis small{display:block;color:var(--muted)}.ai-kpis strong{display:block;margin-top:4px;overflow-wrap:anywhere}.ai-executive-cards{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin:14px 0}.ai-executive-cards>div{min-width:0;border:1px solid var(--border);border-radius:10px;padding:12px;background:#f8fbfd}.ai-executive-cards small,.ai-executive-cards span{display:block;color:var(--muted)}.ai-executive-cards strong{display:block;margin:5px 0;overflow-wrap:anywhere}.ai-report-section{break-inside:avoid;margin:18px 0;max-width:100%}.ai-report-section p,.ai-report-section li{overflow-wrap:anywhere}.ai-action-table{width:100%;max-width:100%;border-collapse:collapse;table-layout:fixed}.ai-action-table th,.ai-action-table td{border:1px solid var(--border);padding:8px;text-align:left;vertical-align:top;overflow-wrap:anywhere}.ai-action-table th:nth-child(1){width:18%}.ai-action-table th:nth-child(2){width:48%}.ai-action-table th:nth-child(3){width:34%}.ai-priority{display:inline-block;border-radius:999px;padding:3px 8px;font-weight:800}.ai-priority-alta{background:#fde8e7;color:#9f201a}.ai-priority-média{background:#fff3d8;color:#845400}.ai-priority-baixa{background:#e8f5ee;color:#17663d}.footer{margin-top:25px;border-top:1px solid #ccd9e2;padding-top:8px;color:var(--muted);font-size:11px}.report-actions{display:flex;justify-content:center;gap:10px;margin:24px -10px 0;padding:14px 12px calc(14px + env(safe-area-inset-bottom));background:var(--navy)}.report-actions button{border:0;border-radius:8px;padding:11px 16px;font-weight:700;cursor:pointer;min-height:44px}.report-actions .primary{background:var(--blue);color:#fff}.report-actions .danger{background:#b3261e;color:#fff}@page{size:A4 portrait;margin:14mm}@media print{html,body{overflow:visible}body{max-width:none;padding:0}.report-actions{display:none}}@media screen and (max-width:680px){body{padding:12px 10px 0}.header h1{font-size:21px}.header p{font-size:12px}.ai-meta{font-size:12px}.ai-kpis{grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}.ai-kpis div{padding:9px}.ai-kpis strong{font-size:14px}.ai-executive-cards{grid-template-columns:1fr;gap:8px}.ai-report-section{margin:15px 0}.ai-report-section h4{font-size:16px;margin-bottom:7px}.ai-report-section p,.ai-report-section li{font-size:13px}.ai-action-table{display:block;border:0}.ai-action-table thead{display:none}.ai-action-table tbody{display:block}.ai-action-table tr{display:block;margin-bottom:10px;border:1px solid var(--border);border-radius:8px;overflow:hidden}.ai-action-table td{display:grid;grid-template-columns:minmax(100px,38%) minmax(0,1fr);gap:8px;width:100%;border:0;border-bottom:1px solid #e1e9ee;padding:8px;font-size:12px}.ai-action-table td:last-child{border-bottom:0}.ai-action-table td::before{content:attr(data-label);font-weight:800;color:var(--navy);font-size:11px}.report-actions{position:sticky;bottom:0;z-index:20;flex-wrap:wrap}.report-actions button{flex:1 1 145px}}@media screen and (max-width:390px){.ai-kpis{grid-template-columns:1fr}.report-actions button{flex-basis:100%}.ai-action-table td{grid-template-columns:minmax(92px,36%) minmax(0,1fr)}}
  </style></head><body><div class="header"><h1>Relatório Executivo de Gestão Veicular</h1><p><strong>Gerado com Inteligência Artificial</strong> · MyCar+ Intelligence · emissão ${new Date().toLocaleString("pt-BR")}</p></div>${reportBody}<div class="footer">Relatório gerado a partir dos dados informados no MyCar+. Os indicadores são calculados pelo MyCar+. A Inteligência Artificial interpreta os resultados e gera diagnósticos, tendências e recomendações. A qualidade das conclusões depende da consistência dos dados registrados.</div><div class="report-actions"><button type="button" id="aiReportClose" class="danger">Fechar</button><button type="button" id="aiReportShare" class="primary">Compartilhar</button></div><script>(function(){function printable(){var clone=document.documentElement.cloneNode(true);clone.querySelectorAll('.report-actions,script').forEach(function(n){n.remove()});return '<!doctype html>'+clone.outerHTML}function shareHtml(){try{if(window.parent&&window.parent!==window){window.parent.postMessage({type:'mycar-share-report-html',jobName:'Relatorio_Inteligencia_MyCarPlus',html:printable()},'*');return}}catch(e){}try{var html=printable();var blob=new Blob([html],{type:'text/html;charset=utf-8'});var url=URL.createObjectURL(blob);var a=document.createElement('a');a.href=url;a.download='Relatorio_MyCarPlus.html';document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(url)},1500)}catch(e){alert('Não foi possível preparar o arquivo HTML.')}}function closeMe(){try{if(window.parent&&window.parent!==window){window.parent.postMessage({type:'mycar-close-report'},'*');return}}catch(e){}try{window.close()}catch(e){}setTimeout(function(){if(!window.closed){try{history.length>1?history.back():location.replace('about:blank')}catch(e){}}},150)}document.getElementById('aiReportClose').addEventListener('click',closeMe);document.getElementById('aiReportShare').addEventListener('click',shareHtml);document.addEventListener('keydown',function(e){if(e.key==='Escape')closeMe()});})();<\/script></body></html>`;
  openReportDocument(documentHtml, {
    title: "Relatório com Inteligência Artificial",
    popupMessage: "Permita janelas pop-up para visualizar o relatório.",
  });
}

function initializeAiModule() {
  const form=$("#aiAnalysisForm"); if(!form)return;
  const refreshVehicleContext=()=>{const vehicle=selectedVehicleObject(); $("#aiVehicleName").textContent=vehicle?`${vehicle.nome}${vehicle.placa?" · "+vehicle.placa:""}`:"Nenhum veículo selecionado"; $("#aiVehicleStatus").textContent=vehicle?(vehicle.ativo===false?"Veículo inativo · consulta histórica":"Veículo ativo"):""; if(!vehicle)return; const dates=movements.filter((m)=>m.veiculo_id===vehicle.id||m.veiculo===vehicle.nome).map((m)=>String(m.data_hora||"").slice(0,10)).filter(Boolean).sort(); $("#aiStart").value=dates[0]||""; $("#aiEnd").value=dates.at(-1)||"";};
  refreshVehicleContext(); window.addEventListener("vehicle-app-ready",refreshVehicleContext);
  form.onsubmit=async(event)=>{event.preventDefault(); const error=$("#aiFormError"),result=$("#aiResult"),progress=$("#aiProgress"); error.textContent=""; const vehicle=selectedVehicleObject(),vehicleId=vehicle?.id||"",start=$("#aiStart").value,end=$("#aiEnd").value; if(!vehicleId)return(error.textContent="Selecione um veículo na tela inicial antes de gerar a análise."); if(!start||!end)return(error.textContent="Informe o período completo."); if(start>end)return(error.textContent="A data inicial não pode ser posterior à data final."); if(!navigator.onLine)return(error.textContent="Não foi possível gerar a análise inteligente. Verifique sua conexão com a internet e tente novamente."); const indicators=buildAiIndicators(vehicleId,start,end,$("#aiType").value); if(!indicators.sample.movements)return(error.textContent="Não existem movimentos para o veículo selecionado no período informado."); if(typeof window.mycarAiAnalyze!=="function")return(error.textContent="O Firebase AI Logic ainda não foi carregado. Atualize a página e tente novamente."); progress.hidden=false;result.hidden=true;$("#generateAiAnalysis").disabled=true; try{const report=await window.mycarAiAnalyze(indicators);lastAiReport={...report,indicators};$("#aiConfidence").textContent=`Confiabilidade: ${lastAiReport.confidence||"Não informada"}`;$("#aiReportContent").innerHTML=renderAiReport(lastAiReport);result.hidden=false;}catch(requestError){console.error(requestError);error.textContent=requestError.message||"Falha de comunicação com o serviço de IA.";}finally{progress.hidden=true;$("#generateAiAnalysis").disabled=false;}};
  $("#closeAiResult").onclick=()=>{$("#aiResult").hidden=true;}; $("#viewAiReport").onclick=()=>openAiPrintableReport(); $("#newAiAnalysis").onclick=()=>{lastAiReport=null;$("#aiResult").hidden=true;refreshVehicleContext();};
}
initializeAiModule();

window.addEventListener("load", () => setTimeout(() => document.getElementById("splashScreen")?.classList.add("hidden"), 650));

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch((error) =>
      console.warn("Não foi possível registrar o service worker:", error),
    );
  });
}
load().then(() => {
  evaluateAlerts(true);
  const params = new URLSearchParams(window.location.search);
  const page = params.get("pagina");
  if (page && document.getElementById(page)) go(page);
  if (params.get("acao") === "novo") {
    go("movimentos");
    setTimeout(openEntryGroupChooser, 0);
  }
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
