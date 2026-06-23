'use strict';
  const SB_URL = 'https://tjhkoizmtbwtdfmgwvdd.supabase.co';

  const SB_KEY = 'sb_publishable_S3z-t7htlrDMmZ-g-nfQxg_r2Te3IVQ';

  let sb = null, sbUser = null, sbStatus = '', pushTimer = null;

  function setSyncStatus(s) {
    sbStatus = s;
    const el = document.getElementById('sync-status');
    if (el) el.textContent = s;
  }

  async function initSync() {
    if (!window.supabase) { renderSyncBox(); return; } // offline/CDN bloqueado
    sb = window.supabase.createClient(SB_URL, SB_KEY);
    try {
      const { data } = await sb.auth.getSession();
      if (data && data.session) { sbUser = data.session.user; renderSyncBox(); await fullSync(); }
    } catch (e) { /* ignora */ }
    renderSyncBox();
    sb.auth.onAuthStateChange((_e, s) => { sbUser = s ? s.user : null; renderSyncBox(); });
  }

  function rerenderAll() {
    if (activeDay) renderDay(activeDay);
    markCurrentWeek();
    if (document.getElementById('view-progress').classList.contains('active')) openProgress();
  }

  async function fullSync() {
    if (!sb || !sbUser) return;
    setSyncStatus('sincronizando…');
    try {
      const { data, error } = await sb.from('app_state').select('logs,done,health,program,mobility').eq('user_id', sbUser.id).maybeSingle();
      if (error) throw error;
      if (data) {
        mergeLogs(data.logs || {});
        mergeDone(data.done || []);
        mergeMob(data.mobility || []);
        if (data.health) healthData = data.health;
        saveLogs(LOGS); saveDone(); saveMob();
        applyProgram(data.program || DEFAULT_PROGRAM); // programa da conta (ou padrão)
        rerenderAll();
        if (document.getElementById('view-health').classList.contains('active')) renderHealth();
        if (document.getElementById('view-bjj').classList.contains('active')) renderMobility();
      }
      await pushState();
      setSyncStatus('✓ Sincronizado');
    } catch (e) { setSyncStatus('erro: ' + (e.message || e)); }
  }

  async function pushState() {
    if (!sb || !sbUser) return;
    const { error } = await sb.from('app_state').upsert({
      user_id: sbUser.id, logs: LOGS, done: DONE, mobility: MOB, updated_at: new Date().toISOString()
    });
    if (error) throw error;
  }

  // empurra com debounce após salvar localmente

  function queuePush() {
    if (!sb || !sbUser) return;
    setSyncStatus('pendente…');
    clearTimeout(pushTimer);
    pushTimer = setTimeout(async () => {
      try { await pushState(); setSyncStatus('✓ Sincronizado'); }
      catch (e) { setSyncStatus('pendente (sem rede)'); }
    }, 1500);
  }

  async function sbSignIn() {
    const email = document.getElementById('sync-email').value.trim();
    const pass = document.getElementById('sync-pass').value;
    if (!email || !pass) { alert('Preencha email e senha.'); return; }
    setSyncStatus('entrando…');
    const { data, error } = await sb.auth.signInWithPassword({ email: email, password: pass });
    if (error) { alert('Erro ao entrar: ' + error.message); setSyncStatus(''); return; }
    sbUser = data.user; renderSyncBox(); await fullSync();
  }

  async function sbSignUp() {
    const email = document.getElementById('sync-email').value.trim();
    const pass = document.getElementById('sync-pass').value;
    if (!email || pass.length < 6) { alert('Email válido + senha de no mínimo 6 caracteres.'); return; }
    const { data, error } = await sb.auth.signUp({ email: email, password: pass });
    if (error) { alert('Erro ao criar: ' + error.message); return; }
    sbUser = data.user; renderSyncBox();
    if (sbUser) await fullSync();
  }

  async function sbSignOut() {
    try { await sb.auth.signOut(); } catch (e) {}
    sbUser = null; healthData = null; setSyncStatus(''); renderSyncBox();
    applyProgram(DEFAULT_PROGRAM); // volta ao programa padrão ao sair
    if (document.getElementById('view-health').classList.contains('active')) renderHealth();
  }

  function renderSyncBox() {
    const box = document.getElementById('sync-box');
    if (!box) return;
    if (!window.supabase || !sb) {
      box.innerHTML = '<div class="info-box warn" style="font-size:12px">Sincronização indisponível agora (sem rede ou bloqueada). O app funciona normal — os dados ficam no aparelho.</div>';
      return;
    }
    if (sbUser) {
      box.innerHTML =
        '<div class="info-box success" style="font-size:13px">✓ Conectado: <strong>' + esc(sbUser.email) + '</strong><br><span id="sync-status">' + (sbStatus || '✓ Sincronizado') + '</span></div>' +
        '<button class="btn btn-ghost" id="sync-now">Sincronizar agora</button>' +
        '<button class="btn btn-ghost" id="sync-out">Sair</button>';
      box.querySelector('#sync-now').addEventListener('click', fullSync);
      box.querySelector('#sync-out').addEventListener('click', sbSignOut);
    } else {
      box.innerHTML =
        '<input class="fld" id="sync-email" type="email" inputmode="email" autocomplete="username" placeholder="email" style="margin-bottom:8px">' +
        '<input class="fld" id="sync-pass" type="password" autocomplete="current-password" placeholder="senha" style="margin-bottom:8px">' +
        '<button class="btn btn-primary" id="sync-in">Entrar</button>' +
        '<button class="btn btn-ghost" id="sync-up">Criar conta</button>' +
        '<div class="info-box" style="font-size:11px;margin-top:8px">Mesma conta = mesmos treinos em qualquer dispositivo. Protegido por login (RLS).</div>';
      box.querySelector('#sync-in').addEventListener('click', sbSignIn);
      box.querySelector('#sync-up').addEventListener('click', sbSignUp);
    }
  }

  // ====== DADOS DO PROGRAMA ======

  const LS_KEY = 'beastmode.logs.v1';

  function loadLogs() {
    try { return JSON.parse(localStorage.getItem(LS_KEY)) || {}; }
    catch (e) { return {}; }
  }

  function saveLogs(logs) {
    localStorage.setItem(LS_KEY, JSON.stringify(logs));
  }

  let LOGS = loadLogs();

  // datas marcadas "concluído" manualmente (treino sem registro de carga)

  const DONE_KEY = 'beastmode.done.v1';

  function loadDone() {
    try { return JSON.parse(localStorage.getItem(DONE_KEY)) || []; }
    catch (e) { return []; }
  }

  let DONE = loadDone();

  function saveDone() { localStorage.setItem(DONE_KEY, JSON.stringify(DONE)); }

  // mobilidade de quadril (datas feitas) — sincroniza junto com logs/done

  const MOB_KEY = 'beastmode.mob.v1';

  function loadMob() { try { return JSON.parse(localStorage.getItem(MOB_KEY)) || []; } catch (e) { return []; } }

  let MOB = loadMob();

  function saveMob() { localStorage.setItem(MOB_KEY, JSON.stringify(MOB)); }

  function mergeMob(arr) { let a = 0; (arr || []).forEach(d => { if (d && MOB.indexOf(d) < 0) { MOB.push(d); a++; } }); MOB.sort(); return a; }

  function toggleMobToday() {
    const t = todayISO();
    const i = MOB.indexOf(t);
    if (i >= 0) MOB.splice(i, 1); else MOB.push(t);
    saveMob();
    renderMobility();
    queuePush();
  }

  // conjunto de datas em que treinou = logou algum exercício OU marcou manual

  function trainedSet() {
    const set = {};
    Object.values(LOGS).forEach(arr => (arr || []).forEach(s => { if (s.date) set[s.date] = true; }));
    DONE.forEach(d => { set[d] = true; });
    return set;
  }

  function isTrained(iso, set) { return !!(set || trainedSet())[iso]; }

  function toggleDoneToday() {
    const t = todayISO();
    const i = DONE.indexOf(t);
    if (i >= 0) DONE.splice(i, 1); else DONE.push(t);
    saveDone();
    renderDay(activeDay);
    queuePush();
  }

  // ====== BACKUP ======

  function backupPayload(pretty) {
    return JSON.stringify({ v: 1, logs: LOGS, done: DONE, mobility: MOB }, null, pretty ? 2 : 0);
  }

  function exportData() {
    const data = backupPayload(true);
    try {
      if (!window.URL || !URL.createObjectURL) throw new Error('no blob');
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'beastmode-logs-' + todayISO() + '.json';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      // PWA iOS às vezes bloqueia download — cai pra cópia
      copyData();
    }
  }

  function copyData() {
    const data = backupPayload(false);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(data).then(
        () => alert('Copiado. Cola num bloco de notas pra guardar.'),
        () => alert('Não consegui copiar. Use Exportar.'));
    } else {
      alert('Cópia não suportada neste navegador. Use Exportar.');
    }
  }

  // merge não-destrutivo: une por id e data (importado vence em conflito de data)

  function mergeLogs(incoming) {
    let added = 0;
    Object.keys(incoming).forEach(id => {
      const inc = incoming[id];
      if (!Array.isArray(inc)) return;
      if (!LOGS[id]) LOGS[id] = [];
      inc.forEach(sess => {
        if (!sess || !sess.date) return;
        const i = LOGS[id].findIndex(s => s.date === sess.date);
        if (i >= 0) LOGS[id][i] = sess; else { LOGS[id].push(sess); added++; }
      });
      LOGS[id].sort((a, b) => a.date.localeCompare(b.date));
    });
    return added;
  }

  // une datas concluídas (sem duplicar)

  function mergeDone(arr) {
    let added = 0;
    (arr || []).forEach(d => { if (d && DONE.indexOf(d) < 0) { DONE.push(d); added++; } });
    DONE.sort();
    return added;
  }

  function importData(file) {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const obj = JSON.parse(e.target.result);
        if (typeof obj !== 'object' || Array.isArray(obj)) throw new Error('formato');
        // novo formato { logs, done } vs legado (LOGS cru)
        const isNew = obj.logs && typeof obj.logs === 'object';
        const logsPart = isNew ? obj.logs : obj;
        const donePart = isNew ? obj.done : null;
        const added = mergeLogs(logsPart);
        const addedDone = mergeDone(donePart);
        if (isNew && obj.mobility) mergeMob(obj.mobility);
        saveLogs(LOGS);
        saveDone();
        saveMob();
        alert(added + ' sessão(ões) e ' + addedDone + ' dia(s) concluído(s) importado(s).');
        queuePush();
        if (activeGroup) renderProgressGroup(activeGroup);
        renderDay(activeDay);
      } catch (err) {
        alert('Arquivo inválido. Esperado JSON exportado pelo BeastMode.');
      }
    };
    reader.readAsText(file);
  }
