
/*
 * MyCar+ V4.1
 * Banco oficial único: data/MyCarPlus.xlsx
 * Este módulo lê e exporta diretamente a estrutura do arquivo MyCarPlus.xlsx.
 */
window.MyCarPlusDB = (() => {
  const FILE = "data/MyCarPlus.xlsx?v=410";
  const NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
  const REL_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";

  const xml = (text) => new DOMParser().parseFromString(text, "application/xml");
  const textOf = (node, selector) => node?.querySelector(selector)?.textContent ?? "";
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
    rels.querySelectorAll("Relationship").forEach(r => targets[r.getAttribute("Id")] = r.getAttribute("Target"));
    const map = {};
    workbook.querySelectorAll("sheet").forEach(s => {
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
    return [...doc.querySelectorAll("si")].map(si =>
      [...si.querySelectorAll("t")].map(t => t.textContent).join("")
    );
  }

  async function readSheet(zip, path, shared) {
    const doc = xml(await zip.file(path).async("text"));
    const rows = [];
    doc.querySelectorAll("sheetData > row").forEach(row => {
      const arr = [];
      row.querySelectorAll("c").forEach(c => {
        const idx = colIndex(c.getAttribute("r"));
        const type = c.getAttribute("t");
        let value = "";
        if (type === "inlineStr") value = [...c.querySelectorAll("is t")].map(x => x.textContent).join("");
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
    for (const name of ["Movimentacoes","Veiculos","Motoristas","Fornecedores","Subcategorias","Formas_Pagamento"]) {
      sheets[name] = table(await readSheet(zip, map[name], shared));
    }

    const vehicles = sheets.Veiculos.map(r => ({
      id:r.id, nome:r.nome, placa:r.placa || "",
      anoFabricacao:r.ano_fabricacao || "", anoModelo:r.ano_modelo || "",
      consumoRefCidade:r.consumo_ref_cidade_km_l || "",
      consumoRefEstrada:r.consumo_ref_estrada_km_l || "",
      kmInicial:Number(r.hodometro_inicial_km || 0),
      capacidadeTanque:Number(r.capacidade_tanque_litros || 0),
      ativo:bool(r.ativo), padrao:bool(r.padrao),
      criadoEm:r.criado_em ? excelDate(r.criado_em) : "",
      atualizadoEm:r.atualizado_em ? excelDate(r.atualizado_em) : ""
    }));
    const vehicleById = Object.fromEntries(vehicles.map(v => [v.id, v]));
    const drivers = sheets.Motoristas.map(r => ({
      id:r.id, nome:r.nome, numeroCnh:r.numero_cnh || "", categoriaCnh:r.categoria_cnh || "",
      validadeCnh:r.validade_cnh ? excelDate(r.validade_cnh).slice(0,10) : "",
      ativo:bool(r.ativo), padrao:bool(r.padrao), observacao:r.observacao || "",
      criadoEm:r.criado_em ? excelDate(r.criado_em) : "",
      atualizadoEm:r.atualizado_em ? excelDate(r.atualizado_em) : ""
    }));
    const driverById = Object.fromEntries(drivers.map(v => [v.id, v]));
    const suppliers = sheets.Fornecedores.map(r => ({
      id:r.id, nome:r.nome, local:r.local || "", ativo:bool(r.ativo),
      criadoEm:r.criado_em ? excelDate(r.criado_em) : "",
      atualizadoEm:r.atualizado_em ? excelDate(r.atualizado_em) : ""
    }));
    const supplierById = Object.fromEntries(suppliers.map(v => [v.id, v]));
    const paymentMethods = sheets.Formas_Pagamento.map(r => ({
      id:r.id, nome:r.nome, padrao:bool(r.padrao), ativo:bool(r.ativo)
    }));
    const registers = sheets.Subcategorias.map(r => ({
      id:r.id, tipo:r.categoria === "COMBUSTÍVEL" ? "ABASTECIMENTO" :
        r.categoria === "MANUTENÇÃO" ? "SERVICO" :
        r.categoria === "RECEITA" ? "RECEITA" : "DESPESA",
      categoria:r.categoria, subcategoria:r.nome,
      padrao:bool(r.padrao), ativo:bool(r.ativo), ordem:Number(r.ordem || 0)
    }));
    const subById = Object.fromEntries(registers.map(v => [v.id, v]));

    const movements = sheets.Movimentacoes.map(r => {
      const vehicle = vehicleById[r.veiculo_id] || {};
      const driver = driverById[r.motorista_id] || {};
      const supplier = supplierById[r.fornecedor_id] || {};
      const sub = subById[r.subcategoria_id] || {};
      return {
        id:r.id, veiculo_id:r.veiculo_id, motorista_id:r.motorista_id || "",
        fornecedor_id:r.fornecedor_id || "", data_hora:excelDate(r.data_hora),
        hodometro_km:Number(r.hodometro_km || 0), categoria:r.categoria,
        subcategoria_id:r.subcategoria_id, subcategoria:sub.subcategoria || r.subcategoria_id,
        valor:Number(r.valor || 0), quantidade_litros:r.quantidade_litros === "" ? "" : Number(r.quantidade_litros),
        preco_unitario:r.preco_unitario === "" ? "" : Number(r.preco_unitario),
        tanque_completo:r.tanque_completo || "", forma_pagamento:r.forma_pagamento || "",
        observacao:r.observacao || "", status_migracao:r.status_migracao || "",
        origem_dado:r.origem_dado || "", incluir_indicadores:r.incluir_indicadores || "SIM",
        lote_reconstrucao_id:r.lote_reconstrucao_id || "",
        veiculo:vehicle.nome || r.veiculo_id, veiculo_nome:vehicle.nome || r.veiculo_id,
        motorista:driver.nome || "", fornecedor:supplier.nome || "", local:supplier.nome || "",
        tipo:r.categoria === "COMBUSTÍVEL" ? "ABASTECIMENTO" :
          r.categoria === "MANUTENÇÃO" ? "SERVICO" :
          r.categoria === "RECEITA" ? "RECEITA" : "DESPESA",
        litros:r.quantidade_litros === "" ? "" : Number(r.quantidade_litros),
        preco_litro:r.preco_unitario === "" ? "" : Number(r.preco_unitario),
        tanque_completo_bool:bool(r.tanque_completo)
      };
    });
    return { movements, vehicles, drivers, suppliers, paymentMethods, registers };
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

  async function exportDatabase(state) {
    const zip = await openTemplate();
    const map = await workbookMap(zip);
    const { movements=[], vehicles=[], drivers=[], suppliers=[], paymentMethods=[], registers=[] } = state;

    const vehicleRows = vehicles.map(v => [
      v.id, v.nome, v.placa || "", v.anoFabricacao || "", v.anoModelo || "",
      v.consumoRefCidade || "", v.consumoRefEstrada || "", Number(v.kmInicial || 0),
      yes(v.ativo !== false), yes(!!v.padrao), serialDate(v.criadoEm), serialDate(v.atualizadoEm),
      Number(v.capacidadeTanque || 0)
    ]);
    const driverRows = drivers.map(d => [
      d.id, d.nome, d.numeroCnh || "", d.categoriaCnh || "",
      serialDate(d.validadeCnh), yes(d.ativo !== false), yes(!!d.padrao),
      serialDate(d.criadoEm), serialDate(d.atualizadoEm), d.observacao || ""
    ]);
    const supplierRows = suppliers.map(s => [
      s.id, s.nome, s.local || "", yes(s.ativo !== false),
      serialDate(s.criadoEm), serialDate(s.atualizadoEm)
    ]);
    const subRows = registers.map((r, i) => [
      r.id, r.categoria, r.subcategoria, yes(!!r.padrao), yes(r.ativo !== false), Number(r.ordem || i+1)
    ]);
    const paymentRows = paymentMethods.map(p => [p.id, p.nome, yes(!!p.padrao), yes(p.ativo !== false)]);
    const movementRows = movements.map(m => [
      m.id,
      m.veiculo_id || findId(vehicles, m.veiculo),
      m.motorista_id || findId(drivers, m.motorista),
      m.fornecedor_id || findId(suppliers, m.fornecedor || m.local),
      serialDate(m.data_hora),
      Number(m.hodometro_km ?? m.km ?? 0),
      m.categoria,
      m.subcategoria_id || registers.find(r => r.categoria === m.categoria && r.subcategoria === m.subcategoria)?.id || "",
      Number(m.valor || 0),
      m.quantidade_litros === "" ? "" : Number(m.quantidade_litros ?? m.litros ?? 0),
      m.preco_unitario === "" ? "" : Number(m.preco_unitario ?? m.preco_litro ?? 0),
      m.tanque_completo || (m.tanqueCompleto ? "SIM" : "NAO"),
      m.forma_pagamento || "",
      m.observacao || "",
      m.status_migracao || "APP",
      m.origem_dado || "APP",
      m.incluir_indicadores || "SIM",
      m.lote_reconstrucao_id || ""
    ]);

    zip.file(map.Movimentacoes, worksheet("MOVIMENTAÇÕES","Coleção Firebase sugerida: users/{uid}/movimentacoes",
      ["id","veiculo_id","motorista_id","fornecedor_id","data_hora","hodometro_km","categoria","subcategoria_id","valor","quantidade_litros","preco_unitario","tanque_completo","forma_pagamento","observacao","status_migracao","origem_dado","incluir_indicadores","lote_reconstrucao_id"], movementRows));
    zip.file(map.Veiculos, worksheet("CADASTRO DE VEÍCULOS","Coleção Firebase sugerida: users/{uid}/veiculos",
      ["id","nome","placa","ano_fabricacao","ano_modelo","consumo_ref_cidade_km_l","consumo_ref_estrada_km_l","hodometro_inicial_km","ativo","padrao","criado_em","atualizado_em","capacidade_tanque_litros"], vehicleRows));
    zip.file(map.Motoristas, worksheet("CADASTRO DE MOTORISTAS","Coleção Firebase sugerida: users/{uid}/motoristas",
      ["id","nome","numero_cnh","categoria_cnh","validade_cnh","ativo","padrao","criado_em","atualizado_em","observacao"], driverRows));
    zip.file(map.Fornecedores, worksheet("CADASTRO DE FORNECEDORES","Fornecedor é opcional no lançamento. Coleção Firebase: users/{uid}/fornecedores",
      ["id","nome","local","ativo","criado_em","atualizado_em"], supplierRows));
    zip.file(map.Subcategorias, worksheet("CADASTRO DE SUBCATEGORIAS","O campo TIPO foi eliminado. Cada subcategoria pertence diretamente a uma categoria.",
      ["id","categoria","nome","padrao","ativo","ordem"], subRows));
    zip.file(map.Formas_Pagamento, worksheet("FORMAS DE PAGAMENTO","Cartão deve aparecer como padrão nos novos lançamentos.",
      ["id","nome","padrao","ativo"], paymentRows));

    const blob = await zip.generateAsync({
      type:"blob",
      mimeType:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "MyCarPlus.xlsx";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  return { load, exportDatabase };
})();
