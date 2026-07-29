(() => {
  const cfg=window.FIREBASE_CONFIG||{};
  const configured=cfg.apiKey&&!/PREENCHER|INSERIR/i.test(String(cfg.apiKey))&&cfg.projectId;
  const QUEUE='mycar_cloud_pending_v1', META='mycar_cloud_meta_v1', INTERVAL=30000;
  let user=null,ref=null,unsub=null,timer=null,monitor=null,applying=false,syncing=false,started=false;
  const json=(k,d=null)=>{try{return JSON.parse(localStorage.getItem(k))??d}catch{return d}};
  const put=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
  const pending=()=>json(QUEUE,null);
  const setPending=v=>{v?put(QUEUE,v):localStorage.removeItem(QUEUE);draw()};
  const metadata=()=>json(META,{});
  const setMeta=p=>{put(META,{...metadata(),...p});draw()};
  const iso=()=>new Date().toISOString();
  const when=v=>v?new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:'medium'}).format(new Date(v)):'Nunca';
  const device=()=>{let id=localStorage.getItem('mycar_device_id');if(!id){id=crypto.randomUUID?.()||`device-${Date.now()}`;localStorage.setItem('mycar_device_id',id)}return id};

  function panel(){
    const host=document.querySelector('#sobre .about-card'); if(!host||document.querySelector('#cloudPanel'))return;
    host.insertAdjacentHTML('beforeend',`<div id="cloudPanel" class="cloud-panel"><h3>Conexão e sincronização</h3><div class="cloud-status-row"><span id="cloudDot" class="cloud-dot"></span><strong id="cloudHeadline">Inicializando…</strong></div><p id="cloudStatus">Verificando sessão e conexão…</p><dl class="cloud-diagnostics"><div><dt>Conta</dt><dd id="cloudAccount">Não conectada</dd></div><div><dt>Internet</dt><dd id="cloudNetwork">Verificando</dd></div><div><dt>Pendências</dt><dd id="cloudPending">0</dd></div><div><dt>Última sincronização</dt><dd id="cloudLastSync">Nunca</dd></div><div><dt>Último recebimento</dt><dd id="cloudLastPull">Nunca</dd></div></dl><div class="cloud-actions"><button id="cloudLogin" type="button" ${configured?'':'disabled'}>Entrar com Google</button><button id="cloudSyncNow" type="button" ${configured?'':'disabled'}>Sincronizar agora</button><button id="cloudLogout" type="button" hidden>Sair</button></div></div>`);
    document.querySelector('#cloudLogin').onclick=login;
    document.querySelector('#cloudSyncNow').onclick=manualSync;
    document.querySelector('#cloudLogout').onclick=logout; const homeStatus=document.querySelector('#homeCloudStatus');if(homeStatus)homeStatus.onclick=()=>{document.querySelector('[data-menu-page="sobre"]')?.click();setTimeout(()=>document.querySelector('#cloudPanel')?.scrollIntoView({behavior:'smooth',block:'center'}),120)}; draw();
  }
  function message(text,error=false){setMeta({message:text,error})}
  function draw(){
    const m=metadata(),q=!!pending(),on=navigator.onLine;
    const status=document.querySelector('#cloudStatus');if(status){status.textContent=m.message||'Aguardando…';status.classList.toggle('cloud-error',!!m.error)}
    let title='Desconectado',cls='offline';
    if(!configured){title='Firebase não configurado';cls='error'}else if(!on){title=q?'Offline — alterações pendentes':'Offline'}else if(syncing){title='Sincronizando…';cls='syncing'}else if(!user){title='Online — login necessário';cls='warning'}else if(q){title='Online — envio pendente';cls='warning'}else{title='Online e sincronizado';cls='online'}
    const h=document.querySelector('#cloudHeadline'),d=document.querySelector('#cloudDot'),hd=document.querySelector('#homeCloudStatus .cloud-dot'),hb=document.querySelector('#homeCloudStatus');if(h)h.textContent=title;if(d)d.className=`cloud-dot ${cls}`;if(hd)hd.className=`cloud-dot ${cls}`;if(hb){hb.title=title;hb.setAttribute('aria-label',title)}
    const vals={cloudAccount:user?.email||'Não conectada',cloudNetwork:on?'Online':'Offline',cloudPending:q?'1 estado aguardando envio':'0',cloudLastSync:when(m.lastPush),cloudLastPull:when(m.lastPull)};
    Object.entries(vals).forEach(([id,v])=>{const e=document.getElementById(id);if(e)e.textContent=v});
    const li=document.querySelector('#cloudLogin'),lo=document.querySelector('#cloudLogout'),sy=document.querySelector('#cloudSyncNow');if(li)li.hidden=!!user;if(lo)lo.hidden=!user;if(sy){sy.disabled=!configured||syncing||!on;sy.textContent=syncing?'Sincronizando…':(!user?'Entrar para sincronizar':'Sincronizar agora');sy.setAttribute('aria-busy',syncing?'true':'false')}
  }
  const native=()=>!!window.Capacitor?.isNativePlatform?.()&&window.Capacitor?.getPlatform?.()==='android';
  async function login(){
    const b=document.querySelector('#cloudLogin');if(b)b.disabled=true;message('Abrindo sua Conta Google…');
    try{if(native()){const a=window.Capacitor?.Plugins?.FirebaseAuthentication;if(!a?.signInWithGoogle)throw new Error('Componente de autenticação Android não instalado.');const r=await a.signInWithGoogle(),c=r?.credential||{};await firebase.auth().signInWithCredential(firebase.auth.GoogleAuthProvider.credential(c.idToken||null,c.accessToken||null))}else await firebase.auth().signInWithPopup(new firebase.auth.GoogleAuthProvider())}catch(e){console.error(e);message(/network/i.test(String(e?.code))?'Sem conexão com a internet.':`Não foi possível entrar${e?.message?`: ${e.message}`:'.'}`,true)}finally{if(b)b.disabled=false}
  }
  async function logout(){try{if(native())await window.Capacitor?.Plugins?.FirebaseAuthentication?.signOut?.();await firebase.auth().signOut()}catch(e){console.error(e);message('Não foi possível sair da conta.',true)}}
  function queue(){
    if(applying||!window.vehicleAppBridge)return;
    setPending({state:window.vehicleAppBridge.getState(),queuedAt:iso(),deviceId:device()});
    message(navigator.onLine?'Alteração salva. Aguardando sincronização…':'Alteração salva neste aparelho. Será enviada quando a internet voltar.');
    clearTimeout(timer);timer=setTimeout(()=>flush(false),700);
  }
  async function flush(manual=false){
    if(syncing)return false;const job=pending();
    if(!navigator.onLine){message('Sem internet. As alterações permanecem salvas neste aparelho.');return false}
    if(!user||!ref){message(manual?'Entre com Google para sincronizar.':'Alterações locais aguardando login.');return false}
    if(!job){if(manual)message('Nenhuma alteração local pendente. Verificando a nuvem…');return true}
    syncing=true;draw();
    try{await ref.set({...job.state,updatedAt:firebase.firestore.FieldValue.serverTimestamp(),clientUpdatedAt:job.queuedAt,deviceId:job.deviceId,schemaVersion:7});setPending(null);setMeta({lastPush:iso(),message:'Alterações enviadas para a nuvem.',error:false});return true}catch(e){console.error(e);setMeta({message:'Falha ao enviar. Os dados serão reenviados automaticamente.',error:true});return false}finally{syncing=false;draw()}
  }
  async function pullLatest(){
    if(!user||!ref||!navigator.onLine)return false;
    syncing=true;draw();message('Consultando a versão mais recente na nuvem…');
    try{const snap=await ref.get({source:'server'});if(!snap.exists){queue();await flush(false);setMeta({message:'Primeira sincronização concluída.',error:false});return true}if(!pending()){applying=true;window.vehicleAppBridge.applyState(snap.data());applying=false;setMeta({lastPull:iso(),message:'Dados conferidos e atualizados.',error:false})}else setMeta({message:'Há alterações locais aguardando envio.',error:false});return true}catch(e){console.error(e);setMeta({message:'Não foi possível consultar a nuvem agora. Os dados locais continuam disponíveis.',error:true});return false}finally{syncing=false;draw()}
  }
  async function manualSync(){
    if(syncing)return;
    if(!navigator.onLine){message('Sem internet. Conecte-se para sincronizar.');draw();return}
    if(!user||!ref){message('Entre com Google para habilitar a sincronização.');await login();return}
    message('Iniciando sincronização completa…');
    const sent=await flush(true);if(sent)await pullLatest();
  }
  window.cloudSync={queueSave:queue,syncNow:manualSync,getStatus:()=>({online:navigator.onLine,authenticated:!!user,pending:!!pending(),syncing,...metadata()})};
  async function connect(current){
    user=current;if(unsub){unsub();unsub=null}draw();
    if(!user){ref=null;message('Entre com Google para manter os dados sincronizados entre aparelhos.');return}
    message(`Conectado como ${user.email}. Carregando dados…`);ref=firebase.firestore().collection('users').doc(user.uid).collection('app').doc('state');
    try{const snap=await ref.get({source:navigator.onLine?'default':'cache'});if(snap.exists&&!pending()){applying=true;window.vehicleAppBridge.applyState(snap.data());applying=false;setMeta({lastPull:iso(),message:'Dados online carregados.',error:false})}else if(!snap.exists)queue();
      unsub=ref.onSnapshot({includeMetadataChanges:true},s=>{if(!s.exists||s.metadata.hasPendingWrites||pending())return;applying=true;window.vehicleAppBridge.applyState(s.data());applying=false;setMeta({lastPull:iso(),message:s.metadata.fromCache?'Dados locais disponíveis. Aguardando conexão…':'Dados atualizados e sincronizados.',error:false})},e=>{console.error(e);message('Conexão com a nuvem interrompida. A reconexão será automática.',true)});await flush(false)
    }catch(e){console.error(e);message('Não foi possível carregar a nuvem. Os dados locais continuam disponíveis.',true)}
  }
  function monitoring(){window.addEventListener('online',()=>{message('Internet restabelecida. Verificando sincronização…');flush(false)});window.addEventListener('offline',()=>message('Sem internet. O aplicativo continuará salvando localmente.'));document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')flush(false)});clearInterval(monitor);monitor=setInterval(()=>{draw();if(navigator.onLine)flush(false)},INTERVAL)}
  async function init(){if(started)return;started=true;panel();monitoring();if(!configured)return;try{if(!firebase.apps?.length)firebase.initializeApp(cfg);try{await firebase.firestore().enablePersistence({synchronizeTabs:true})}catch(e){if(!/failed-precondition|unimplemented/i.test(String(e?.code||'')))console.warn(e)}await firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL);firebase.auth().onAuthStateChanged(connect)}catch(e){console.error(e);message('Configuração do Firebase inválida.',true)}}
  if(window.vehicleAppReady)init();else window.addEventListener('vehicle-app-ready',init,{once:true});
})();
