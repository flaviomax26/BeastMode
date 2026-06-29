'use strict';
  const BUILD = '20260629a'; // bump a cada deploy; aparece no Menu pra confirmar build no aparelho
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
    const tabFor = { 'view-health': 'view-menu', 'view-bjj': 'view-menu', 'view-activity': 'view-menu' };
    const tabSel = '.tab[data-view="' + (tabFor[viewId] || viewId) + '"]';
    const tab = document.querySelector(tabSel);
    if (tab) tab.classList.add('active');

    const titles = {
      'view-week': { title: 'Treino', sub: 'Programa Completo · Início 22/06' },
      'view-program': { title: 'Programa', sub: 'Cronograma 8 Semanas' },
      'view-progress': { title: 'Progresso', sub: 'Evolução de cargas registradas' },
      'view-menu': { title: 'Menu', sub: 'Conta · Backup · build ' + BUILD },
      'view-health': { title: 'Saúde', sub: 'Exames · DEXA · Metas' },
      'view-activity': { title: 'Atividade', sub: 'Treinos · Apple Health' },
      'view-technique': { title: 'Técnica', sub: 'RPE · Execução de exercícios' },
      'view-bjj': { title: 'BJJ', sub: 'Mobilidade + Guardas' }
    };
    const t = titles[viewId];
    document.getElementById('header-title').textContent = t.title;
    document.getElementById('header-sub').textContent = t.sub;
    if (viewId === 'view-progress') openProgress();
    if (viewId === 'view-health') { renderHealth(); renderMeasures(); }
    if (viewId === 'view-activity') renderActivity();
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

  // ====== INIT ======
  applyProgram(DEFAULT_PROGRAM); // monta pills, índices, cronograma, dia atual
  // sync inicia após o cliente Supabase (defer) carregar
  window.addEventListener('load', initSync);
