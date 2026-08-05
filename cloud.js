(() => {
  "use strict";

  const cfg = window.FIREBASE_CONFIG || {};
  const configured = Boolean(cfg.apiKey && cfg.projectId && !/PREENCHER|INSERIR/i.test(String(cfg.apiKey)));
  const TABLES = Object.freeze(["movements", "registers", "drivers", "vehicles", "suppliers", "paymentMethods", "alerts"]);
  const SCHEMA_VERSION = 11;
  const SAFETY_INTERVAL_MS = 5 * 60 * 1000;
  const TOMBSTONE_RETENTION_MS = 90 * 86400000;
  const KEY_BASE = Object.freeze({ queue: "mycar_cloud_pending_v3", baseline: "mycar_cloud_baseline_v3", meta: "mycar_cloud_meta_v3", log: "mycar_cloud_log_v2", journal: "mycar_cloud_journal_v1", conflicts: "mycar_cloud_conflicts_v1", resolutions: "mycar_cloud_resolutions_v1" });

  let sdk = null;
  let app = null;
  let auth = null;
  let db = null;
  let user = null;
  let syncing = false;
  let applying = false;
  let started = false;
  let timer = null;
  let monitor = null;
  let listeners = [];

  const clone = (value) => JSON.parse(JSON.stringify(value ?? null));
  const iso = () => new Date().toISOString();
  const bridge = () => window.vehicleAppBridge;
  const namespace = () => String(bridge()?.getNamespace?.() || "local").replace(/[^a-zA-Z0-9_-]/g, "_");
  const key = (kind, ns = namespace()) => `${KEY_BASE[kind]}_${ns}`;
  const json = (storageKey, fallback = null) => { try { return JSON.parse(localStorage.getItem(storageKey)) ?? fallback; } catch (_) { return fallback; } };
  const put = (storageKey, value) => localStorage.setItem(storageKey, JSON.stringify(value));
  const remove = (storageKey) => localStorage.removeItem(storageKey);
  const emptyState = () => Object.fromEntries(TABLES.map((table) => [table, []]));
  const tableState = (state) => Object.fromEntries(TABLES.map((table) => [table, Array.isArray(state?.[table]) ? state[table] : []]));
  const pending = () => json(key("queue"), {});
  const baseline = () => tableState(json(key("baseline"), emptyState()));
  const metadata = () => json(key("meta"), {});
  const conflicts = () => json(key("conflicts"), {});
  const resolutions = () => json(key("resolutions"), {});
  const logs = () => json(key("log"), []);
  const countRecords = (state) => TABLES.reduce((total, table) => total + (state?.[table]?.length || 0), 0);
  const pendingCount = (queue = pending()) => TABLES.reduce((total, table) => total + Object.keys(queue?.[table] || {}).length, 0);
  const conflictCount = (items = conflicts()) => TABLES.reduce((total, table) => total + Object.keys(items?.[table] || {}).length, 0);
  const docId = (record) => String(record?.id || record?.movimento_id || crypto.randomUUID());
  const device = () => {
    let id = localStorage.getItem("mycar_device_id");
    if (!id) { id = crypto.randomUUID?.() || `device-${Date.now()}`; localStorage.setItem("mycar_device_id", id); }
    return id;
  };
  const remoteDate = (value) => {
    if (!value) return 0;
    if (typeof value === "string") return Date.parse(value) || 0;
    if (typeof value.toDate === "function") return value.toDate().getTime();
    if (typeof value.seconds === "number") return value.seconds * 1000;
    return 0;
  };
  const cleanForCompare = (record) => {
    const value = clone(record || {});
    ["syncStatus", "updatedAt", "serverUpdatedAt", "updatedBy", "version", "baseVersion", "createdAt", "deletedAt", "sequencial", "schemaVersion", "_forceLocal"].forEach((field) => delete value[field]);
    return JSON.stringify(value, Object.keys(value).sort());
  };
  const sameRecord = (a, b) => cleanForCompare(a) === cleanForCompare(b);
  const when = (value) => value ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "medium" }).format(new Date(value)) : "Nunca";

  function setPending(value) { pendingCount(value) ? put(key("queue"), value) : remove(key("queue")); draw(); }
  function setBaseline(value) { put(key("baseline"), tableState(value)); }
  function setConflicts(value) { conflictCount(value) ? put(key("conflicts"), value) : remove(key("conflicts")); draw(); }
  function setResolutions(value) { Object.keys(value || {}).length ? put(key("resolutions"), value) : remove(key("resolutions")); }
  function setMeta(patch) { put(key("meta"), { ...metadata(), ...patch }); draw(); }
  function addLog(operation, details = {}) {
    const rows = [{ at: iso(), operation, ...details }, ...logs()].slice(0, 150);
    put(key("log"), rows); renderLog();
  }
  function message(text, error = false) { setMeta({ message: text, error }); if (error) addLog("erro", { result: text }); }

  function panel() {
    const host = document.querySelector("#sobre .about-card");
    if (!host || document.querySelector("#cloudPanel")) return;
    host.insertAdjacentHTML("beforeend", `<div id="cloudPanel" class="cloud-panel"><h3>Conexão e sincronização</h3><div class="cloud-status-row"><span id="cloudDot" class="cloud-dot"></span><strong id="cloudHeadline">Inicializando…</strong></div><p id="cloudStatus">Verificando sessão e conexão…</p><dl class="cloud-diagnostics"><div><dt>Conta</dt><dd id="cloudAccount">Não conectada</dd></div><div><dt>Internet</dt><dd id="cloudNetwork">Verificando</dd></div><div><dt>Pendências</dt><dd id="cloudPending">0</dd></div><div><dt>Conflitos</dt><dd id="cloudConflicts">0</dd></div><div><dt>Última consulta</dt><dd id="cloudLastPull">Nunca</dd></div><div><dt>Último envio</dt><dd id="cloudLastPush">Nunca</dd></div><div><dt>Última sincronização concluída</dt><dd id="cloudLastSync">Nunca</dd></div><div><dt>Registros enviados</dt><dd id="cloudSent">0 registro(s)</dd></div><div><dt>Registros recebidos</dt><dd id="cloudReceived">0 registro(s)</dd></div><div><dt>Dispositivo</dt><dd id="cloudDevice">—</dd></div></dl><div class="cloud-actions"><button id="cloudLogin" type="button" ${configured ? "" : "disabled"}>Entrar com Google</button><button id="cloudSyncNow" type="button" ${configured ? "" : "disabled"}>Sincronizar agora</button><button id="cloudResolveConflicts" type="button" hidden>Resolver conflitos</button><button id="cloudLogout" type="button" hidden>Sair</button><button id="cloudToggleLog" type="button">Log técnico</button></div><div id="cloudTechnicalLog" class="cloud-technical-log" hidden></div><p class="cloud-note">Cada Conta Google possui um espaço local próprio. A gravação local, a fila e o diário de recuperação são confirmados antes do envio ao Firebase.</p></div>`);
    document.querySelector("#cloudLogin").onclick = login;
    document.querySelector("#cloudSyncNow").onclick = manualSync;
    document.querySelector("#cloudResolveConflicts").onclick = resolveConflicts;
    document.querySelector("#cloudLogout").onclick = logout;
    document.querySelector("#cloudToggleLog").onclick = () => { const box = document.querySelector("#cloudTechnicalLog"); box.hidden = !box.hidden; renderLog(); };
    const homeStatus = document.querySelector("#homeCloudStatus");
    if (homeStatus) homeStatus.onclick = () => { document.querySelector('[data-menu-page="sobre"]')?.click(); setTimeout(() => document.querySelector("#cloudPanel")?.scrollIntoView({ behavior: "smooth", block: "center" }), 120); };
    draw();
  }

  function renderLog() {
    const box = document.querySelector("#cloudTechnicalLog"); if (!box) return;
    const rows = logs();
    box.innerHTML = rows.length ? rows.map((row) => `<article><b>${row.operation}</b><span>${when(row.at)}</span><small>${row.table || "sistema"}${row.count != null ? ` · ${row.count} registro(s)` : ""}${row.result ? ` · ${row.result}` : ""}</small></article>`).join("") : "<p>Nenhum evento técnico registrado.</p>";
  }

  function draw() {
    const meta = metadata(); const queueSize = pendingCount(); const conflictSize = conflictCount(); const online = navigator.onLine;
    const status = document.querySelector("#cloudStatus");
    if (status) { status.textContent = meta.message || "Aguardando…"; status.classList.toggle("cloud-error", Boolean(meta.error)); }
    let title = "Desconectado", cls = "offline";
    if (!configured) { title = "Firebase não configurado"; cls = "error"; }
    else if (!online) title = queueSize ? "Offline — alterações protegidas" : "Offline";
    else if (syncing) { title = "Sincronizando…"; cls = "syncing"; }
    else if (!user) { title = "Online — login necessário"; cls = "warning"; }
    else if (conflictSize) { title = `Atenção — ${conflictSize} conflito(s)`; cls = "warning"; }
    else if (queueSize) { title = `Online — ${queueSize} registro(s) pendente(s)`; cls = "warning"; }
    else { title = "Online e sincronizado"; cls = "online"; }
    const headline = document.querySelector("#cloudHeadline"), dot = document.querySelector("#cloudDot"), headerDot = document.querySelector("#homeCloudStatus .cloud-dot"), headerButton = document.querySelector("#homeCloudStatus");
    if (headline) headline.textContent = title; if (dot) dot.className = `cloud-dot ${cls}`; if (headerDot) headerDot.className = `cloud-dot ${cls}`; if (headerButton) { headerButton.title = title; headerButton.setAttribute("aria-label", title); }
    const values = { cloudAccount: user?.email || "Não conectada", cloudNetwork: online ? "Online" : "Offline", cloudPending: String(queueSize), cloudConflicts: String(conflictSize), cloudLastPull: when(meta.lastPull), cloudLastPush: when(meta.lastPush), cloudLastSync: when(meta.lastSync), cloudSent: `${Number(meta.lastSent || 0)} registro(s)`, cloudReceived: `${Number(meta.lastReceived || 0)} registro(s)`, cloudDevice: device().slice(0, 18) };
    Object.entries(values).forEach(([id, value]) => { const element = document.getElementById(id); if (element) element.textContent = value; });
    const loginButton = document.querySelector("#cloudLogin"), logoutButton = document.querySelector("#cloudLogout"), syncButton = document.querySelector("#cloudSyncNow"), conflictButton = document.querySelector("#cloudResolveConflicts");
    if (loginButton) { loginButton.hidden = Boolean(user); loginButton.disabled = !configured || syncing || !online; }
    if (logoutButton) logoutButton.hidden = !user;
    if (syncButton) { syncButton.hidden = !user; syncButton.disabled = !configured || syncing || !online; syncButton.textContent = syncing ? "Sincronizando…" : "Sincronizar agora"; syncButton.setAttribute("aria-busy", syncing ? "true" : "false"); }
    if (conflictButton) { conflictButton.hidden = !user || conflictSize === 0; conflictButton.textContent = `Resolver ${conflictSize} conflito(s)`; }
  }

  function enrichAndDiff(current) {
    const base = baseline(); const queued = pending(); const state = tableState(current); const changes = clone(queued || {}); const stamp = iso(); const dev = device();
    TABLES.forEach((table) => {
      const baseMap = new Map((base[table] || []).map((record) => [docId(record), record]));
      const currentMap = new Map();
      let sequence = Math.max(0, ...(base[table] || []).map((record) => Number(record.sequencial || 0)), ...(state[table] || []).map((record) => Number(record.sequencial || 0)));
      state[table] = (state[table] || []).map((raw) => {
        const id = docId(raw); const old = baseMap.get(id); const queuedRecord = changes?.[table]?.[id]; const record = { ...raw, id }; currentMap.set(id, record);
        const changed = !old || !sameRecord(record, old);
        if (!record.sequencial) record.sequencial = ++sequence;
        if (!record.createdAt) record.createdAt = old?.createdAt || queuedRecord?.createdAt || stamp;
        if (changed) {
          const unchangedSinceQueue = Boolean(queuedRecord && !queuedRecord.deletedAt && sameRecord(record, queuedRecord));
          record.baseVersion = Number(unchangedSinceQueue ? queuedRecord.baseVersion : old?.version || queuedRecord?.baseVersion || 0);
          record.version = unchangedSinceQueue
            ? Number(queuedRecord.version || Math.max(1, Number(old?.version || 0) + 1))
            : Math.max(Number(record.version || 0), Number(old?.version || 0), Number(queuedRecord?.version || 0)) + 1;
          record.updatedAt = unchangedSinceQueue ? queuedRecord.updatedAt : stamp;
          record.updatedBy = unchangedSinceQueue ? queuedRecord.updatedBy : dev;
          record.deletedAt = null; record.schemaVersion = SCHEMA_VERSION; record.syncStatus = "pendente";
          changes[table] ||= {}; changes[table][id] = clone(record);
        } else {
          record.version = Number(record.version || old?.version || 1); record.baseVersion = Number(record.baseVersion ?? old?.baseVersion ?? Math.max(0, record.version - 1)); record.updatedAt = record.updatedAt || old?.updatedAt || stamp; record.updatedBy = record.updatedBy || old?.updatedBy || dev; record.createdAt = record.createdAt || old?.createdAt || stamp; record.deletedAt = record.deletedAt || null; record.schemaVersion = SCHEMA_VERSION; record.syncStatus = "sincronizado";
        }
        return record;
      });
      baseMap.forEach((old, id) => {
        if (!currentMap.has(id) && !old.deletedAt) {
          const queuedRecord = changes?.[table]?.[id];
          const tombstone = queuedRecord?.deletedAt
            ? { ...queuedRecord, syncStatus: "pendente" }
            : { ...old, id, baseVersion: Number(old.version || 0), version: Number(old.version || 0) + 1, updatedAt: stamp, updatedBy: dev, deletedAt: stamp, schemaVersion: SCHEMA_VERSION, syncStatus: "pendente" };
          changes[table] ||= {}; changes[table][id] = tombstone;
        }
      });
    });
    return { state, changes };
  }

  function commitLocalState(current, persistCallback) {
    if (applying || typeof persistCallback !== "function") { persistCallback?.(current); return current; }
    const { state, changes } = enrichAndDiff(current);
    const journalKey = key("journal");
    put(journalKey, { namespace: namespace(), at: iso(), state, changes });
    try {
      persistCallback(state);
      setPending(changes);
      remove(journalKey);
      message(navigator.onLine ? "Alterações gravadas e registradas para sincronização." : "Alterações gravadas neste aparelho e protegidas para envio posterior.");
      scheduleSync(700);
      return state;
    } catch (error) {
      addLog("diário de recuperação", { result: error.message || String(error) });
      throw error;
    }
  }

  function recoverJournal() {
    const journal = json(key("journal"), null);
    if (!journal) return false;
    try {
      if (journal.state && bridge()?.getNamespace?.() === namespace()) {
        applying = true; bridge()?.applyState?.(journal.state, { persist: true }); applying = false;
      }
      setPending(journal.changes || pending()); remove(key("journal")); addLog("recuperação", { result: "gravação interrompida recuperada" });
      return true;
    } catch (error) { applying = false; message("Existe uma gravação interrompida que ainda não pôde ser recuperada.", true); return false; }
  }

  function rebuildPendingFromDiff() {
    if (!bridge()) return;
    const { state, changes } = enrichAndDiff(bridge().getState());
    applying = true; bridge().applyState(state, { persist: true }); applying = false;
    setPending(changes);
  }

  function queueSave() {
    if (applying || !bridge()) return;
    commitLocalState(bridge().getState(), (state) => { applying = true; bridge().applyState(state, { persist: true }); applying = false; });
  }

  function scheduleSync(delay = 500) { clearTimeout(timer); timer = setTimeout(() => synchronize(false), delay); }
  const collectionRef = (table) => sdk.collection(db, "users", user.uid, table);
  const metaRef = () => sdk.doc(db, "users", user.uid, "_meta", "schema");

  async function readRemote() {
    const state = emptyState();
    for (const table of TABLES) {
      const snapshot = await sdk.getDocsFromServer(collectionRef(table));
      state[table] = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
    }
    return state;
  }

  async function writeSchemaMarker() {
    await sdk.setDoc(metaRef(), { version: SCHEMA_VERSION, updatedAt: sdk.serverTimestamp(), appVersion: "6.11" }, { merge: true });
  }

  async function purgeLegacyAlerts(remoteAlerts = null) {
    const rows = remoteAlerts || (await sdk.getDocsFromServer(collectionRef("alerts"))).docs.map((item) => ({ id: item.id, ...item.data() }));
    const legacy = rows.filter((item) => Number(item.modelVersion ?? item.modelo_versao ?? 0) !== 2);
    for (let offset = 0; offset < legacy.length; offset += 450) {
      const batch = sdk.writeBatch(db);
      legacy.slice(offset, offset + 450).forEach((item) => batch.delete(sdk.doc(db, "users", user.uid, "alerts", docId(item))));
      await batch.commit();
    }
    if (legacy.length) addLog("limpeza de alertas", { count: legacy.length, result: "modelo antigo removido" });
    return legacy.length;
  }

  async function cleanupTombstones(remote) {
    const cutoff = Date.now() - TOMBSTONE_RETENTION_MS; const refs = [];
    TABLES.forEach((table) => (remote[table] || []).forEach((record) => { if (record.deletedAt && remoteDate(record.deletedAt) < cutoff) refs.push(sdk.doc(db, "users", user.uid, table, docId(record))); }));
    for (let offset = 0; offset < refs.length; offset += 450) { const batch = sdk.writeBatch(db); refs.slice(offset, offset + 450).forEach((ref) => batch.delete(ref)); await batch.commit(); }
    if (refs.length) addLog("limpeza de exclusões", { count: refs.length, result: "registros com mais de 90 dias eliminados" });
    return refs.length;
  }

  function mergeStates(remote, local, changes) {
    const merged = emptyState(); const baselineAfter = tableState(remote); const winnersToPush = {}; const unresolved = {}; const foundConflicts = {}; const resolved = resolutions();
    TABLES.forEach((table) => {
      const remoteMap = new Map((remote[table] || []).map((record) => [docId(record), record]));
      const baseMap = new Map((baseline()[table] || []).map((record) => [docId(record), record]));
      const localMap = new Map((local[table] || []).map((record) => [docId(record), record]));
      const resultMap = new Map(remoteMap);
      Object.entries(changes?.[table] || {}).forEach(([id, queued]) => {
        const candidate = queued.deletedAt ? queued : (localMap.get(id) || queued);
        const remoteRecord = remoteMap.get(id); const baseRecord = baseMap.get(id);
        const remoteChanged = Boolean(remoteRecord && (!baseRecord || !sameRecord(remoteRecord, baseRecord)));
        const divergent = Boolean(remoteRecord && !sameRecord(candidate, remoteRecord));
        const forceLocal = resolved?.[table]?.[id] === "local";
        if (remoteChanged && divergent && !forceLocal) {
          foundConflicts[table] ||= {}; foundConflicts[table][id] = { table, id, detectedAt: iso(), local: clone(candidate), remote: clone(remoteRecord), baseline: clone(baseRecord) };
          unresolved[table] ||= {}; unresolved[table][id] = clone(candidate); resultMap.set(id, candidate); return;
        }
        resultMap.set(id, candidate); winnersToPush[table] ||= {}; winnersToPush[table][id] = candidate;
      });
      merged[table] = [...resultMap.values()].filter((record) => !record.deletedAt).map((record) => ({ ...record, syncStatus: "sincronizado" }));
      baselineAfter[table] = [...remoteMap.values()];
      Object.values(winnersToPush[table] || {}).forEach((record) => {
        const map = new Map(baselineAfter[table].map((row) => [docId(row), row])); map.set(docId(record), record); baselineAfter[table] = [...map.values()];
      });
    });
    return { merged, baselineAfter, winnersToPush, unresolved, foundConflicts };
  }

  async function pushChanges(changes) {
    const writes = [];
    TABLES.forEach((table) => Object.values(changes?.[table] || {}).forEach((record) => writes.push([table, record])));
    for (let offset = 0; offset < writes.length; offset += 450) {
      const batch = sdk.writeBatch(db);
      writes.slice(offset, offset + 450).forEach(([table, record]) => {
        const payload = { ...record, schemaVersion: SCHEMA_VERSION, serverUpdatedAt: sdk.serverTimestamp() };
        delete payload.syncStatus; delete payload._forceLocal;
        batch.set(sdk.doc(db, "users", user.uid, table, docId(record)), payload, { merge: false });
      });
      await batch.commit();
    }
    return writes.length;
  }

  async function synchronize(manual = false) {
    if (syncing) return false;
    if (!navigator.onLine) { message("Sem internet. As alterações permanecem protegidas neste aparelho."); return false; }
    if (!user || !db) { message(manual ? "Entre com Google para sincronizar." : "Alterações locais aguardando login."); return false; }
    syncing = true; draw();
    try {
      recoverJournal(); rebuildPendingFromDiff(); message("Consultando o Firebase antes de enviar alterações…");
      const remote = await readRemote(); await purgeLegacyAlerts(remote.alerts); remote.alerts = remote.alerts.filter((item) => Number(item.modelVersion ?? item.modelo_versao ?? 0) === 2);
      const received = TABLES.reduce((total, table) => total + (remote[table] || []).filter((record) => !record.deletedAt).length, 0);
      const local = tableState(bridge().getState()); const changes = pending();
      const result = mergeStates(remote, local, changes); setConflicts(result.foundConflicts);
      const sent = await pushChanges(result.winnersToPush);
      applying = true; bridge().applyState(result.merged, { persist: true }); applying = false;
      setBaseline(result.baselineAfter); setPending(result.unresolved);
      if (sent) setResolutions({});
      await writeSchemaMarker(); await cleanupTombstones(remote);
      const completed = pendingCount(result.unresolved) === 0 && conflictCount(result.foundConflicts) === 0;
      setMeta({ lastPush: sent ? iso() : metadata().lastPush, lastPull: iso(), lastSync: completed ? iso() : metadata().lastSync, lastSent: sent, lastReceived: received, message: conflictCount(result.foundConflicts) ? "Conflitos preservados. Escolha qual versão manter antes do envio." : sent ? `${sent} registro(s) sincronizado(s) com segurança.` : "Dados conferidos. Nenhuma alteração pendente.", error: false });
      addLog("sincronização", { count: sent, result: `${received} recebido(s)${conflictCount(result.foundConflicts) ? ` · ${conflictCount(result.foundConflicts)} conflito(s)` : ""}` });
      return completed;
    } catch (error) {
      console.error(error); setMeta({ message: "Falha na sincronização. Nenhum dado local foi descartado; a fila será reconstruída automaticamente.", error: true }); return false;
    } finally { syncing = false; draw(); }
  }

  async function resolveConflicts() {
    const current = conflicts(); if (!conflictCount(current)) return;
    const state = tableState(bridge().getState()); const queue = pending(); const base = baseline(); const resolutionMap = resolutions();
    for (const table of TABLES) {
      for (const [id, conflict] of Object.entries(current[table] || {})) {
        const keepLocal = window.confirm(`Conflito em ${table} (${id}).\n\nOK: manter a versão deste aparelho e enviá-la.\nCancelar: usar a versão do Firebase.`);
        if (keepLocal) {
          resolutionMap[table] ||= {}; resolutionMap[table][id] = "local";
        } else {
          const map = new Map((state[table] || []).map((record) => [docId(record), record]));
          if (conflict.remote?.deletedAt) map.delete(id); else map.set(id, { ...conflict.remote, syncStatus: "sincronizado" });
          state[table] = [...map.values()];
          if (queue[table]) delete queue[table][id];
          const baseMap = new Map((base[table] || []).map((record) => [docId(record), record])); baseMap.set(id, conflict.remote); base[table] = [...baseMap.values()];
        }
        delete current[table][id];
      }
      if (!Object.keys(current[table] || {}).length) delete current[table];
      if (!Object.keys(queue[table] || {}).length) delete queue[table];
    }
    applying = true; bridge().applyState(state, { persist: true }); applying = false;
    setPending(queue); setBaseline(base); setConflicts(current); setResolutions(resolutionMap); await synchronize(true);
  }

  const native = () => Boolean(window.Capacitor?.isNativePlatform?.()) && window.Capacitor?.getPlatform?.() === "android";
  async function login() {
    const button = document.querySelector("#cloudLogin"); if (button) button.disabled = true; message("Abrindo sua Conta Google…");
    try {
      if (native()) {
        const plugin = window.Capacitor?.Plugins?.FirebaseAuthentication; if (!plugin?.signInWithGoogle) throw new Error("Componente de autenticação Android não instalado.");
        const result = await plugin.signInWithGoogle(); const credential = result?.credential || {};
        await sdk.signInWithCredential(auth, sdk.GoogleAuthProvider.credential(credential.idToken || null, credential.accessToken || null));
      } else await sdk.signInWithPopup(auth, new sdk.GoogleAuthProvider());
    } catch (error) { console.error(error); message(/network/i.test(String(error?.code)) ? "Sem conexão com a internet." : `Não foi possível entrar${error?.message ? `: ${error.message}` : "."}`, true); }
    finally { if (button) button.disabled = false; }
  }
  async function logout() {
    try { if (native()) await window.Capacitor?.Plugins?.FirebaseAuthentication?.signOut?.(); await sdk.signOut(auth); }
    catch (error) { console.error(error); message("Não foi possível sair da conta.", true); }
  }

  function stopListeners() { listeners.forEach((unsubscribe) => { try { unsubscribe(); } catch (_) {} }); listeners = []; }
  function startListeners() {
    stopListeners();
    TABLES.forEach((table) => listeners.push(sdk.onSnapshot(collectionRef(table), { includeMetadataChanges: true }, (snapshot) => {
      if (syncing || snapshot.metadata.hasPendingWrites || pendingCount()) return;
      scheduleSync(500);
    }, (error) => { console.error(error); message("Conexão com a nuvem interrompida. A reconexão será automática.", true); })));
  }

  function matchingBaseline(localState, remoteState) {
    const matched = emptyState();
    TABLES.forEach((table) => {
      const localMap = new Map((localState?.[table] || []).map((record) => [docId(record), record]));
      matched[table] = (remoteState?.[table] || []).filter((record) => {
        const localRecord = localMap.get(docId(record));
        return Boolean(localRecord && sameRecord(localRecord, record));
      });
    });
    return matched;
  }

  async function prepareUserSpace(remote) {
    const uid = user.uid; const activeRemote = tableState(Object.fromEntries(TABLES.map((table) => [table, (remote[table] || []).filter((record) => !record.deletedAt && (table !== "alerts" || Number(record.modelVersion ?? record.modelo_versao ?? 0) === 2)).map((record) => ({ ...record, syncStatus: "sincronizado" }))])));
    const hasUserLocal = bridge().hasNamespaceData(uid);
    let initialBaseline = null;
    if (hasUserLocal) {
      bridge().activateNamespace(uid);
      if (!localStorage.getItem(key("baseline"))) initialBaseline = matchingBaseline(tableState(bridge().getState()), activeRemote);
    } else if (countRecords(activeRemote)) {
      bridge().activateNamespace(uid, { seedState: activeRemote, useOfficial: false });
      initialBaseline = activeRemote;
    } else {
      const localState = tableState(bridge().getState());
      const importLocal = countRecords(localState) > 0 && window.confirm("Esta Conta Google ainda não possui uma base no Firebase. Deseja vincular e enviar os dados existentes neste aparelho?");
      bridge().activateNamespace(uid, { seedState: importLocal ? localState : emptyState(), useOfficial: false });
      initialBaseline = emptyState();
    }
    if (initialBaseline) setBaseline(initialBaseline);
    recoverJournal(); rebuildPendingFromDiff();
  }

  async function connect(current) {
    user = current; stopListeners(); draw();
    if (!user) {
      bridge()?.activateNamespace?.("local");
      message("Entre com Google para manter os dados sincronizados entre aparelhos."); return;
    }
    message(`Conectado como ${user.email}. Conferindo o espaço exclusivo da conta…`);
    try {
      const remote = await readRemote(); await purgeLegacyAlerts(remote.alerts); remote.alerts = remote.alerts.filter((item) => Number(item.modelVersion ?? item.modelo_versao ?? 0) === 2);
      await prepareUserSpace(remote); await synchronize(false); startListeners();
    } catch (error) { console.error(error); message("Não foi possível preparar o espaço da Conta Google. Os dados locais foram preservados.", true); }
  }

  async function manualSync() {
    if (syncing) return;
    if (!navigator.onLine) { message("Sem internet. Conecte-se para sincronizar."); draw(); return; }
    if (!user) { message("Entre com Google para habilitar a sincronização."); await login(); return; }
    await synchronize(true);
  }

  function monitoring() {
    window.addEventListener("online", () => { message("Internet restabelecida. Verificando sincronização…"); scheduleSync(200); });
    window.addEventListener("offline", () => message("Sem internet. O aplicativo continuará salvando localmente."));
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && (pendingCount() || Date.now() - Date.parse(metadata().lastPull || 0) > SAFETY_INTERVAL_MS)) scheduleSync(200); });
    clearInterval(monitor); monitor = setInterval(() => { draw(); if (navigator.onLine && pendingCount()) synchronize(false); }, SAFETY_INTERVAL_MS);
  }

  window.cloudSync = { commitLocalState, queueSave, syncNow: manualSync, resolveConflicts, getStatus: () => ({ online: navigator.onLine, authenticated: Boolean(user), pending: pendingCount(), conflicts: conflictCount(), syncing, namespace: namespace(), ...metadata() }) };

  async function init() {
    if (started) return; started = true; panel(); monitoring(); if (!configured) return;
    try {
      const modules = await Promise.all([
        import("https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js"),
        import("https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js"),
        import("https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js"),
      ]);
      sdk = { ...modules[0], ...modules[1], ...modules[2] };
      app = sdk.getApps()[0] || sdk.initializeApp(cfg);
      try { db = sdk.initializeFirestore(app, { localCache: sdk.persistentLocalCache({ tabManager: sdk.persistentMultipleTabManager() }) }); }
      catch (_) { db = sdk.getFirestore(app); }
      auth = sdk.getAuth(app); await sdk.setPersistence(auth, sdk.browserLocalPersistence);
      sdk.onAuthStateChanged(auth, connect);
    } catch (error) { console.error(error); message("Configuração do Firebase inválida ou indisponível.", true); }
  }

  if (window.vehicleAppReady) init(); else window.addEventListener("vehicle-app-ready", init, { once: true });
})();
