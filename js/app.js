'use strict';
  // Versão semver — fonte única. Bump via ./bump.sh (atualiza ?v= e CHANGELOG juntos).
  // PATCH=fix · MINOR=feature · MAJOR=redesign/quebra
  const APP_VERSION = '1.5.1';
  function getDayKey() {
    const days = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
    return days[new Date().getDay()];
  }

  function selectDay(day) {
    document.querySelectorAll('.day-pill').forEach(p => p.classList.remove('active'));
    const pill = document.querySelector('.day-pill[data-day="' + day + '"]');
    if (pill) {
      pill.classList.add('active');
      if (pill.scrollIntoView) pill.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
    activeDay = day;
    renderDay(day);
  }

  function switchView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.getElementById(viewId).classList.add('active');
    // Saúde e BJJ ficam "dentro" do Menu — destaca a aba Menu nesses casos
    const tabFor = { 'view-health': 'view-menu', 'view-bjj': 'view-menu', 'view-activity': 'view-menu', 'view-checkin': 'view-menu' };
    const tabSel = '.tab[data-view="' + (tabFor[viewId] || viewId) + '"]';
    const tab = document.querySelector(tabSel);
    if (tab) tab.classList.add('active');

    const titles = {
      'view-week': { title: 'Treino', sub: 'Programa Completo · Início 22/06' },
      'view-program': { title: 'Programa', sub: 'Cronograma 8 Semanas' },
      'view-progress': { title: 'Progresso', sub: 'Evolução de cargas registradas' },
      'view-menu': { title: 'Menu', sub: 'Conta · Backup · v' + APP_VERSION },
      'view-health': { title: 'Saúde', sub: 'Exames · DEXA · Metas' },
      'view-activity': { title: 'Atividade', sub: 'Treinos · Apple Health' },
      'view-checkin': { title: 'Check-in', sub: 'Resumo semanal' },
      'view-technique': { title: 'Técnica', sub: 'RPE · Execução de exercícios' },
      'view-bjj': { title: 'BJJ', sub: 'Mobilidade + Guardas' }
    };
    const t = titles[viewId];
    document.getElementById('header-title').textContent = t.title;
    document.getElementById('header-sub').textContent = t.sub;
    if (viewId === 'view-progress') openProgress();
    if (viewId === 'view-health') { renderHealth(); renderMeasures(); }
    if (viewId === 'view-activity') renderActivity();
    if (viewId === 'view-checkin') renderCheckin();
    if (viewId === 'view-bjj') renderMobility();
    if (viewId === 'view-program') markCurrentWeek();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const DAY_ORDER = ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'];
  (function () {
    const area = document.getElementById('view-week');
    let x0 = null, y0 = null;
    area.addEventListener('touchstart', e => {
      // ignora swipe que começa nas pills (scroll horizontal próprio)
      if (e.target.closest('.day-pills')) { x0 = null; return; }
      x0 = e.touches[0].clientX; y0 = e.touches[0].clientY;
    }, { passive: true });
    area.addEventListener('touchend', e => {
      if (x0 === null) return;
      const dx = e.changedTouches[0].clientX - x0;
      const dy = e.changedTouches[0].clientY - y0;
      x0 = null;
      if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy)) return; // precisa ser horizontal
      const i = DAY_ORDER.indexOf(activeDay);
      const next = (i + (dx < 0 ? 1 : -1) + 7) % 7; // wrap
      selectDay(DAY_ORDER[next]);
    }, { passive: true });
  })();

  // arrastar o tracinho do topo pra baixo fecha o sheet de log
  (function () {
    const sheet = document.getElementById('sheet');
    const grip = sheet.querySelector('.sheet-top');
    let startY = null, dy = 0;
    grip.addEventListener('touchstart', e => {
      startY = e.touches[0].clientY; dy = 0;
      sheet.classList.add('dragging');
    }, { passive: true });
    grip.addEventListener('touchmove', e => {
      if (startY === null) return;
      dy = Math.max(0, e.touches[0].clientY - startY); // só pra baixo
      sheet.style.transform = 'translateY(' + dy + 'px)';
    }, { passive: true });
    grip.addEventListener('touchend', () => {
      if (startY === null) return;
      startY = null;
      sheet.classList.remove('dragging');
      if (dy > 90) {
        closeLog(); // pode abrir confirm de descarte
        if (sheet.classList.contains('open')) sheet.style.transform = ''; // cancelou → volta
      } else {
        sheet.style.transform = ''; // não passou do limiar → snap de volta
      }
    }, { passive: true });
  })();

  // atualiza ao voltar pro foco (vira o dia/meia-noite sem precisar recarregar)

  function refreshOnFocus() {
    if (document.hidden) return;
    if (sheetId) return; // não mexe enquanto loga
    if (activeDay) renderDay(activeDay);
    markCurrentWeek();
    if (document.getElementById('view-progress').classList.contains('active')) openProgress();
  }
  document.addEventListener('visibilitychange', refreshOnFocus);
  window.addEventListener('pageshow', refreshOnFocus);
  window.addEventListener('online', () => { if (sbUser) fullSync(); });

  // ====== TEMA (claro/escuro/auto) ======
  const THEME_KEY = 'beastmode.theme';
  function themePref() { try { return localStorage.getItem(THEME_KEY) || 'auto'; } catch (e) { return 'auto'; } }
  function resolveTheme(p) {
    if (p === 'light' || p === 'dark') return p;
    return (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) ? 'light' : 'dark';
  }
  function applyTheme(p) {
    const r = resolveTheme(p);
    document.documentElement.setAttribute('data-theme', r);
    const m = document.querySelector('meta[name=theme-color]');
    if (m) m.setAttribute('content', r === 'light' ? '#F2F2F7' : '#000000');
  }
  function renderThemeSeg() {
    const cur = themePref();
    document.querySelectorAll('#theme-seg .theme-opt').forEach(b =>
      b.classList.toggle('on', b.dataset.themePref === cur));
  }
  function setTheme(p) {
    try { localStorage.setItem(THEME_KEY, p); } catch (e) {}
    applyTheme(p); renderThemeSeg();
  }
  // todo o setup de tema é não-fatal: erro aqui não pode impedir o init (sync etc) abaixo
  try {
    document.querySelectorAll('#theme-seg .theme-opt').forEach(b =>
      b.addEventListener('click', () => setTheme(b.dataset.themePref)));
    renderThemeSeg();
    // segue o sistema quando em 'auto' — Safari iOS antigo só tem addListener (sem addEventListener)
    if (window.matchMedia) {
      const mq = window.matchMedia('(prefers-color-scheme: light)');
      const onChange = () => { if (themePref() === 'auto') applyTheme('auto'); };
      if (mq.addEventListener) mq.addEventListener('change', onChange);
      else if (mq.addListener) mq.addListener(onChange);
    }
  } catch (e) { /* não bloqueia o resto do init */ }

  // ====== INIT ======
  applyProgram(DEFAULT_PROGRAM); // monta pills, índices, cronograma, dia atual
  // sync inicia após o cliente Supabase (defer) carregar — registra ANTES de qualquer coisa opcional
  window.addEventListener('load', initSync);
  try {
    updateCheckinMenu();         // sub do Menu reflete se a semana já foi respondida
    maybeWeeklyCheckin();        // domingo sem check-in → lembra
  } catch (e) { /* não-fatal */ }

  // avisa quando a versão mudou desde a última vez (confirma que atualizou, não é cache)
  (function () {
    const VKEY = 'beastmode.version';
    let seen = null;
    try { seen = localStorage.getItem(VKEY); } catch (e) {}
    if (seen && seen !== APP_VERSION) {
      window.addEventListener('load', () => setTimeout(() => toast('✓ Atualizado para v' + APP_VERSION), 600));
    }
    try { localStorage.setItem(VKEY, APP_VERSION); } catch (e) {}
  })();
