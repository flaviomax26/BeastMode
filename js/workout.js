'use strict';
  let activeDay = null;

  function renderDay(key) {
    const d = DAYS[key];
    const root = document.getElementById('day-root');
    let h = '';

    // Hero
    const tag = d.tagTxt ? '<span class="tag ' + d.tagCls + '">' + d.tagTxt + '</span>' : '';
    const wkIdx = currentWeekIdx();
    const wk = WEEKS[wkIdx];
    const meta = d.meta.slice();
    meta.push('📅 Sem ' + (wkIdx + 1) + '/8 · ' + wk.phase + ' · RPE ' + wk.rpe);
    h += '<div class="day-hero">';
    h += '<div class="day-hero-label">' + d.label + '</div>';
    h += '<h2 class="day-hero-title">' + d.title + ' ' + tag + '</h2>';
    h += '<div class="day-hero-meta">' + meta.map(m => '<div class="day-hero-meta-item">' + m + '</div>').join('') + '</div>';
    h += '</div>';

    // botão de concluir treino — só no dia de hoje
    if (key === getDayKey()) {
      const doneToday = isTrained(todayISO());
      h += '<button class="btn ' + (doneToday ? 'btn-done' : 'btn-ghost') + '" id="done-btn">' +
        (doneToday ? '✓ Treino concluído hoje' : 'Marcar treino concluído') + '</button>';
    }

    if (d.info) h += '<div class="info-box ' + d.info.cls + '">' + d.info.html + '</div>';

    // Seções
    d.sections.forEach(sec => {
      h += '<div class="workout-section">';
      h += '<div class="workout-section-header"><div class="workout-section-dot" style="background:var(--' + sec.dot + ')"></div>' + sec.title + '</div>';
      sec.items.forEach(it => {
        const id = slug(it.n);
        const tagHtml = it.tag ? ' <span class="tag ' + it.tag.cls + '">' + it.tag.txt + '</span>' : '';
        let last = '';
        let badge = '';
        if (it.log) {
          const arr = LOGS[id] || [];
          const u = EX_UNIT[id];
          const today = arr.find(s => s.date === todayISO());
          const prev = arr.slice().reverse().find(s => s.date !== todayISO()); // último anterior a hoje
          if (today) {
            last += '<div class="hoje-line">hoje: ' + today.sets.map(x => fmtSet(x, u)).join(' · ') + '</div>';
            badge = '<div class="done-badge">✓</div>';
          }
          if (prev) {
            last += '<div class="last-line">último: ' + fmtSet(topSet(prev), u) + ' · ' + agoText(prev.date) + '</div>';
          }
        }
        const clickable = it.log ? ' row-clickable' : '';
        const onclick = it.log ? ' data-ex="' + id + '" data-name="' + it.n.replace(/"/g, '&quot;') + '"' : '';
        const chevron = it.log ? '<div class="row-chevron">›</div>' : '';
        h += '<div class="row' + clickable + '"' + onclick + '>';
        h += '<div class="row-icon ' + it.color + '">' + it.icon + '</div>';
        const grip = GRIP[id] ? ' · 🪢 ' + GRIP[id] : '';
        h += '<div class="row-content"><div class="row-title">' + it.n + tagHtml + '</div><div class="row-subtitle">' + it.scheme + grip + '</div>' + last + '</div>';
        h += badge || chevron;
        h += '</div>';
      });
      h += '</div>';
    });

    root.innerHTML = h;
    // animação de troca de dia
    root.classList.remove('day-anim'); void root.offsetWidth; root.classList.add('day-anim');
    // listeners de log
    root.querySelectorAll('[data-ex]').forEach(row => {
      row.addEventListener('click', () => openLog(row.dataset.ex, row.dataset.name));
    });
    const doneBtn = document.getElementById('done-btn');
    if (doneBtn) doneBtn.addEventListener('click', toggleDoneToday);
  }

  function fmtSet(s, unit) {
    const suffix = unit === 'seg' ? 's' : 'kg';
    const w = (s.w || s.w === 0) ? s.w + suffix : '';
    const r = s.r ? ' × ' + s.r : '';
    const rpe = s.rpe ? ' @' + s.rpe : '';
    return (w + r + rpe).trim() || '—';
  }

  // ====== SHEET DE LOG ======

  let sheetId = null;

  let currentUnit = 'kg';

  let sheetDirty = false; // há dados digitados não salvos no sheet

  // sugere próximo alvo pela dupla progressão + RPE da última sessão

  function suggestNext(id) {
    const ls = lastSession(id);
    if (!ls) return null;
    const ts = topSet(ls);
    const rpe = ts.rpe;
    if (!rpe) return null; // sem RPE não há base

    // sugestão ciente da fase da semana (deload reduz; teto de RPE sobe no bloco)
    const wk = WEEKS[currentWeekIdx()];
    const isDeload = /deload/i.test(wk.phase);
    const rm = String(wk.rpe).match(/(\d+)(?:-(\d+))?/);
    const hi = rm ? (rm[2] ? +rm[2] : +rm[1]) : 8; // teto de RPE da semana
    let dir, label;
    if (isDeload) { dir = -1; label = 'Deload — reduza (semana leve)'; }
    else if (rpe < hi) { dir = 1; label = 'Subir (abaixo do alvo RPE ' + wk.rpe + ')'; }
    else if (rpe > hi) { dir = -1; label = 'Recuar (acima do alvo RPE ' + wk.rpe + ')'; }
    else { dir = 0; label = 'Manter (no alvo RPE ' + wk.rpe + ')'; }

    // máquina com stack: pula pro próximo pino real
    if (EX_STACK[id] && ts.w > 0) {
      const stack = STACKS[EX_STACK[id]];
      let idx = 0, best = Infinity;
      stack.forEach((v, i) => { const d = Math.abs(v - ts.w); if (d < best) { best = d; idx = i; } });
      const ni = Math.min(Math.max(idx + dir, 0), stack.length - 1);
      return { field: 'w', value: stack[ni], suffix: 'kg', label, rpe, base: ts.w };
    }

    const unit = EX_UNIT[id];
    let field, base, inc, suffix;
    if (ts.w > 0) {
      field = 'w'; base = ts.w;
      suffix = unit === 'seg' ? 's' : 'kg';
      inc = unit === 'seg' ? 5 : (EX_SMITH[id] ? 6 : 2.5);
    } else if (ts.r > 0) {
      field = 'r'; base = ts.r; suffix = ' reps'; inc = 1;
    } else { return null; }

    let value = base + dir * inc;
    if (value < 0) value = 0;
    return { field, value, suffix, label, rpe, base };
  }

  function renderSuggestion(id) {
    const box = document.getElementById('log-suggest');
    const s = suggestNext(id);
    if (!s) { box.innerHTML = ''; return; }
    const arrow = s.value > s.base ? '↑' : (s.value < s.base ? '↓' : '→');
    box.innerHTML =
      '<div class="suggest">' +
        '<div class="suggest-txt">💡 <strong>' + s.label + '</strong> · última ' + s.base + s.suffix +
          ' @RPE' + s.rpe + ' ' + arrow + ' <strong>' + s.value + s.suffix + '</strong></div>' +
        '<button class="suggest-btn" type="button" data-field="' + s.field + '" data-val="' + s.value + '">Usar</button>' +
      '</div>';
    box.querySelector('.suggest-btn').addEventListener('click', () => {
      document.querySelectorAll('#set-list .set-' + s.field).forEach(i => { i.value = s.value; });
    });
  }

  // referência visual: imagens da base livre (offline) + link de vídeo

  function renderDemo(id, name) {
    const box = document.getElementById('log-demo');
    const imgs = EX_IMG[id];
    let h = '';
    if (imgs && imgs.length) {
      h += '<div class="demo">' + imgs.map(f =>
        '<img src="img/' + f + '" alt="execução" loading="lazy">').join('') + '</div>';
    }
    const q = encodeURIComponent(name + ' execução técnica');
    h += '<a class="demo-link" href="https://www.youtube.com/results?search_query=' + q +
      '" target="_blank" rel="noopener">▶ Ver vídeo de execução</a>';
    box.innerHTML = h;
  }

  // picker dos valores reais do pino da máquina

  function renderStack(id) {
    const box = document.getElementById('log-stack');
    const key = EX_STACK[id];
    if (!key) { box.innerHTML = ''; return; }
    const stack = STACKS[key];
    box.innerHTML = '<div class="sheet-block-label">Carga da máquina (pino)</div>' +
      '<div class="stack-strip">' + stack.map(v =>
        '<button type="button" class="stack-chip" data-v="' + v + '">' + v + '</button>').join('') + '</div>';
    box.querySelectorAll('.stack-chip').forEach(c => c.addEventListener('click', () => {
      const v = c.dataset.v;
      const empty = Array.from(document.querySelectorAll('#set-list .set-w')).find(i => !i.value);
      if (empty) empty.value = v; else addSetRow(v, '', '');
    }));
  }

  function openLog(id, name) {
    sheetId = id;
    currentUnit = EX_UNIT[id] || 'kg';
    document.getElementById('sheet-title').textContent = name;
    document.getElementById('sheet-plan').textContent = '🎯 Programa: ' + (EX_SCHEME[id] || '');
    document.getElementById('set-head-w').textContent = currentUnit === 'seg' ? 'Seg' : 'Carga';
    // exercício de tempo (prancha/dead hang): esconde coluna de reps
    document.getElementById('sheet').classList.toggle('unit-seg', currentUnit === 'seg');

    const ls = lastSession(id);
    document.getElementById('sheet-sub').textContent = ls
      ? 'Último (' + agoText(ls.date) + '): ' + ls.sets.map(s => fmtSet(s, currentUnit)).join('  ·  ')
      : 'Primeira vez registrando este exercício.';

    // auto-sugestão de carga baseada no RPE da última sessão
    renderSuggestion(id);
    renderDemo(id, name);
    renderStack(id);

    // editar treino de HOJE: carrega tudo (carga+reps+rpe).
    // treino novo: nº de séries + reps-alvo do programa; carga = sugestão da última (se houver).
    const setList = document.getElementById('set-list');
    setList.innerHTML = '';
    const editToday = ls && ls.date === todayISO();
    if (editToday) {
      ls.sets.forEach(s => addSetRow(s.w, s.r, s.rpe));
    } else {
      const plan = parseScheme(EX_SCHEME[id]);
      const sugW = ls ? topSet(ls).w : '';                 // peso sugerido (última sessão)
      const tgtR = currentUnit === 'seg' ? '' : plan.reps; // reps-alvo (tempo não usa reps)
      for (let i = 0; i < plan.sets; i++) addSetRow(sugW, tgtR, '');
    }

    // calculadora de barra (Smith 22kg / Hexagonal 9kg)
    const barCfg = EX_BARCALC[id];
    document.getElementById('calc-wrap').style.display = barCfg ? 'block' : 'none';
    if (barCfg) document.getElementById('calc-label').textContent = barCfg.label;

    document.getElementById('log-note').value = '';
    document.getElementById('calc-side').value = '';
    document.getElementById('calc-bar').value = barCfg ? barCfg.bar : '22';
    updateCalc();

    sheetDirty = false; // recém-aberto: pré-preenchidos não contam como alteração
    document.getElementById('sheet-overlay').classList.add('open');
    document.getElementById('sheet').classList.add('open');
  }

  function closeLog(force) {
    // alerta se há dados digitados e não salvos
    if (!force && sheetDirty && !window.confirm('Você digitou dados que ainda não foram salvos. Descartar?')) return;
    sheetDirty = false;
    document.getElementById('sheet-overlay').classList.remove('open');
    document.getElementById('sheet').classList.remove('open');
    sheetId = null;
  }

  // toast simples de confirmação

  let toastTimer = null;

  function toast(msg) {
    let t = document.getElementById('toast');
    if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; document.body.appendChild(t); }
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 1800);
  }

  // celebração de PR (card dourado + troféu + confete)

  function prCelebrate(hits) {
    const old = document.getElementById('pr-pop'); if (old) old.remove();
    const pop = document.createElement('div'); pop.id = 'pr-pop'; pop.className = 'pr-pop';
    const cols = ['#FFD60A', '#FF9F0A', '#FF453A', '#30D158', '#0A84FF', '#BF5AF2', '#FF375F'];
    let conf = '';
    for (let i = 0; i < 22; i++) {
      const left = Math.random() * 100;
      const dur = 1.3 + Math.random() * 1.3;
      const delay = Math.random() * 0.5;
      conf += '<span class="pr-confetti" style="left:' + left + '%;background:' + cols[i % cols.length] +
        ';animation-duration:' + dur.toFixed(2) + 's;animation-delay:' + delay.toFixed(2) + 's"></span>';
    }
    pop.innerHTML = conf +
      '<div class="pr-card"><div class="pr-trophy">🏆</div><div class="pr-title">NOVO PR!</div>' +
      '<div class="pr-hits">' + hits.map(esc).join('<br>') + '</div></div>';
    document.body.appendChild(pop);
    requestAnimationFrame(() => pop.classList.add('show'));
    const close = () => { pop.classList.remove('show'); setTimeout(() => pop.remove(), 250); };
    pop.addEventListener('click', close);
    setTimeout(close, 3000);
  }

  function addSetRow(w, r, rpe) {
    const list = document.getElementById('set-list');
    const idx = list.children.length + 1;
    const div = document.createElement('div');
    div.className = 'set-row';
    div.innerHTML =
      '<div class="set-n">' + idx + '</div>' +
      '<input class="fld set-w" inputmode="decimal" placeholder="' + (currentUnit === 'seg' ? 'seg' : 'kg') + '" value="' + (w !== '' && w != null ? w : '') + '">' +
      '<input class="fld set-r" inputmode="numeric" placeholder="reps" value="' + (r !== '' && r != null ? r : '') + '">' +
      '<input class="fld set-rpe" inputmode="decimal" placeholder="rpe" value="' + (rpe !== '' && rpe != null ? rpe : '') + '">' +
      '<button class="set-del" type="button">×</button>';
    div.querySelector('.set-del').addEventListener('click', () => {
      div.remove();
      renumberSets();
    });
    list.appendChild(div);
  }

  function renumberSets() {
    document.querySelectorAll('#set-list .set-row').forEach((row, i) => {
      row.querySelector('.set-n').textContent = i + 1;
    });
  }

  function updateCalc() {
    const bar = parseFloat(document.getElementById('calc-bar').value) || 0;
    const side = parseFloat(document.getElementById('calc-side').value) || 0;
    const total = bar + side * 2;
    document.getElementById('calc-total').textContent = total + ' kg';
    return total;
  }

  function saveLog() {
    if (!sheetId) return;
    const isTime = currentUnit === 'seg';
    const sets = [];
    const incompletas = [];
    document.querySelectorAll('#set-list .set-row').forEach((row, i) => {
      const wEl = row.querySelector('.set-w'), rEl = row.querySelector('.set-r'), rpeEl = row.querySelector('.set-rpe');
      [wEl, rEl, rpeEl].forEach(e => e && e.classList.remove('field-missing'));
      const w = parseFloat(wEl.value);
      const r = parseInt(rEl.value, 10);
      const rpe = parseFloat(rpeEl.value);
      const touched = row.dataset.touched === '1';
      const any = !isNaN(w) || !isNaN(r) || !isNaN(rpe);
      // conta como série feita só se: tem peso/tempo OU o usuário mexeu na linha
      // (ignora reps pré-preenchidas de linhas não usadas → sem série fantasma)
      if (!any || !(!isNaN(w) || touched)) return;
      // série feita mas faltando reps (não-tempo) ou RPE → marca incompleta
      let falta = false;
      if (!isTime && isNaN(r)) { rEl.classList.add('field-missing'); falta = true; }
      if (isNaN(rpe)) { rpeEl.classList.add('field-missing'); falta = true; }
      if (falta) incompletas.push(i + 1);
      sets.push({ w: isNaN(w) ? 0 : w, r: isNaN(r) ? 0 : r, rpe: isNaN(rpe) ? 0 : rpe });
    });
    if (!sets.length) { closeLog(true); return; }
    if (incompletas.length && !window.confirm('Série(s) ' + incompletas.join(', ') + ' sem reps/RPE — isso atrapalha a análise depois. Salvar assim mesmo?')) return;

    const note = document.getElementById('log-note').value.trim();
    const today = todayISO();
    // recordes anteriores (exclui hoje, que está sendo salvo) → detecta PR
    const prior = exerciseBests(sheetId, today);
    const prHits = detectPR(sets, prior, currentUnit);

    if (!LOGS[sheetId]) LOGS[sheetId] = [];
    // se já houver registro de hoje, substitui (re-edição do dia)
    const arr = LOGS[sheetId];
    const existingIdx = arr.findIndex(s => s.date === today);
    const entry = { date: today, sets: sets, note: note };
    if (existingIdx >= 0) arr[existingIdx] = entry; else arr.push(entry);
    arr.sort((a, b) => a.date.localeCompare(b.date));

    saveLogs(LOGS);
    sheetDirty = false;
    closeLog(true);
    if (prHits.length) prCelebrate(prHits); else toast('✓ Treino salvo');
    renderDay(activeDay);
    if (document.getElementById('view-progress').classList.contains('active')) renderProgressGroup(activeGroup);
    queuePush();
  }

  // ====== PROGRESSO (agrupado por treino) ======
