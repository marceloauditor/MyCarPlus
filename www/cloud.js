(() => {
  const cfg = window.FIREBASE_CONFIG || {};
  const configured = cfg.apiKey && !/PREENCHER|INSERIR/i.test(String(cfg.apiKey)) && cfg.projectId;
  const TABLES = ['movements','registers','drivers','vehicles','suppliers','paymentMethods','alerts'];
  const QUEUE = 'mycar_cloud_pending_v2';
  const BASELINE = 'mycar_cloud_baseline_v2';
  const META = 'mycar_cloud_meta_v2';
  const LOG = 'mycar_cloud_log_v1';
  const LEGACY_QUEUE = 'mycar_cloud_pending_v1';
  const INTERVAL = 30000;
  const SCHEMA_VERSION = 9;
  let user = null, root = null, timer = null, monitor = null, applying = false, syncing = false, started = false;
  let listeners = [];

  const json = (k, d = null) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
  const put = (k, v) => localStorage.setItem(k, JSON.stringify(v));
  const iso = () => new Date().toISOString();
  const nowMs = () => Date.now();
  const device = () => {
    let id = localStorage.getItem('mycar_device_id');
    if (!id) { id = crypto.randomUUID?.() || `device-${Date.now()}`; localStorage.setItem('mycar_device_id', id); }
    return id;
  };
  const pending = () => json(QUEUE, {});
  const baseline = () => json(BASELINE, Object.fromEntries(TABLES.map(t => [t, []])));
  const metadata = () => json(META, {});
  const logs = () => json(LOG, []);
  const addLog = (operation, details = {}) => { const rows=[{at:iso(),operation,...details},...logs()].slice(0,100); put(LOG,rows); renderLog(); };
  const setPending = v => { Object.keys(v || {}).length ? put(QUEUE, v) : localStorage.removeItem(QUEUE); draw(); };
  const setBaseline = v => put(BASELINE, v);
  const setMeta = p => { put(META, { ...metadata(), ...p }); draw(); };
  const when = v => v ? new Intl.DateTimeFormat('pt-BR', { dateStyle:'short', timeStyle:'medium' }).format(new Date(v)) : 'Nunca';
  const clone = v => JSON.parse(JSON.stringify(v ?? null));
  const tableState = state => Object.fromEntries(TABLES.map(t => [t, Array.isArray(state?.[t]) ? state[t] : []]));
  const docId = r => String(r?.id || r?.movimento_id || crypto.randomUUID());
  const remoteDate = v => {
    if (!v) return 0;
    if (typeof v === 'string') return Date.parse(v) || 0;
    if (typeof v.toDate === 'function') return v.toDate().getTime();
    if (typeof v.seconds === 'number') return v.seconds * 1000;
    return 0;
  };
  const cleanForCompare = record => {
    const x = clone(record || {});
    ['syncStatus','updatedAt','updatedBy','version','createdAt','deletedAt','sequencial','schemaVersion'].forEach(k => delete x[k]);
    return JSON.stringify(x, Object.keys(x).sort());
  };
  const newer = (a, b) => {
    const av = Number(a?.version || 0), bv = Number(b?.version || 0);
    if (av !== bv) return av > bv ? a : b;
    const at = remoteDate(a?.updatedAt), bt = remoteDate(b?.updatedAt);
    if (at !== bt) return at > bt ? a : b;
    return String(a?.updatedBy || '') >= String(b?.updatedBy || '') ? a : b;
  };

  function panel() {
    const host = document.querySelector('#sobre .about-card');
    if (!host || document.querySelector('#cloudPanel')) return;
    host.insertAdjacentHTML('beforeend', `<div id="cloudPanel" class="cloud-panel"><h3>Conexão e sincronização</h3><div class="cloud-status-row"><span id="cloudDot" class="cloud-dot"></span><strong id="cloudHeadline">Inicializando…</strong></div><p id="cloudStatus">Verificando sessão e conexão…</p><dl class="cloud-diagnostics"><div><dt>Conta</dt><dd id="cloudAccount">Não conectada</dd></div><div><dt>Internet</dt><dd id="cloudNetwork">Verificando</dd></div><div><dt>Pendências</dt><dd id="cloudPending">0</dd></div><div><dt>Última sincronização</dt><dd id="cloudLastSync">Nunca</dd></div><div><dt>Último recebimento</dt><dd id="cloudLastPull">Nunca</dd></div><div><dt>Último envio</dt><dd id="cloudSent">0 registro(s)</dd></div><div><dt>Último recebimento</dt><dd id="cloudReceived">0 registro(s)</dd></div><div><dt>Dispositivo</dt><dd id="cloudDevice">—</dd></div></dl><div class="cloud-actions"><button id="cloudLogin" type="button" ${configured ? '' : 'disabled'}>Entrar com Google</button><button id="cloudSyncNow" type="button" ${configured ? '' : 'disabled'}>Sincronizar agora</button><button id="cloudLogout" type="button" hidden>Sair</button><button id="cloudToggleLog" type="button">Log técnico</button></div><div id="cloudTechnicalLog" class="cloud-technical-log" hidden></div><p class="cloud-note">Sincronização por registro: movimentos, itens, motoristas, veículos, fornecedores, formas de pagamento e alertas.</p></div>`);
    document.querySelector('#cloudLogin').onclick = login;
    document.querySelector('#cloudSyncNow').onclick = manualSync;
    document.querySelector('#cloudLogout').onclick = logout;
    document.querySelector('#cloudToggleLog').onclick = () => { const box=document.querySelector('#cloudTechnicalLog'); box.hidden=!box.hidden; renderLog(); };
    const homeStatus = document.querySelector('#homeCloudStatus');
    if (homeStatus) homeStatus.onclick = () => { document.querySelector('[data-menu-page="sobre"]')?.click(); setTimeout(() => document.querySelector('#cloudPanel')?.scrollIntoView({ behavior:'smooth', block:'center' }), 120); };
    draw();
  }

  function renderLog(){
    const box=document.querySelector('#cloudTechnicalLog'); if(!box)return;
    const rows=logs(); box.innerHTML=rows.length?rows.map(r=>`<article><b>${r.operation}</b><span>${when(r.at)}</span><small>${r.table||'sistema'}${r.count!=null?` · ${r.count} registro(s)`:''}${r.result?` · ${r.result}`:''}</small></article>`).join(''):'<p>Nenhum evento técnico registrado.</p>';
  }
  function message(text, error = false) { setMeta({ message:text, error }); if(error)addLog("erro",{result:text}); }
  function draw() {
    const m = metadata(), q = Object.values(pending()).reduce((n, x) => n + Object.keys(x || {}).length, 0), on = navigator.onLine;
    const status = document.querySelector('#cloudStatus'); if (status) { status.textContent = m.message || 'Aguardando…'; status.classList.toggle('cloud-error', !!m.error); }
    let title = 'Desconectado', cls = 'offline';
    if (!configured) { title='Firebase não configurado'; cls='error'; }
    else if (!on) { title=q ? 'Offline — alterações pendentes' : 'Offline'; }
    else if (syncing) { title='Sincronizando…'; cls='syncing'; }
    else if (!user) { title='Online — login necessário'; cls='warning'; }
    else if (q) { title=`Online — ${q} registro(s) pendente(s)`; cls='warning'; }
    else { title='Online e sincronizado'; cls='online'; }
    const h=document.querySelector('#cloudHeadline'), d=document.querySelector('#cloudDot'), hd=document.querySelector('#homeCloudStatus .cloud-dot'), hb=document.querySelector('#homeCloudStatus');
    if (h) h.textContent=title; if (d) d.className=`cloud-dot ${cls}`; if (hd) hd.className=`cloud-dot ${cls}`; if (hb) { hb.title=title; hb.setAttribute('aria-label',title); }
    const vals={cloudAccount:user?.email||'Não conectada',cloudNetwork:on?'Online':'Offline',cloudPending:String(q),cloudLastSync:when(m.lastPush),cloudLastPull:when(m.lastPull),cloudSent:`${Number(m.lastSent||0)} registro(s)`,cloudReceived:`${Number(m.lastReceived||0)} registro(s)`,cloudDevice:device().slice(0,18)};
    Object.entries(vals).forEach(([id,v]) => { const e=document.getElementById(id); if(e)e.textContent=v; });
    const li=document.querySelector('#cloudLogin'), lo=document.querySelector('#cloudLogout'), sy=document.querySelector('#cloudSyncNow');
    if(li)li.hidden=!!user; if(lo)lo.hidden=!user; if(sy){sy.disabled=!configured||syncing||!on; sy.textContent=syncing?'Sincronizando…':(!user?'Entrar para sincronizar':'Sincronizar agora'); sy.setAttribute('aria-busy',syncing?'true':'false');}
  }

  const native = () => !!window.Capacitor?.isNativePlatform?.() && window.Capacitor?.getPlatform?.() === 'android';
  async function login() {
    const b=document.querySelector('#cloudLogin'); if(b)b.disabled=true; message('Abrindo sua Conta Google…');
    try {
      if(native()){
        const a=window.Capacitor?.Plugins?.FirebaseAuthentication; if(!a?.signInWithGoogle) throw new Error('Componente de autenticação Android não instalado.');
        const r=await a.signInWithGoogle(), c=r?.credential||{};
        await firebase.auth().signInWithCredential(firebase.auth.GoogleAuthProvider.credential(c.idToken||null,c.accessToken||null));
      } else await firebase.auth().signInWithPopup(new firebase.auth.GoogleAuthProvider());
    } catch(e) { console.error(e); message(/network/i.test(String(e?.code))?'Sem conexão com a internet.':`Não foi possível entrar${e?.message?`: ${e.message}`:'.'}`,true); }
    finally { if(b)b.disabled=false; }
  }
  async function logout(){ try { if(native()) await window.Capacitor?.Plugins?.FirebaseAuthentication?.signOut?.(); await firebase.auth().signOut(); } catch(e){ console.error(e); message('Não foi possível sair da conta.',true); } }

  function enrichAndDiff(current) {
    const base = tableState(baseline());
    const queued = pending();
    const result = tableState(current);
    const changes = clone(queued || {});
    const stamp = iso(), dev = device();

    TABLES.forEach(table => {
      const baseMap = new Map((base[table] || []).map(r => [docId(r), r]));
      const currentMap = new Map();
      let seq = Math.max(0, ...(base[table] || []).map(r => Number(r.sequencial || 0)), ...(result[table] || []).map(r => Number(r.sequencial || 0)));
      result[table] = (result[table] || []).map(raw => {
        const id = docId(raw), old = baseMap.get(id), rec = { ...raw, id };
        currentMap.set(id, rec);
        const changed = !old || cleanForCompare(rec) !== cleanForCompare(old);
        if (!rec.sequencial) rec.sequencial = ++seq;
        if (!rec.createdAt) rec.createdAt = old?.createdAt || stamp;
        if (changed) {
          rec.version = Math.max(Number(rec.version || 0), Number(old?.version || 0)) + 1;
          rec.updatedAt = stamp; rec.updatedBy = dev; rec.deletedAt = null; rec.schemaVersion = SCHEMA_VERSION; rec.syncStatus = 'pendente';
          changes[table] ||= {}; changes[table][id] = clone(rec);
        } else {
          rec.version = Number(rec.version || old?.version || 1); rec.updatedAt = rec.updatedAt || old?.updatedAt || stamp; rec.updatedBy = rec.updatedBy || old?.updatedBy || dev; rec.createdAt = rec.createdAt || old?.createdAt || stamp; rec.deletedAt = rec.deletedAt || null; rec.schemaVersion = SCHEMA_VERSION; rec.syncStatus = 'sincronizado';
        }
        return rec;
      });
      baseMap.forEach((old, id) => {
        if (!currentMap.has(id) && !old.deletedAt) {
          const tomb = { ...old, id, version:Number(old.version || 0)+1, updatedAt:stamp, updatedBy:dev, deletedAt:stamp, schemaVersion:SCHEMA_VERSION, syncStatus:'pendente' };
          changes[table] ||= {}; changes[table][id] = tomb;
        }
      });
    });
    return { state:result, changes };
  }

  function queue() {
    if(applying || !window.vehicleAppBridge) return;
    const { state, changes } = enrichAndDiff(window.vehicleAppBridge.getState());
    applying=true; window.vehicleAppBridge.applyState(state); applying=false;
    setPending(changes);
    message(navigator.onLine?'Alterações registradas por item. Aguardando sincronização…':'Alterações salvas neste aparelho. Serão enviadas quando a internet voltar.');
    clearTimeout(timer); timer=setTimeout(() => synchronize(false), 700);
  }

  const col = table => root.collection(table);
  async function readRemote() {
    const state = Object.fromEntries(TABLES.map(t => [t, []]));
    for (const table of TABLES) {
      const snap = await col(table).get({ source:'server' });
      state[table] = snap.docs.map(d => ({ id:d.id, ...d.data() }));
    }
    return state;
  }

  async function migrateLegacyIfNeeded() {
    const marker = await root.collection('_meta').doc('schema').get();
    if (marker.exists && Number(marker.data()?.version || 0) >= SCHEMA_VERSION) return false;
    const any = await col('movements').limit(1).get();
    if (!any.empty) { await root.collection('_meta').doc('schema').set({version:SCHEMA_VERSION, migratedAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true}); return false; }
    const legacy = await firebase.firestore().collection('users').doc(user.uid).collection('app').doc('state').get();
    const source = legacy.exists ? tableState(legacy.data()) : tableState(window.vehicleAppBridge.getState());
    const stamp=iso(), dev=device();
    const writes=[];
    TABLES.forEach(table => {
      let seq=0;
      (source[table] || []).forEach(raw => {
        const id=docId(raw), rec={...raw,id,sequencial:Number(raw.sequencial||++seq),createdAt:raw.createdAt||stamp,updatedAt:raw.updatedAt||stamp,updatedBy:raw.updatedBy||dev,version:Number(raw.version||1),deletedAt:raw.deletedAt||null,schemaVersion:SCHEMA_VERSION};
        writes.push([col(table).doc(id),rec]);
      });
    });
    for(let i=0;i<writes.length;i+=450){ const batch=firebase.firestore().batch(); writes.slice(i,i+450).forEach(([r,v])=>batch.set(r,v)); await batch.commit(); }
    await root.collection('_meta').doc('schema').set({version:SCHEMA_VERSION,migratedAt:firebase.firestore.FieldValue.serverTimestamp(),source:legacy.exists?'legacy-state':'local-device'});
    localStorage.removeItem(LEGACY_QUEUE);
    setMeta({message:`Migração concluída: ${writes.length} registros convertidos para a estrutura individual.`,error:false});
    return true;
  }

  function mergeStates(remote, local, changes) {
    const merged = Object.fromEntries(TABLES.map(t => [t, []]));
    const winnersToPush = {};
    TABLES.forEach(table => {
      const map = new Map();
      (remote[table] || []).forEach(r => map.set(docId(r), r));
      const localMap = new Map((local[table] || []).map(r => [docId(r), r]));
      Object.entries(changes?.[table] || {}).forEach(([id, queued]) => {
        const candidate = queued.deletedAt ? queued : (localMap.get(id) || queued);
        const remoteRecord = map.get(id);
        if (!remoteRecord) {
          map.set(id, candidate);
          winnersToPush[table] ||= {};
          winnersToPush[table][id] = candidate;
          return;
        }
        const winner = newer(candidate, remoteRecord);
        map.set(id, winner);
        if (winner === candidate) {
          winnersToPush[table] ||= {};
          winnersToPush[table][id] = candidate;
        }
      });
      merged[table] = [...map.values()].filter(r => !r.deletedAt).map(r => ({...r,syncStatus:'sincronizado'}));
    });
    return { merged, winnersToPush };
  }

  async function pushChanges(changes) {
    const writes=[];
    TABLES.forEach(table => Object.values(changes?.[table] || {}).forEach(rec => { const payload={...rec}; delete payload.syncStatus; writes.push([col(table).doc(docId(rec)),payload]); }));
    for(let i=0;i<writes.length;i+=450){ const batch=firebase.firestore().batch(); writes.slice(i,i+450).forEach(([r,v])=>batch.set(r,v,{merge:false})); await batch.commit(); }
    return writes.length;
  }

  async function synchronize(manual=false) {
    if(syncing) return false;
    if(!navigator.onLine){ message('Sem internet. As alterações permanecem salvas neste aparelho.'); return false; }
    if(!user||!root){ message(manual?'Entre com Google para sincronizar.':'Alterações locais aguardando login.'); return false; }
    syncing=true; draw();
    try {
      message('Consultando o Firebase antes de enviar alterações…');
      await migrateLegacyIfNeeded();
      const remote=await readRemote();
      const received=TABLES.reduce((n,t)=>n+(remote[t]||[]).length,0);
      const local=tableState(window.vehicleAppBridge.getState());
      const changes=pending();
      const {merged,winnersToPush}=mergeStates(remote,local,changes);
      const sent=await pushChanges(winnersToPush);
      const finalRemote=sent ? await readRemote() : remote;
      const active=tableState(Object.fromEntries(TABLES.map(t=>[t,(finalRemote[t]||[]).filter(r=>!r.deletedAt).map(r=>({...r,syncStatus:'sincronizado'}))])));
      applying=true; window.vehicleAppBridge.applyState(active); applying=false;
      setBaseline(active); setPending({});
      setMeta({lastPush:sent?iso():metadata().lastPush,lastPull:iso(),lastSent:sent,lastReceived:received,message:sent?`${sent} registro(s) sincronizado(s) com segurança.`:'Dados conferidos. Nenhuma alteração pendente.',error:false});
      addLog('sincronização',{count:sent,result:`${received} recebido(s)`});
      return true;
    } catch(e) {
      console.error(e); setMeta({message:'Falha na sincronização. Nenhum dado local foi descartado; a tentativa será repetida.',error:true}); return false;
    } finally { syncing=false; draw(); }
  }

  async function manualSync(){ if(syncing)return; if(!navigator.onLine){message('Sem internet. Conecte-se para sincronizar.');draw();return;} if(!user||!root){message('Entre com Google para habilitar a sincronização.');await login();return;} await synchronize(true); }
  window.cloudSync={queueSave:queue,syncNow:manualSync,getStatus:()=>({online:navigator.onLine,authenticated:!!user,pending:Object.values(pending()).reduce((n,x)=>n+Object.keys(x||{}).length,0),syncing,...metadata()})};

  function stopListeners(){ listeners.forEach(fn=>{try{fn();}catch{}}); listeners=[]; }
  function startListeners(){
    stopListeners();
    TABLES.forEach(table => listeners.push(col(table).onSnapshot({includeMetadataChanges:true}, snap => {
      if(syncing || snap.metadata.hasPendingWrites || Object.keys(pending()).length) return;
      clearTimeout(timer); timer=setTimeout(()=>synchronize(false),350);
    }, e => { console.error(e); message('Conexão com a nuvem interrompida. A reconexão será automática.',true); })));
  }
  async function connect(current) {
    user=current; stopListeners(); draw();
    if(!user){root=null;message('Entre com Google para manter os dados sincronizados entre aparelhos.');return;}
    root=firebase.firestore().collection('users').doc(user.uid);
    message(`Conectado como ${user.email}. Conferindo dados por registro…`);
    await synchronize(false); startListeners();
  }
  function monitoring(){
    window.addEventListener('online',()=>{message('Internet restabelecida. Verificando sincronização…');synchronize(false);});
    window.addEventListener('offline',()=>message('Sem internet. O aplicativo continuará salvando localmente.'));
    document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')synchronize(false);});
    clearInterval(monitor); monitor=setInterval(()=>{draw();if(navigator.onLine)synchronize(false);},INTERVAL);
  }
  async function init(){
    if(started)return; started=true; panel(); monitoring(); if(!configured)return;
    try{
      if(!firebase.apps?.length)firebase.initializeApp(cfg);
      try{await firebase.firestore().enablePersistence({synchronizeTabs:true});}catch(e){if(!/failed-precondition|unimplemented/i.test(String(e?.code||'')))console.warn(e);}
      await firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL);
      firebase.auth().onAuthStateChanged(connect);
    }catch(e){console.error(e);message('Configuração do Firebase inválida.',true);}
  }
  if(window.vehicleAppReady)init();else window.addEventListener('vehicle-app-ready',init,{once:true});
})();
