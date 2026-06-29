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
    if (unit === 'rep') return s.r ? s.r + ' reps' : '—';
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

  // ombro/saúde preventiva: mantêm carga e volume normais mesmo no deload
  const DELOAD_SKIP = {
    'rotacao-externa-cross-45': 1, 'face-pull-crossover': 1,
    'elev-lateral-kb-halter': 1, 'elev-lateral-kb': 1, 'elev-frontal-halter': 1
  };

  // carga de deload: ~65% do recorde, arredondada pro incremento REAL do equipamento
  function deloadSuggest(id) {
    const unit = EX_UNIT[id];
    const b = exerciseBests(id);
    const label = 'Deload — ~65% (semana leve, RPE 5-6)';
    const M = 0.65;

    // exercício de tempo (prancha, dead hang): ~65% do tempo recorde, múltiplo de 5s
    if (unit === 'seg') {
      if (!(b.secs > 0)) return null;
      const v = Math.max(5, Math.round(b.secs * M / 5) * 5);
      return { field: 'w', value: v, suffix: 's', label, rpe: null, base: b.secs };
    }

    const pr = b.pr;
    if (!(pr > 0)) {
      // sem carga histórica (peso corporal: pull-up) → reps a ~65%
      if (b.reps > 0) {
        const v = Math.max(1, Math.round(b.reps * M));
        return { field: 'r', value: v, suffix: ' reps', label, rpe: null, base: b.reps };
      }
      return null;
    }

    const target = pr * M;
    let value;
    if (EX_STACK[id]) {
      // pino IGUAL OU ABAIXO do alvo (nunca arredonda pra cima no deload)
      const stack = STACKS[EX_STACK[id]];
      const below = stack.filter(v => v <= target);
      value = below.length ? Math.max.apply(null, below) : Math.min.apply(null, stack);
    } else if (EX_SMITH[id]) {
      value = Math.max(22, 22 + Math.round((target - 22) / 6) * 6);
    } else if (EX_BARCALC[id] && EX_BARCALC[id].bar === 9) {
      value = Math.max(9, 9 + Math.round((target - 9) / 10) * 10);
    } else {
      value = Math.round(target / 2.5) * 2.5;
    }
    return { field: 'w', value, suffix: 'kg', label, rpe: null, base: pr };
  }

  // sugere próximo alvo pela dupla progressão + RPE da última sessão

  function suggestNext(id) {
    const wk = WEEKS[currentWeekIdx()];
    const isDeload = /deload/i.test(wk.phase);

    // DELOAD: carga ~65% do recorde (exceto ombro/saúde preventiva, que segue normal)
    if (isDeload && !DELOAD_SKIP[id]) return deloadSuggest(id);

    const ls = lastSession(id);
    if (!ls) return null;
    const ts = topSet(ls);
    const rpe = ts.rpe;
    if (!rpe) return null; // sem RPE não há base

    // sugestão ciente da fase da semana (teto de RPE sobe na intensificação/realização)
    const rm = String(wk.rpe).match(/(\d+)(?:-(\d+))?/);
    const hi = rm ? (rm[2] ? +rm[2] : +rm[1]) : 8; // teto de RPE da semana
    let dir, label;
    if (rpe < hi) { dir = 1; label = 'Subir (abaixo do alvo RPE ' + wk.rpe + ')'; }
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
    const baseTxt = s.rpe ? 'última ' + s.base + s.suffix + ' @RPE' + s.rpe
                          : 'recorde ' + s.base + s.suffix;
    box.innerHTML =
      '<div class="suggest">' +
        '<div class="suggest-txt">💡 <strong>' + s.label + '</strong> · ' + baseTxt +
          ' ' + arrow + ' <strong>' + s.value + s.suffix + '</strong></div>' +
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
    // exercício de peso corporal (pull-up): esconde coluna de carga
    document.getElementById('sheet').classList.toggle('unit-rep', currentUnit === 'rep');

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
      const deloadEx = /deload/i.test(WEEKS[currentWeekIdx()].phase) && !DELOAD_SKIP[id];
      // carga: no deload usa a sugestão de ~65%; senão, última sessão
      const sg = deloadEx ? suggestNext(id) : null;
      let sugW = (sg && sg.field === 'w') ? sg.value : (ls ? topSet(ls).w : '');
      if (currentUnit === 'rep') sugW = '';                // peso corporal: sem carga
      // séries: deload reduz ~65% (mín. 2)
      const nSets = deloadEx ? Math.max(2, Math.ceil(plan.sets * 0.65)) : plan.sets;
      const tgtR = currentUnit === 'seg' ? '' : plan.reps; // reps-alvo (tempo não usa reps)
      for (let i = 0; i < nSets; i++) addSetRow(sugW, tgtR, '');
    }

    // calculadora de barra (Smith 22kg / Hexagonal 9kg)
    const barCfg = EX_BARCALC[id];
    document.getElementById('calc-wrap').style.display = barCfg ? 'block' : 'none';
    if (barCfg) document.getElementById('calc-label').textContent = barCfg.label;

    document.getElementById('log-note').value = '';
    document.getElementById('calc-side').value = '';
    document.getElementById('calc-bar').value = barCfg ? barCfg.bar : '22';
    updateCalc();

    resetRest(id); // timer de descanso com default do exercício
    sheetDirty = false; // recém-aberto: pré-preenchidos não contam como alteração
    const sheet = document.getElementById('sheet');
    sheet.style.transform = ''; // limpa arraste anterior
    document.getElementById('sheet-overlay').classList.add('open');
    sheet.classList.add('open');
    document.body.classList.add('sheet-open'); // trava scroll do fundo
  }

  function closeLog(force) {
    // alerta se há dados digitados e não salvos
    if (!force && sheetDirty && !window.confirm('Você digitou dados que ainda não foram salvos. Descartar?')) return;
    stopRest();
    sheetDirty = false;
    document.getElementById('sheet-overlay').classList.remove('open');
    const sheet = document.getElementById('sheet');
    sheet.classList.remove('open', 'dragging');
    sheet.style.transform = '';
    document.body.classList.remove('sheet-open');
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

  // ====== TIMER DE DESCANSO ======
  let restRemaining = 90, restRunning = false, restInterval = null, restAudio = null;
  const REST_HEAVY = { 'deadlift-barra-hex': 1, 'agacho-smith': 1, 'supino-reto-smith': 1, 'remada-barra-hex': 1, 'pulldown-supinado': 1, 'pull-up-amrap': 1, 'negativa-pull-up': 1, 'dead-hang': 1, 'kb-swing': 1, 'leg-press': 1, 'stiff': 1 };
  const REST_ISO = { 'Bíceps': 1, 'Tríceps': 1, 'Panturrilha': 1, 'Antebraço': 1, 'Core': 1, 'Ombro': 1, 'Adutor': 1, 'Abdutor': 1, 'Glúteo': 1 };
  function restDefault(id) {
    if (REST_HEAVY[id]) return 180;
    if (REST_ISO[EX_GROUP[id]]) return 60;
    return 90; // composto de hipertrofia
  }
  function fmtClock(s) { const m = Math.floor(s / 60); return m + ':' + String(s % 60).padStart(2, '0'); }
  function renderRest() {
    const d = document.getElementById('rest-display');
    if (d) { d.textContent = fmtClock(Math.max(0, restRemaining)); d.classList.toggle('done', restRemaining <= 0); }
    const b = document.getElementById('rest-start');
    if (b) b.textContent = restRunning ? '⏸ Pausar' : '▶ Iniciar';
  }
  function beep() {
    try {
      const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
      if (!restAudio) restAudio = new C();
      [0, 0.18, 0.36].forEach(t => {
        const o = restAudio.createOscillator(), g = restAudio.createGain();
        o.frequency.value = 880; o.connect(g); g.connect(restAudio.destination);
        g.gain.setValueAtTime(0.001, restAudio.currentTime + t);
        g.gain.exponentialRampToValueAtTime(0.3, restAudio.currentTime + t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.001, restAudio.currentTime + t + 0.15);
        o.start(restAudio.currentTime + t); o.stop(restAudio.currentTime + t + 0.16);
      });
    } catch (e) {}
  }
  function stopRest() { clearInterval(restInterval); restInterval = null; restRunning = false; }
  function toggleRest() {
    if (restRunning) { stopRest(); renderRest(); return; }
    if (restRemaining <= 0) restRemaining = restDefault(sheetId);
    restRunning = true;
    if (restAudio && restAudio.resume) restAudio.resume(); // destrava áudio no gesto
    renderRest();
    restInterval = setInterval(() => {
      restRemaining--;
      if (restRemaining <= 0) { stopRest(); renderRest(); beep(); }
      else renderRest();
    }, 1000);
  }
  function adjustRest(delta) {
    restRemaining = Math.max(0, Math.min(600, restRemaining + delta));
    renderRest();
  }
  function resetRest(id) { stopRest(); restRemaining = restDefault(id); renderRest(); }

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
    const isRep = currentUnit === 'rep';
    const sets = [];
    const incompletas = [];
    let algumConteudo = false;  // qualquer campo com algo digitado/pré-preenchido (inclui "0")
    document.querySelectorAll('#set-list .set-row').forEach((row, i) => {
      const wEl = row.querySelector('.set-w'), rEl = row.querySelector('.set-r'), rpeEl = row.querySelector('.set-rpe');
      [wEl, rEl, rpeEl].forEach(e => e && e.classList.remove('field-missing'));
      if (wEl.value.trim() || rEl.value.trim() || rpeEl.value.trim()) algumConteudo = true;
      const w = parseFloat(wEl.value);
      const r = parseInt(rEl.value, 10);
      const rpe = parseFloat(rpeEl.value);
      const touched = row.dataset.touched === '1';
      // 0/vazio/negativo não conta como valor — só preenchido de verdade
      const hasW = !isNaN(w) && w > 0;
      const hasR = !isNaN(r) && r > 0;
      const hasRpe = !isNaN(rpe) && rpe > 0;
      // linha não usada (sem carga válida e intocada) → ignora silenciosamente
      // (ex.: reps pré-preenchidas de série que não foi feita → sem série fantasma)
      if (!(hasW || touched)) return;
      // linha que o usuário mexeu/adicionou mas deixou tudo zerado → AVISA (não vira série)
      // ex.: "+ série" com 0/0/0 — antes sumia sem sinal
      if (!hasW && !hasR && !hasRpe) {
        if (!isRep) wEl.classList.add('field-missing');
        if (!isTime) rEl.classList.add('field-missing');
        rpeEl.classList.add('field-missing');
        incompletas.push(i + 1);
        return;
      }
      // série feita: valida campos obrigatórios por tipo de exercício
      let falta = false;
      if (!isRep && !hasW) { wEl.classList.add('field-missing'); falta = true; }  // carga/tempo
      if (!isTime && !hasR) { rEl.classList.add('field-missing'); falta = true; }  // reps
      if (!hasRpe) { rpeEl.classList.add('field-missing'); falta = true; }
      if (falta) incompletas.push(i + 1);
      sets.push({ w: hasW ? w : 0, r: hasR ? r : 0, rpe: hasRpe ? rpe : 0 });
    });
    if (!sets.length) {
      // tem conteúdo na tela (ex.: tudo 0) mas nada válido → avisa em vez de fechar mudo
      if (algumConteudo) { toast('⚠ Preencha carga/reps/RPE com valores > 0'); return; }
      closeLog(true); return;  // folha realmente em branco → fecha sem ruído
    }
    if (incompletas.length && !window.confirm('Série(s) ' + incompletas.join(', ') + ' com campo faltando (carga/reps/RPE) — séries sem nenhum valor válido serão ignoradas. Salvar assim mesmo?')) return;

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
