
/*
 * MyCar+ V6.11
 * Banco oficial único: data/MyCarPlus.xlsx
 * Este módulo lê e exporta diretamente a estrutura do arquivo MyCarPlus.xlsx.
 */
window.MyCarPlusDB = (() => {
  const FILE = "data/MyCarPlus.xlsx";
  const NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
  const REL_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";

  const xml = (text) => new DOMParser().parseFromString(text, "application/xml");
  const nodes = (node, localName) => [...(node?.getElementsByTagNameNS("*", localName) || [])];
  const textOf = (node, localName) => nodes(node, localName)[0]?.textContent ?? "";
  const bool = (v) => String(v || "").trim().toUpperCase() === "SIM";
  const excelDate = (n) => {
    if (n === "" || n == null || Number.isNaN(Number(n))) return "";
    const d = new Date(Date.UTC(1899, 11, 30) + Number(n) * 86400000);
    return d.toISOString().slice(0, 19);
  };
  const serialDate = (v) => {
    if (!v) return "";
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? "" : (d.getTime() - Date.UTC(1899, 11, 30)) / 86400000;
  };
  const colIndex = (ref) => {
    const letters = String(ref).match(/[A-Z]+/i)?.[0] || "A";
    return [...letters.toUpperCase()].reduce((n, c) => n * 26 + c.charCodeAt(0) - 64, 0) - 1;
  };
  const colName = (n) => {
    let s = "";
    for (n++; n; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
    return s;
  };
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&apos;"
  })[c]);

  async function openTemplate() {
    const response = await fetch(FILE, { cache: "no-store" });
    if (!response.ok) throw new Error("Não foi possível abrir data/MyCarPlus.xlsx.");
    return JSZip.loadAsync(await response.arrayBuffer());
  }

  async function workbookMap(zip) {
    const workbook = xml(await zip.file("xl/workbook.xml").async("text"));
    const rels = xml(await zip.file("xl/_rels/workbook.xml.rels").async("text"));
    const targets = {};
    nodes(rels, "Relationship").forEach(r => targets[r.getAttribute("Id")] = r.getAttribute("Target"));
    const map = {};
    nodes(workbook, "sheet").forEach(s => {
      const name = s.getAttribute("name");
      const rid = s.getAttributeNS(REL_NS, "id") || s.getAttribute("r:id");
      let target = targets[rid] || "";
      target = target.replace(/^\/+/, "");
      if (!target.startsWith("xl/")) target = "xl/" + target;
      map[name] = target;
    });
    return map;
  }

  async function sharedStrings(zip) {
    const file = zip.file("xl/sharedStrings.xml");
    if (!file) return [];
    const doc = xml(await file.async("text"));
    return nodes(doc, "si").map(si =>
      nodes(si, "t").map(t => t.textContent).join("")
    );
  }

  async function readSheet(zip, path, shared) {
    const doc = xml(await zip.file(path).async("text"));
    const rows = [];
    nodes(doc, "row").forEach(row => {
      const arr = [];
      nodes(row, "c").forEach(c => {
        const idx = colIndex(c.getAttribute("r"));
        const type = c.getAttribute("t");
        let value = "";
        if (type === "inlineStr") value = nodes(c, "t").map(x => x.textContent).join("");
        else {
          const raw = textOf(c, "v");
          value = type === "s" ? (shared[Number(raw)] ?? "") :
                  type === "b" ? raw === "1" :
                  raw !== "" && !Number.isNaN(Number(raw)) ? Number(raw) : raw;
        }
        arr[idx] = value;
      });
      rows.push(arr);
    });
    return rows;
  }

  const table = (rows) => {
    const headers = rows[3] || [];
    return rows.slice(4).filter(r => r?.[0] !== "" && r?.[0] != null).map(row => {
      const o = {};
      headers.forEach((h, i) => { if (h) o[h] = row[i] ?? ""; });
      return o;
    });
  };

  async function load() {
    const zip = await openTemplate();
    const map = await workbookMap(zip);
    const shared = await sharedStrings(zip);
    const sheets = {};
    for (const name of ["Movimentacoes","Veiculos","Motoristas","Fornecedores","Itens","Formas_Pagamento"]) {
      sheets[name] = table(await readSheet(zip, map[name], shared));
    }
    sheets.Alertas = map.Alertas ? table(await readSheet(zip, map.Alertas, shared)) : [];

    const vehicles = sheets.Veiculos.map(r => ({
      id:r.id, nome:r.nome, placa:r.placa || "",
      anoFabricacao:r.ano_fabricacao || "", anoModelo:r.ano_modelo || "",
      motorizacao:r.motorizacao || "FLEX",
      consumoRefCidade:r.consumo_ref_cidade_km_l || "",
      consumoRefEstrada:r.consumo_ref_estrada_km_l || "",
      consumoEtanolCidade:r.consumo_ref_etanol_cidade_km_l || "",
      consumoEtanolEstrada:r.consumo_ref_etanol_estrada_km_l || "",
      consumoGasolinaCidade:r.consumo_ref_gasolina_cidade_km_l || r.consumo_ref_cidade_km_l || "",
      consumoGasolinaEstrada:r.consumo_ref_gasolina_estrada_km_l || r.consumo_ref_estrada_km_l || "",
      consumoDieselCidade:r.consumo_ref_diesel_cidade_km_l || "",
      consumoDieselEstrada:r.consumo_ref_diesel_estrada_km_l || "",
      kmInicial:Number(r.hodometro_inicial_km || 0),
      capacidadeTanque:Number(r.capacidade_tanque_litros || 0),
      ativo:bool(r.ativo), padrao:bool(r.padrao),
      criadoEm:r.criado_em ? excelDate(r.criado_em) : "",
      atualizadoEm:r.atualizado_em ? excelDate(r.atualizado_em) : ""
    }));
    const vehicleById = Object.fromEntries(vehicles.map(v => [v.id, v]));
    const drivers = sheets.Motoristas.map(r => ({
      id:r.id, nome:r.nome, numeroCnh:r.numero_cnh || "", grupoCnh:r.grupo_cnh || r.categoria_cnh || "",
      validadeCnh:r.validade_cnh ? excelDate(r.validade_cnh).slice(0,10) : "",
      ativo:bool(r.ativo), padrao:bool(r.padrao), observacao:r.observacao || "",
      criadoEm:r.criado_em ? excelDate(r.criado_em) : "",
      atualizadoEm:r.atualizado_em ? excelDate(r.atualizado_em) : ""
    }));
    const driverById = Object.fromEntries(drivers.map(v => [v.id, v]));
    const suppliers = sheets.Fornecedores.map(r => ({
      id:r.id, nome:r.nome, local:r.local || "",
      latitude:r.latitude === "" ? "" : Number(r.latitude),
      longitude:r.longitude === "" ? "" : Number(r.longitude),
      ativo:bool(r.ativo),
      criadoEm:r.criado_em ? excelDate(r.criado_em) : "",
      atualizadoEm:r.atualizado_em ? excelDate(r.atualizado_em) : ""
    }));
    const supplierById = Object.fromEntries(suppliers.map(v => [v.id, v]));
    const paymentMethods = sheets.Formas_Pagamento.map(r => ({
      id:r.id, nome:r.nome, padrao:bool(r.padrao), ativo:bool(r.ativo)
    }));
    const registers = sheets.Itens.map(r => ({
      id:r.id, grupo:r.grupo, item:r.nome,
      padrao:bool(r.padrao), ativo:bool(r.ativo), ordem:Number(r.ordem || 0)
    }));
    const itemById = Object.fromEntries(registers.map(v => [v.id, v]));

    const movements = sheets.Movimentacoes.map(r => {
      const vehicle = vehicleById[r.veiculo_id] || {};
      const driver = driverById[r.motorista_id] || {};
      const supplier = supplierById[r.fornecedor_id] || {};
      const item = itemById[r.item_id] || {};
      return {
        id:r.id, movimento_id:r.movimento_id || r.id, ordem_item:Number(r.ordem_item || 1),
        veiculo_id:r.veiculo_id, motorista_id:r.motorista_id || "",
        fornecedor_id:r.fornecedor_id || "", data_hora:excelDate(r.data_hora),
        hodometro_km:Number(r.hodometro_km || 0), grupo:r.grupo,
        item_id:r.item_id, item:item.item || r.item_id,
        valor:Number(r.valor || 0), quantidade_litros:r.quantidade_litros === "" ? "" : Number(r.quantidade_litros),
        preco_unitario:r.preco_unitario === "" ? "" : Number(r.preco_unitario),
        tanque_completo:r.tanque_completo || "", forma_pagamento:r.forma_pagamento || "",
        observacao:r.observacao || "", status_migracao:r.status_migracao || "",
        origem_dado:r.origem_dado || "",
        lote_reconstrucao_id:r.lote_reconstrucao_id || "",
        latitude:r.latitude === "" ? "" : Number(r.latitude),
        longitude:r.longitude === "" ? "" : Number(r.longitude),
        precisao_gps_m:r.precisao_gps_m === "" ? "" : Number(r.precisao_gps_m),
        localizacao_confirmada:r.localizacao_confirmada || "",
        rateio_ativo:bool(r.rateio_ativo),
        rateio_qtd_meses:r.rateio_qtd_meses === "" ? null : Number(r.rateio_qtd_meses),
        rateio_competencia_inicial:r.rateio_competencia_inicial || null,
        rateio_valor_base_centavos:r.rateio_valor_base_centavos === "" ? null : Number(r.rateio_valor_base_centavos),
        veiculo:vehicle.nome || r.veiculo_id, veiculo_nome:vehicle.nome || r.veiculo_id,
        motorista:driver.nome || "", fornecedor:supplier.nome || "", local:supplier.nome || "",
        litros:r.quantidade_litros === "" ? "" : Number(r.quantidade_litros),
        preco_litro:r.preco_unitario === "" ? "" : Number(r.preco_unitario),
        tanque_completo_bool:bool(r.tanque_completo)
      };
    });
    const alerts = sheets.Alertas.map(r => ({
      id:r.id, modelVersion:Number(r.modelo_versao || 2), vehicleId:r.veiculo_id,
      group:"MANUTENÇÃO", itemId:r.item_id, description:r.descricao || "",
      criterion:r.criterio || "DATE", baseDate:r.data_base || "",
      baseKm:Number(r.km_base || 0), recurrenceMonths:Number(r.vida_util_meses || 0),
      recurrenceKm:Number(r.vida_util_km || 0), dueDate:r.data_prevista || "",
      dueKm:Number(r.km_previsto || 0), leadDays:Number(r.antecedencia_dias || 0),
      leadKm:Number(r.antecedencia_km || 0), observations:r.observacao || "",
      statusMode:String(r.status || "ATIVO").toUpperCase() === "DESATIVADO" ? "DISABLED" : "ACTIVE",
      active:bool(r.ativo)
    }));
    return { movements, vehicles, drivers, suppliers, paymentMethods, registers, alerts };
  }

  function cell(v, ref) {
    if (v === "" || v == null) return `<c r="${ref}" t="inlineStr"><is><t></t></is></c>`;
    if (typeof v === "number" && Number.isFinite(v)) return `<c r="${ref}"><v>${v}</v></c>`;
    return `<c r="${ref}" t="inlineStr"><is><t>${esc(v)}</t></is></c>`;
  }
  function worksheet(title, subtitle, headers, data) {
    const rows = [[title],[subtitle],[],headers,...data];
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="${NS}"><sheetData>${
      rows.map((row, ri) => `<row r="${ri+1}">${
        row.map((v, ci) => cell(v, `${colName(ci)}${ri+1}`)).join("")
      }</row>`).join("")
    }</sheetData></worksheet>`;
  }
  const yes = v => v ? "SIM" : "NAO";
  const findId = (arr, name) => arr.find(x => x.nome === name)?.id || "";

  async function blobToBase64(blob) {
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let binary = "";
    const chunkSize = 0x8000;
    for (let index = 0; index < bytes.length; index += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
    }
    return btoa(binary);
  }

  async function deliverXlsx(blob) {
    const bridge = window.MyCarNative;
    if (bridge && typeof bridge.shareBase64File === "function") {
      bridge.shareBase64File(
        "MyCarPlus",
        "MyCarPlus.xlsx",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        await blobToBase64(blob)
      );
      return;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "MyCarPlus.xlsx";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  async function exportDatabase(state) {
    const zip = await openTemplate();
    const map = await workbookMap(zip);
    const { movements=[], vehicles=[], drivers=[], suppliers=[], paymentMethods=[], registers=[], alerts=[] } = state;
    const exportedSuppliers = suppliers.some(s => s.nome === "NI — Não informado")
      ? suppliers : [...suppliers, { id:"supplier-ni", nome:"NI — Não informado", ativo:true }];

    const vehicleRows = vehicles.map(v => [
      v.id, v.nome, v.placa || "", v.anoFabricacao || "", v.anoModelo || "",
      v.motorizacao || "FLEX",
      v.consumoEtanolCidade || "", v.consumoEtanolEstrada || "",
      v.consumoGasolinaCidade || v.consumoRefCidade || "", v.consumoGasolinaEstrada || v.consumoRefEstrada || "",
      v.consumoDieselCidade || "", v.consumoDieselEstrada || "", Number(v.kmInicial || 0),
      yes(v.ativo !== false), yes(!!v.padrao), serialDate(v.criadoEm), serialDate(v.atualizadoEm),
      Number(v.capacidadeTanque || 0)
    ]);
    const driverRows = drivers.map(d => [
      d.id, d.nome, d.numeroCnh || "", d.grupoCnh || d.categoriaCnh || "",
      serialDate(d.validadeCnh), yes(d.ativo !== false), yes(!!d.padrao),
      serialDate(d.criadoEm), serialDate(d.atualizadoEm), d.observacao || ""
    ]);
    const supplierRows = exportedSuppliers.map(s => [
      s.id, s.nome, s.local || "", yes(s.ativo !== false),
      serialDate(s.criadoEm), serialDate(s.atualizadoEm)
      ,s.latitude === "" || s.latitude == null ? "" : Number(s.latitude)
      ,s.longitude === "" || s.longitude == null ? "" : Number(s.longitude)
    ]);
    const itemRows = registers.map((r, i) => [
      r.id, r.grupo, r.item, yes(!!r.padrao), yes(r.ativo !== false), Number(r.ordem || i+1)
    ]);
    const paymentRows = paymentMethods.map(p => [p.id, p.nome, yes(!!p.padrao), yes(p.ativo !== false)]);
    const movementRows = movements.map(m => [
      m.id,
      m.movimento_id || m.id,
      Number(m.ordem_item || 1),
      m.veiculo_id || findId(vehicles, m.veiculo),
      m.motorista_id || findId(drivers, m.motorista),
      m.fornecedor_id || findId(exportedSuppliers, m.fornecedor || m.local || "NI — Não informado") || "supplier-ni",
      serialDate(m.data_hora),
      Number(m.hodometro_km ?? m.km ?? 0),
      m.grupo,
      m.item_id || registers.find(r => r.grupo === m.grupo && r.item === m.item)?.id || "",
      Number(m.valor || 0),
      m.quantidade_litros === "" ? "" : Number(m.quantidade_litros ?? m.litros ?? 0),
      m.preco_unitario === "" ? "" : Number(m.preco_unitario ?? m.preco_litro ?? 0),
      m.tanque_completo || (m.tanqueCompleto ? "SIM" : "NAO"),
      m.forma_pagamento || "",
      m.observacao || "",
      m.status_migracao || "APP",
      m.origem_dado || "APP",
      m.lote_reconstrucao_id || ""
      ,m.latitude === "" || m.latitude == null ? "" : Number(m.latitude)
      ,m.longitude === "" || m.longitude == null ? "" : Number(m.longitude)
      ,m.precisao_gps_m === "" || m.precisao_gps_m == null ? "" : Number(m.precisao_gps_m)
      ,m.localizacao_confirmada || (m.latitude !== "" && m.latitude != null ? "SIM" : "NAO")
      ,yes(!!m.rateio_ativo)
      ,m.rateio_qtd_meses == null ? "" : Number(m.rateio_qtd_meses)
      ,m.rateio_competencia_inicial || ""
      ,m.rateio_valor_base_centavos == null ? "" : Number(m.rateio_valor_base_centavos)
    ]);

    zip.file(map.Movimentacoes, worksheet("MOVIMENTAÇÕES","Coleção Firebase sugerida: users/{uid}/movimentacoes",
      ["id","movimento_id","ordem_item","veiculo_id","motorista_id","fornecedor_id","data_hora","hodometro_km","grupo","item_id","valor","quantidade_litros","preco_unitario","tanque_completo","forma_pagamento","observacao","status_migracao","origem_dado","lote_reconstrucao_id","latitude","longitude","precisao_gps_m","localizacao_confirmada","rateio_ativo","rateio_qtd_meses","rateio_competencia_inicial","rateio_valor_base_centavos"], movementRows));
    zip.file(map.Veiculos, worksheet("CADASTRO DE VEÍCULOS","Coleção Firebase sugerida: users/{uid}/veiculos",
      ["id","nome","placa","ano_fabricacao","ano_modelo","motorizacao","consumo_ref_etanol_cidade_km_l","consumo_ref_etanol_estrada_km_l","consumo_ref_gasolina_cidade_km_l","consumo_ref_gasolina_estrada_km_l","consumo_ref_diesel_cidade_km_l","consumo_ref_diesel_estrada_km_l","hodometro_inicial_km","ativo","padrao","criado_em","atualizado_em","capacidade_tanque_litros"], vehicleRows));
    zip.file(map.Motoristas, worksheet("CADASTRO DE MOTORISTAS","Coleção Firebase sugerida: users/{uid}/motoristas",
      ["id","nome","numero_cnh","categoria_cnh","validade_cnh","ativo","padrao","criado_em","atualizado_em","observacao"], driverRows));
    zip.file(map.Fornecedores, worksheet("CADASTRO DE FORNECEDORES","Fornecedor é opcional no lançamento. Coleção Firebase: users/{uid}/fornecedores",
      ["id","nome","local","ativo","criado_em","atualizado_em","latitude","longitude"], supplierRows));
    zip.file(map.Itens, worksheet("CADASTRO DE ITENS","Cada item de lançamento pertence diretamente a um grupo.",
      ["id","grupo","nome","padrao","ativo","ordem"], itemRows));
    zip.file(map.Formas_Pagamento, worksheet("FORMAS DE PAGAMENTO","Cartão deve aparecer como padrão nos novos lançamentos.",
      ["id","nome","padrao","ativo"], paymentRows));
    async function addSheet(name, title, subtitle, headers, rows) {
      if (map[name]) {
        zip.file(map[name], worksheet(title, subtitle, headers, rows));
        return;
      }
      let workbook = await zip.file("xl/workbook.xml").async("text");
      let rels = await zip.file("xl/_rels/workbook.xml.rels").async("text");
      let types = await zip.file("[Content_Types].xml").async("text");
      const sheetIds = [...workbook.matchAll(/sheetId="(\d+)"/g)].map(x => Number(x[1]));
      const relIds = [...rels.matchAll(/Id="rId(\d+)"/g)].map(x => Number(x[1]));
      const sheetNo = Math.max(0, ...sheetIds) + 1, relNo = Math.max(0, ...relIds) + 1;
      const path = `xl/worksheets/sheet${sheetNo}.xml`;
      workbook = workbook.replace("</sheets>", `<sheet name="${esc(name)}" sheetId="${sheetNo}" r:id="rId${relNo}"/></sheets>`);
      rels = rels.replace("</Relationships>", `<Relationship Id="rId${relNo}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${sheetNo}.xml"/></Relationships>`);
      types = types.replace("</Types>", `<Override PartName="/${path}" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`);
      zip.file("xl/workbook.xml", workbook);
      zip.file("xl/_rels/workbook.xml.rels", rels);
      zip.file("[Content_Types].xml", types);
      zip.file(path, worksheet(title, subtitle, headers, rows));
    }
    await addSheet("Alertas", "ALERTAS TÉCNICOS — NOVO MODELO", "Somente alertas cadastrados manualmente e vinculados aos itens do cadastro",
      ["id","modelo_versao","veiculo_id","grupo","item_id","descricao","criterio","data_base","km_base","vida_util_meses","vida_util_km","data_prevista","km_previsto","antecedencia_dias","antecedencia_km","status","ativo","observacao"],
      alerts.filter(a => Number(a.modelVersion || 2) === 2).map(a => [a.id,2,a.vehicleId,"MANUTENÇÃO",a.itemId,a.description,a.criterion,a.baseDate||"",Number(a.baseKm||0),Number(a.recurrenceMonths||0),Number(a.recurrenceKm||0),a.dueDate||"",Number(a.dueKm||0),Number(a.leadDays||0),Number(a.leadKm||0),a.active===false?"DESATIVADO":"ATIVO",yes(a.active!==false),a.observations||""]));

    const blob = await zip.generateAsync({
      type:"blob",
      mimeType:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    });
    await deliverXlsx(blob);
  }

  return { load, exportDatabase };
})();
