'use strict';
  const PROGRESS_GROUPS = ['seg', 'ter', 'qua', 'qui', 'sex', 'sab'];

  const DAY_ABBR = { seg: 'Seg', ter: 'Ter', qua: 'Qua', qui: 'Qui', sex: 'Sex', sab: 'Sáb', dom: 'Dom' };

  let activeGroup = null;

  const progMode = {}; // id -> 'carga' | 'e1rm' (modo do gráfico)

  // pills de dias (renderizadas do DAYS — mudam por programa)

  function renderDayPills() {
    const wrap = document.getElementById('day-pills');
    if (!wrap) return;
    wrap.innerHTML = ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'].map(k => {
      const d = DAYS[k];
      const type = d ? d.title.split(' — ')[0].replace('Descanso 😴', 'Rest') : '';
      return '<div class="day-pill" data-day="' + k + '"><div class="day-pill-name">' + DAY_ABBR[k] +
        '</div><div class="day-pill-type">' + esc(type) + '</div></div>';
    }).join('');
    wrap.querySelectorAll('.day-pill').forEach(p => p.addEventListener('click', () => selectDay(p.dataset.day)));
  }

  // cronograma (datas calculadas do início + fases das WEEKS)

  function renderCronograma() {
    const card = document.getElementById('cronograma-rows');
    if (!card) return;
    const dd = x => String(x.getDate()).padStart(2, '0') + '/' + String(x.getMonth() + 1).padStart(2, '0');
    let h = '<div class="table-header"><div>Sem</div><div>Fase</div><div>RPE</div><div>Datas</div></div>';
    WEEKS.forEach((w, i) => {
      const a = new Date(PROGRAM_START.getTime() + i * 7 * 864e5);
      const b = new Date(a.getTime() + 6 * 864e5);
      const deload = /deload/i.test(w.phase);
      h += '<div class="table-row' + (deload ? ' deload' : '') + '">' +
        '<div class="table-cell-week"' + (deload ? ' style="color:var(--orange)"' : '') + '>' + (i + 1) + '</div>' +
        '<div>' + esc(w.phase) + '</div>' +
        '<div class="table-cell-meta">' + esc(w.rpe) + '</div>' +
        '<div class="table-cell-meta">' + dd(a) + '-' + dd(b) + '</div></div>';
    });
    card.innerHTML = h;
    markCurrentWeek();
  }

  function buildProgressGroups() {
    const wrap = document.getElementById('progress-groups');
    wrap.innerHTML = PROGRESS_GROUPS.map(k => {
      const short = DAYS[k].title.split(' — ')[0];
      return '<div class="day-pill" data-group="' + k + '">' +
        '<div class="day-pill-name">' + DAY_ABBR[k] + '</div>' +
        '<div class="day-pill-type">' + short + '</div></div>';
    }).join('');
    wrap.querySelectorAll('.day-pill').forEach(p =>
      p.addEventListener('click', () => selectGroup(p.dataset.group)));
  }

  function selectGroup(k) {
    activeGroup = k;
    document.querySelectorAll('#progress-groups .day-pill').forEach(p =>
      p.classList.toggle('active', p.dataset.group === k));
    const pill = document.querySelector('#progress-groups .day-pill[data-group="' + k + '"]');
    if (pill && pill.scrollIntoView) pill.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    renderProgressGroup(k);
  }

  function renderProgressGroup(k) {
    const body = document.getElementById('progress-body');
    const items = [];
    DAYS[k].sections.forEach(s => s.items.forEach(it => { if (it.log) items.push(it); }));

    const logged = items.filter(it => { const a = LOGS[slug(it.n)]; return a && a.length; });
    const pending = items.length - logged.length;

    if (!logged.length) {
      body.innerHTML = '<div class="empty">Nenhum exercício de <strong>' + DAYS[k].title.split(' — ')[0] +
        '</strong> registrado ainda.<br>Registra tocando num exercício na aba Treino.</div>';
      return;
    }

    let h = '';
    logged.forEach(it => {
      const id = slug(it.n);
      const unit = EX_UNIT[id];
      const isRep = unit === 'rep';
      const sfx = unit === 'seg' ? 's' : (isRep ? '' : 'kg');
      const arr = LOGS[id];
      let pr = 0, prReps = 0;
      arr.forEach(s => s.sets.forEach(set => {
        const v = isRep ? set.r : set.w;
        if (v > pr) { pr = v; prReps = isRep ? 0 : set.r; }
      }));
      const last = arr[arr.length - 1];
      const lastTop = topSet(last);
      const isPR = (isRep ? lastTop.r : lastTop.w) >= pr;
      const b = exerciseBests(id);
      const e1txt = (unit !== 'seg' && b.e1 > 0) ? ' · e1RM ~' + Math.round(b.e1) + 'kg' : '';
      const canToggle = unit !== 'seg' && b.e1 > 0;
      const mode = progMode[id] || 'carga';
      const toggle = canToggle ?
        '<div class="prog-toggle">' +
          '<button type="button" class="pt-btn' + (mode === 'carga' ? ' on' : '') + '" data-id="' + id + '" data-mode="carga">Carga</button>' +
          '<button type="button" class="pt-btn' + (mode === 'e1rm' ? ' on' : '') + '" data-id="' + id + '" data-mode="e1rm">e1RM</button>' +
        '</div>' : '';
      h += '<div class="chart-card">' +
        '<div class="prog-head">' +
          '<div class="prog-name">' + it.n + (isPR && arr.length > 1 ? '<span class="pr-flag">PR</span>' : '') + '</div>' +
          '<div class="prog-meta">PR ' + pr + sfx + (prReps ? '×' + prReps : '') + e1txt + ' · último ' + fmtSet(lastTop, unit) + ' · ' + agoText(last.date) + '</div>' +
        '</div>' +
        toggle +
        '<canvas class="prog-canvas" data-id="' + id + '"></canvas>' +
        '<details class="hist"><summary>Histórico (' + arr.length + ' sessões)</summary>' +
          arr.slice().reverse().map(s =>
            '<div class="hist-row"><span class="hist-date">' + fmtDate(s.date) + '</span>' +
            '<span class="hist-sets">' + s.sets.map(x => fmtSet(x, unit)).join(' · ') + '</span>' +
            (s.note ? '<div class="hist-note">' + esc(s.note) + '</div>' : '') + '</div>'
          ).join('') +
        '</details>' +
      '</div>';
    });
    if (pending > 0) h += '<div class="empty" style="padding:12px">' + pending + ' exercício(s) deste treino ainda sem registro.</div>';
    body.innerHTML = h;

    body.querySelectorAll('.prog-canvas').forEach(cv => drawExerciseChart(cv));
    // toggle Carga / e1RM
    body.querySelectorAll('.pt-btn').forEach(btn => btn.addEventListener('click', () => {
      progMode[btn.dataset.id] = btn.dataset.mode;
      const card = btn.closest('.chart-card');
      card.querySelectorAll('.pt-btn').forEach(b => b.classList.toggle('on', b.dataset.mode === btn.dataset.mode));
      drawExerciseChart(card.querySelector('.prog-canvas'));
    }));
  }

  // e1RM máximo de uma sessão (fallback: carga do top set)

  function drawExerciseChart(cv) {
    const id = cv.dataset.id, arr = LOGS[id], unit = EX_UNIT[id];
    const mode = progMode[id] || 'carga';
    const pts = arr.map(s => ({ date: s.date, v: mode === 'e1rm' ? sessionE1(s) : (unit === 'rep' ? topSet(s).r : topSet(s).w) }));
    drawChart(cv, pts, unit);
  }

  function drawChart(cv, pts, unit, opts) {
    opts = opts || {};
    const sfx = unit === 'seg' ? 's' : (unit === 'rep' ? '' : (unit || 'kg'));
    const dpr = window.devicePixelRatio || 1;
    const cssW = cv.clientWidth, cssH = cv.clientHeight;
    cv.width = cssW * dpr; cv.height = cssH * dpr;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, cssW, cssH);
    if (!pts.length) return;

    const pad = 34;
    const vals = pts.map(p => p.v);
    let min = Math.min.apply(null, vals);
    let max = Math.max.apply(null, vals);
    if (min === max) { min -= 5; max += 5; }
    const span = max - min;
    const n = pts.length;
    const x = i => pad + (n === 1 ? (cssW - 2 * pad) / 2 : i * (cssW - 2 * pad) / (n - 1));
    const y = v => (cssH - pad) - (v - min) / span * (cssH - 2 * pad);

    // grid min/max labels
    ctx.fillStyle = 'rgba(235,235,245,0.35)';
    ctx.font = '11px -apple-system, sans-serif';
    ctx.fillText(max + sfx, 4, y(max) + 4);
    ctx.fillText(min + sfx, 4, y(min) + 4);

    // rótulos do eixo X (opcional)
    if (opts.xlabels) {
      ctx.fillStyle = 'rgba(235,235,245,0.45)';
      ctx.textAlign = 'center';
      opts.xlabels.forEach((lb, i) => ctx.fillText(lb, x(i), cssH - 6));
      ctx.textAlign = 'start';
    }

    // linha
    ctx.strokeStyle = '#0A84FF';
    ctx.lineWidth = 2;
    ctx.beginPath();
    pts.forEach((p, i) => { i ? ctx.lineTo(x(i), y(p.v)) : ctx.moveTo(x(i), y(p.v)); });
    ctx.stroke();

    // pontos (verde = melhor valor; bestLow => menor é melhor)
    const best = opts.bestLow ? min : max;
    pts.forEach((p, i) => {
      ctx.fillStyle = (p.v === best) ? '#30D158' : '#0A84FF';
      ctx.beginPath();
      ctx.arc(x(i), y(p.v), 4, 0, 2 * Math.PI);
      ctx.fill();
    });
  }

  // ====== NAVEGAÇÃO ======

  function markCurrentWeek() {
    const week = currentWeekIdx() + 1; // semana 1..8
    const tagOf = () => { const t = document.createElement('div'); t.className = 'week-now'; t.textContent = '● ATUAL'; return t; };

    // badge vai na 2ª célula (fase/descrição), mais larga — evita quebrar a coluna estreita
    const setRow = (r, on) => {
      r.classList.toggle('current-week', on);
      const old = r.querySelector('.week-now'); if (old) old.remove();
      if (on) (r.children[1] || r.firstElementChild).appendChild(tagOf());
    };

    // Cronograma: 1 linha por semana (índice)
    const card = document.getElementById('cronograma-rows');
    if (card) card.querySelectorAll('.table-row').forEach((r, i) => setRow(r, i === week - 1));

    // Pull-up: faixas via data-weeks
    const pu = document.getElementById('pullup-rows');
    if (pu) pu.querySelectorAll('.table-row').forEach(r =>
      setRow(r, (r.dataset.weeks || '').split(',').map(Number).includes(week)));
  }

  // dados de saúde vêm do Supabase (privados); nunca ficam no HTML público

  let healthData = null;

  function renderHealth() {
    const root = document.getElementById('health-root');
    if (!root) return;
    if (!healthData) {
      root.innerHTML = '<div class="empty">' +
        (sbUser ? 'Sem dados de saúde cadastrados na sua conta ainda.'
                : 'Entre na sua conta (aba <strong>Menu</strong>) para ver seus dados de saúde.') +
        '</div>';
      return;
    }
    const d = healthData;
    const sec = (title, inner) => '<div class="section"><div class="section-header"><p class="section-title">' + title + '</p></div>' + inner + '</div>';
    const rows = arr => '<div class="card">' + arr.map(x =>
      '<div class="row">' + (x.icon ? '<div class="row-icon ' + (x.color || 'gray') + '">' + x.icon + '</div>' : '') +
      '<div class="row-content"><div class="row-title">' + esc(x.title) + '</div>' +
      (x.sub ? '<div class="row-subtitle">' + esc(x.sub) + '</div>' : '') + '</div>' +
      (x.value ? '<div class="lab-status ' + (x.status || '') + '">' + esc(x.value) + '</div>' : '') +
      '</div>').join('') + '</div>';

    let h = '';
    if (d.composicao) h += sec('Composição Corporal (atual)', '<div class="stats-grid">' + d.composicao.map(c =>
      '<div class="stat-box"><div class="stat-label">' + esc(c.label) + '</div><div class="stat-value">' + esc(c.value) + '</div><div class="stat-detail">' + esc(c.detail || '') + '</div></div>').join('') + '</div>');
    if (d.metas_chart) h += sec('Trajetória das Metas',
      '<div class="health-charts">' +
        '<div class="chart-card"><div class="prog-head"><div class="prog-name">% Gordura</div></div><canvas id="chart-fat"></canvas></div>' +
        '<div class="chart-card"><div class="prog-head"><div class="prog-name">Peso (kg)</div></div><canvas id="chart-weight"></canvas></div>' +
      '</div><div class="info-box" style="margin-top:8px;font-size:12px">Hoje → 3m → 6m. Verde = alvo.</div>');
    if (d.dexa) h += sec('Indicadores DEXA', rows(d.dexa));
    if (d.labs) h += sec('Exames Laboratoriais', rows(d.labs));
    if (d.metas) h += sec('Metas de Composição',
      '<div class="table-card"><div class="table-header" style="grid-template-columns:1fr 70px 70px 70px"><div>Métrica</div><div>Hoje</div><div>3m</div><div>6m</div></div>' +
      d.metas.map(m => '<div class="table-row" style="grid-template-columns:1fr 70px 70px 70px"><div>' + esc(m.m) + '</div><div class="table-cell-meta">' + esc(m.hoje) + '</div><div class="table-cell-meta">' + esc(m.m3) + '</div><div class="table-cell-meta" style="color:var(--green)">' + esc(m.m6) + '</div></div>').join('') + '</div>');
    if (d.lembretes) h += sec('Lembretes / Pendências', rows(d.lembretes));

    root.innerHTML = h;
    drawHealthCharts();
  }

  function drawHealthCharts() {
    if (!healthData || !healthData.metas_chart) return;
    const mc = healthData.metas_chart;
    const cf = document.getElementById('chart-fat');
    const cw = document.getElementById('chart-weight');
    if (cf && mc.fat) drawChart(cf, mc.fat.map(v => ({ v: v })), '%', { bestLow: true, xlabels: ['Hoje', '3m', '6m'] });
    if (cw && mc.peso) drawChart(cw, mc.peso.map(v => ({ v: v })), 'kg', { bestLow: true, xlabels: ['Hoje', '3m', '6m'] });
  }

  // ====== MEDIDAS InBody ======
  const MEAS_METRICS = [
    { key: 'peso', label: 'Peso', unit: 'kg', low: true },
    { key: 'gordura', label: '% Gordura', unit: '%', low: true },
    { key: 'magra', label: 'Massa magra', unit: 'kg', low: false },
    { key: 'cintura', label: 'Cintura', unit: 'cm', low: true }
  ];
  function addMeasure() {
    const get = k => { const v = parseFloat(document.getElementById('meas-' + k).value.replace(',', '.')); return isNaN(v) ? null : v; };
    const dateEl = document.getElementById('meas-date');
    const date = (dateEl && dateEl.value) ? dateEl.value : todayISO();
    const fonte = document.getElementById('meas-fonte').value;
    const m = { date: date };
    if (fonte) m.fonte = fonte;
    let any = false;
    MEAS_METRICS.forEach(x => { const v = get(x.key); if (v != null) { m[x.key] = v; any = true; } });
    if (!any) { alert('Preencha pelo menos um campo.'); return; }
    const i = MEAS.findIndex(x => measKey(x) === measKey(m));
    if (i >= 0) MEAS[i] = m; else MEAS.push(m);
    MEAS.sort((a, b) => a.date.localeCompare(b.date));
    saveMeas();
    renderMeasures();
    queuePush();
    toast('✓ Medida salva');
  }
  function renderMeasures() {
    const box = document.getElementById('measures-box');
    if (!box) return;
    const arr = MEAS.slice().sort((a, b) => a.date.localeCompare(b.date));
    let h = '<div class="meas-form">' +
      '<div class="meas-field meas-date-field"><label>Data</label>' +
        '<input class="fld" id="meas-date" type="date" value="' + todayISO() + '"></div>' +
      '<div class="meas-field meas-date-field"><label>Método</label>' +
        '<select class="fld" id="meas-fonte">' +
          '<option value="">—</option><option>InBody</option><option>DEXA</option><option>Pollock</option><option>Outro</option>' +
        '</select></div>' +
      MEAS_METRICS.map(x => '<div class="meas-field"><label>' + x.label + ' (' + x.unit + ')</label>' +
        '<input class="fld" id="meas-' + x.key + '" inputmode="decimal" placeholder="—"></div>').join('') +
      '<button class="btn btn-primary" id="meas-save">Salvar medida</button></div>';
    if (arr.length) {
      MEAS_METRICS.forEach(x => {
        const pts = arr.filter(m => m[x.key] != null).map(m => ({ date: m.date, v: m[x.key] }));
        if (pts.length < 1) return;
        const last = pts[pts.length - 1].v, first = pts[0].v;
        const delta = pts.length > 1 ? (last - first) : 0;
        const dtxt = delta ? (delta > 0 ? '+' : '') + (Math.round(delta * 10) / 10) + x.unit : '';
        h += '<div class="chart-card"><div class="prog-head">' +
          '<div class="prog-name">' + x.label + '</div>' +
          '<div class="prog-meta">atual ' + last + x.unit + (dtxt ? ' · Δ ' + dtxt : '') + ' · ' + pts.length + ' medida(s)</div>' +
          '</div><canvas class="meas-canvas" data-key="' + x.key + '"></canvas></div>';
      });
      h += '<details class="hist"><summary>Histórico (' + arr.length + ')</summary>' +
        arr.slice().reverse().map(m => '<div class="hist-row"><span class="hist-date">' + fmtDate(m.date) + '</span><span class="hist-sets">' +
          MEAS_METRICS.filter(x => m[x.key] != null).map(x => m[x.key] + x.unit).join(' · ') +
          (m.fonte ? ' <span class="meas-tag">' + esc(m.fonte) + '</span>' : '') + '</span></div>').join('') +
        '</details>';
      h += '<div class="empty" style="padding:8px 0 0;font-size:11px;text-align:left">Métodos diferentes não são 1:1 (DEXA padrão ouro, Pollock subestima, InBody boa). Pulo no gráfico pode ser troca de método.</div>';
    } else {
      h += '<div class="empty">Registre sua 1ª medida (InBody) pra ver a evolução real.</div>';
    }
    box.innerHTML = h;
    document.getElementById('meas-save').addEventListener('click', addMeasure);
    box.querySelectorAll('.meas-canvas').forEach(cv => {
      const x = MEAS_METRICS.find(m => m.key === cv.dataset.key);
      const pts = arr.filter(m => m[x.key] != null).map(m => ({ date: m.date, v: m[x.key] }));
      drawChart(cv, pts, x.unit, { bestLow: x.low });
    });
  }

  function defaultProgressGroup() {
    const k = getDayKey();
    return PROGRESS_GROUPS.includes(k) ? k : 'seg';
  }

  function openProgress() {
    // selectGroup re-marca a pill ativa (corrige perda do destaque após sync/foco)
    selectGroup(activeGroup && DAYS[activeGroup] ? activeGroup : defaultProgressGroup());
    renderConsistency();
    renderMuscleMatrix();
  }

  // ====== SOBREPOSIÇÃO MUSCULAR ======
  // ====== MOBILIDADE (3x/semana) ======

  function renderMobility() {
    const box = document.getElementById('mobility-box');
    if (!box) return;
    const set = new Set(MOB);
    const today = new Date(todayISO() + 'T00:00:00');
    const mon = mondayOf(today);
    const weekDates = []; for (let i = 0; i < 7; i++) weekDates.push(isoLocal(new Date(mon.getTime() + i * 864e5)));
    const targets = [['Seg', 0], ['Qua', 2], ['Sex', 4]];
    const weekCount = weekDates.filter(d => set.has(d)).length;

    // streak de semanas com >=3 sessões (semana atual incompleta não quebra)
    let streak = 0, m = new Date(mon);
    for (let g = 0; g < 400; g++) {
      const wd = []; for (let i = 0; i < 7; i++) wd.push(isoLocal(new Date(m.getTime() + i * 864e5)));
      const c = wd.filter(d => set.has(d)).length;
      const isCurrent = m.getTime() === mon.getTime();
      if (c >= 3) { streak++; m = new Date(m.getTime() - 7 * 864e5); }
      else if (isCurrent) { m = new Date(m.getTime() - 7 * 864e5); }
      else break;
    }

    const todayDone = set.has(todayISO());
    let h = '<div class="stats-grid">' +
      '<div class="stat-box"><div class="stat-label">Esta semana</div><div class="stat-value">' + weekCount + '/3</div><div class="stat-detail">sessões</div></div>' +
      '<div class="stat-box"><div class="stat-label">Sequência</div><div class="stat-value">' + streak + '</div><div class="stat-detail">semanas ≥3</div></div>' +
      '</div>';
    h += '<div class="mob-week">' + targets.map(t => {
      const done = set.has(weekDates[t[1]]);
      return '<div class="mob-chip' + (done ? ' done' : '') + '">' + t[0] + (done ? ' ✓' : '') + '</div>';
    }).join('') + '</div>';
    h += '<button class="btn ' + (todayDone ? 'btn-done' : 'btn-primary') + '" id="mob-btn">' +
      (todayDone ? '✓ Mobilidade feita hoje' : 'Marcar mobilidade hoje') + '</button>';
    box.innerHTML = h;
    document.getElementById('mob-btn').addEventListener('click', toggleMobToday);
  }

  function renderMuscleMatrix() {
    const box = document.getElementById('muscle-matrix');
    if (!box) return;
    // data -> Set de grupos treinados
    const byDate = {};
    Object.keys(LOGS).forEach(id => {
      const g = EX_GROUP[id]; if (!g) return;
      (LOGS[id] || []).forEach(s => { (byDate[s.date] = byDate[s.date] || new Set()).add(g); });
    });
    if (!Object.keys(byDate).length) {
      box.innerHTML = '<div class="empty">Registre treinos pra ver quais músculos trabalhou em cada dia.</div>';
      return;
    }
    // grupos por frequência (mais treinados no topo)
    const freq = {};
    Object.values(byDate).forEach(set => set.forEach(g => { freq[g] = (freq[g] || 0) + 1; }));
    const groups = Object.keys(freq).sort((a, b) => freq[b] - freq[a]);
    // últimos 14 dias
    const N = 14;
    const isoOf = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    const today = new Date(todayISO() + 'T00:00:00');
    const days = [];
    for (let i = N - 1; i >= 0; i--) days.push(new Date(today.getTime() - i * 864e5));

    let h = '<div class="mm">';
    h += '<div class="mm-row mm-head"><div class="mm-label"></div>' +
      days.map(d => '<div class="mm-d">' + d.getDate() + '</div>').join('') + '</div>';
    groups.forEach(g => {
      const col = GROUP_COLOR[g] || '#8E8E93';
      h += '<div class="mm-row"><div class="mm-label">' + esc(g) + '</div>' +
        days.map(d => {
          const on = (byDate[isoOf(d)] || new Set()).has(g);
          return '<div class="mm-cell"' + (on ? ' style="background:' + col + '"' : '') + '></div>';
        }).join('') + '</div>';
    });
    h += '</div>';
    h += '<div class="empty" style="padding:8px 0 0;font-size:11px;text-align:left">Últimos 14 dias. Cada quadrado = músculo trabalhado naquele dia. Útil pra ver frequência e recuperação.</div>';
    box.innerHTML = h;
  }

  // ====== CONSISTÊNCIA (heatmap + streak) ======

  const DOW = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D']; // Seg..Dom

  function logsOnDate(iso) {
    const out = [];
    Object.keys(LOGS).forEach(id => (LOGS[id] || []).forEach(s => {
      if (s.date === iso) out.push((EX_NAMES[id] || id) + ': ' + s.sets.map(x => fmtSet(x, EX_UNIT[id])).join(', '));
    }));
    return out;
  }

  function computeStreak(set) {
    let n = 0;
    let d = new Date(todayISO() + 'T00:00:00');
    const iso = x => x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0');
    if (!set[iso(d)]) d.setDate(d.getDate() - 1); // hoje ainda pendente não zera streak
    let guard = 0;
    while (guard++ < 400) {
      if (d.getDay() === 0) { d.setDate(d.getDate() - 1); continue; } // domingo: pula (descanso)
      if (set[iso(d)]) { n++; d.setDate(d.getDate() - 1); } else break;
    }
    return n;
  }

  function renderConsistency() {
    const box = document.getElementById('consistency');
    const set = trainedSet();
    const today = todayISO();
    const streak = computeStreak(set);

    // treinos da semana atual (Seg..Sáb = 6 agendados)
    const wk = currentWeekIdx();
    let weekDone = 0;
    for (let dia = 0; dia < 6; dia++) if (set[isoForWeekDay(wk, dia)]) weekDone++;
    const total = Object.keys(set).length;

    let h = '<div class="stats-grid">' +
      '<div class="stat-box"><div class="stat-label">Sequência</div><div class="stat-value">' + streak + '</div><div class="stat-detail">dias seguidos</div></div>' +
      '<div class="stat-box"><div class="stat-label">Esta semana</div><div class="stat-value">' + weekDone + '/6</div><div class="stat-detail">treinos</div></div>' +
      '<div class="stat-box"><div class="stat-label">Total</div><div class="stat-value">' + total + '</div><div class="stat-detail">dias treinados</div></div>' +
      '<div class="stat-box"><div class="stat-label">Semana ciclo</div><div class="stat-value">' + (wk + 1) + '/8</div><div class="stat-detail">' + WEEKS[wk].phase.split(' ')[0] + '</div></div>' +
    '</div>';

    // heatmap: 8 semanas do programa, 7 dias (Seg..Dom)
    h += '<div class="hm">';
    h += '<div class="hm-row hm-head"><div class="hm-label"></div>' + DOW.map(d => '<div class="hm-dow">' + d + '</div>').join('') + '</div>';
    for (let w = 0; w < 8; w++) {
      h += '<div class="hm-row"><div class="hm-label">S' + (w + 1) + '</div>';
      for (let dia = 0; dia < 7; dia++) {
        const iso = isoForWeekDay(w, dia);
        let cls = 'future';
        if (dia === 6) cls = set[iso] ? 'done' : 'rest';            // domingo
        else if (set[iso]) cls = 'done';
        else if (iso < today) cls = 'miss';                          // passado e não treinou
        else if (iso === today) cls = 'today';
        h += '<div class="hm-cell ' + cls + '" data-date="' + iso + '">' + Number(iso.split('-')[2]) + '</div>';
      }
      h += '</div>';
    }
    h += '</div>';
    h += '<div class="hm-legend"><span class="hm-cell done"></span>treinou <span class="hm-cell miss"></span>faltou <span class="hm-cell rest"></span>descanso <span class="hm-cell future"></span>futuro</div>';

    box.innerHTML = h;
    box.querySelectorAll('.hm-cell[data-date]').forEach(c => c.addEventListener('click', () => {
      const iso = c.dataset.date;
      const ls = logsOnDate(iso);
      alert(fmtDate(iso) + (ls.length ? ':\n' + ls.join('\n') : ': sem registro' + (set[iso] ? ' de carga (marcado concluído)' : '')));
    }));
  }

  // ====== LISTENERS ======
  document.querySelectorAll('#day-pills .day-pill').forEach(pill => {
    pill.addEventListener('click', () => selectDay(pill.dataset.day));
  });
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => switchView(tab.dataset.view));
  });
  // rows do Menu que abrem outras views (Saúde, BJJ)
  document.querySelectorAll('[data-goto]').forEach(row => {
    row.addEventListener('click', () => switchView(row.dataset.goto));
  });

  document.getElementById('add-set').addEventListener('click', () => {
    // copia peso e reps da última série; RPE em branco
    const rows = document.querySelectorAll('#set-list .set-row');
    const last = rows[rows.length - 1];
    const w = last ? last.querySelector('.set-w').value : '';
    const r = last ? last.querySelector('.set-r').value : '';
    addSetRow(w, r, '');
  });
  document.getElementById('save-log').addEventListener('click', saveLog);
  document.getElementById('rest-start').addEventListener('click', toggleRest);
  document.getElementById('rest-minus').addEventListener('click', () => adjustRest(-30));
  document.getElementById('rest-plus').addEventListener('click', () => adjustRest(30));
  document.getElementById('rest-skip').addEventListener('click', () => resetRest(sheetId));
  document.getElementById('cancel-log').addEventListener('click', () => closeLog());
  document.getElementById('sheet-close').addEventListener('click', () => closeLog());
  document.getElementById('sheet-overlay').addEventListener('click', () => closeLog());
  // marca "não salvo" ao digitar nas séries/nota + marca a linha como tocada
  document.getElementById('set-list').addEventListener('input', (e) => {
    sheetDirty = true;
    const row = e.target.closest && e.target.closest('.set-row');
    if (row) row.dataset.touched = '1';
  });
  document.getElementById('log-note').addEventListener('input', () => { sheetDirty = true; });
  document.getElementById('calc-bar').addEventListener('input', updateCalc);
  document.getElementById('calc-side').addEventListener('input', updateCalc);
  document.getElementById('calc-use').addEventListener('click', () => {
    const total = updateCalc();
    // preenche a primeira série com carga vazia, ou adiciona nova
    const empty = Array.from(document.querySelectorAll('#set-list .set-w')).find(i => !i.value);
    if (empty) empty.value = total;
    else addSetRow(total, '', '');
  });

  document.getElementById('export-data').addEventListener('click', exportData);
  document.getElementById('copy-data').addEventListener('click', copyData);
  document.getElementById('import-btn').addEventListener('click', () => document.getElementById('import-file').click());
  document.getElementById('import-file').addEventListener('change', e => {
    if (e.target.files && e.target.files[0]) importData(e.target.files[0]);
    e.target.value = '';
  });

  // ====== SWIPE ENTRE DIAS (wrap) ======
