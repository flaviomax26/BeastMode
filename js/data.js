'use strict';
  let PROGRAM_START = new Date(2026, 5, 22); // 22/06/2026 (default; sobrescrito pela conta)

  let WEEKS = [
    { phase: 'Acumulação · F1', rpe: '7' },
    { phase: 'Intensificação · F1', rpe: '8' },
    { phase: 'Intensificação · F1', rpe: '8-9' },
    { phase: 'Realização · F1', rpe: '9' },
    { phase: 'DELOAD', rpe: '5-6' },
    { phase: 'Acumulação · F2', rpe: '7' },
    { phase: 'Intensificação · F2', rpe: '8' },
    { phase: 'Realização · F2', rpe: '9' }
  ];

  let showBjj = true;   // visível por conta (esposa não pratica)

  let hasPullup = true; // tabela do programa pull-up por conta

  // log:true => exercício registrável (abre sheet). Cardio/BJJ ficam informativos.

  let DAYS = {
    seg: {
      label: 'Segunda · Manhã',
      title: 'Push A — Força', tagCls: 'push', tagTxt: 'PUSH',
      meta: ['🏋️ ~55 min', '🎯 RPE 7-8', '🥋 BJJ 20h'],
      sections: [
        { title: 'Principal', dot: 'red', items: [
          { n: 'Supino reto Smith', icon: '💪', color: 'red', scheme: '4 séries × 5-7 reps (pesado)', log: true, smith: true },
          { n: 'Desenv. Shoulder', icon: '💪', color: 'red', scheme: '4 séries × 6-8 reps', log: true },
          { n: 'Supino inclinado halter', icon: '💪', color: 'red', scheme: '3 séries × 8-10 reps', log: true },
          { n: 'Crossover alto', icon: '💪', color: 'red', scheme: '3 séries × 12-15 reps', log: true },
          { n: 'Elev. lateral KB/halter', icon: '⭐', color: 'yellow', tag: { cls: 'ombro', txt: 'OMBRO' }, scheme: '3 séries × 12-15 reps', log: true },
          { n: 'Tríceps corda', icon: '💪', color: 'red', scheme: '3 séries × 10-12 reps', log: true },
          { n: 'Tríceps unilateral', icon: '💪', color: 'red', scheme: '3 séries × 12-15 reps cada', log: true }
        ]},
        { title: 'Cardio', dot: 'pink', items: [
          { n: 'Esteira ou Bike — Zona 2', icon: '🏃', color: 'pink', scheme: '15-20 min · FC 108-126 bpm', log: false }
        ]},
        { title: 'BJJ', dot: 'purple', items: [
          { n: 'BJJ · 20h-21h', icon: '🥋', color: 'purple', scheme: 'Push manhã não afeta BJJ noite', log: false }
        ]}
      ]
    },
    ter: {
      label: 'Terça',
      title: 'Legs A — Força', tagCls: 'legs', tagTxt: 'LEGS',
      meta: ['🏋️ ~60 min', '🎯 RPE 7-8', '😴 Sem BJJ'],
      sections: [
        { title: 'Principal', dot: 'green', items: [
          { n: 'Deadlift Barra Hex', icon: '🏋️', color: 'green', scheme: '5 séries × 3-5 reps (pesado)', log: true },
          { n: 'Agacho Smith', icon: '🏋️', color: 'green', scheme: '4 séries × 6-8 reps', log: true, smith: true },
          { n: 'Leg press', icon: '🏋️', color: 'green', scheme: '3 séries × 8-10 reps', log: true },
          { n: 'Cadeira flexora', icon: '🏋️', color: 'green', scheme: '3 séries × 10-12 reps', log: true },
          { n: 'Búlgaro halter', icon: '🏋️', color: 'green', scheme: '3 séries × 8 reps cada perna', log: true },
          { n: 'Panturrilha Smith', icon: '🏋️', color: 'green', scheme: '4 séries × 10-12 reps', log: true, smith: true }
        ]},
        { title: 'Abdômen', dot: 'teal', items: [
          { n: 'Prancha frontal', icon: '🧘', color: 'teal', scheme: '3 séries × 45-60 segundos', log: true, unit: 'seg' }
        ]},
        { title: 'Cardio', dot: 'pink', items: [
          { n: 'Bike leve', icon: '🚴', color: 'pink', scheme: '5-10 min (desfadiga pernas)', log: false }
        ]}
      ]
    },
    qua: {
      label: 'Quarta · Manhã',
      title: 'Pull A — LEVE', tagCls: 'pull', tagTxt: 'PULL',
      meta: ['🏋️ ~45 min', '🎯 RPE 6-7', '🥋 BJJ 20h'],
      info: { cls: 'warn', html: '⚠ <strong>Dia LEVE.</strong> Preserva pegada e dorsal pro BJJ à noite. Não vai à falha.' },
      sections: [
        { title: 'Pull-up Fase 1', dot: 'orange', items: [
          { n: 'Negativa Pull-up', icon: '🎯', color: 'orange', scheme: '4 séries × 3 reps (descer em 5s)', log: true, unit: 'rep' }
        ]},
        { title: 'Principal', dot: 'blue', items: [
          { n: 'Remada baixa cabo', icon: '💪', color: 'blue', scheme: '3 séries × 10-12 reps', log: true },
          { n: 'Pullover crossover', icon: '💪', color: 'blue', scheme: '3 séries × 12-15 reps', log: true },
          { n: 'Face pull crossover', icon: '💪', color: 'blue', scheme: '3 séries × 15-20 reps', log: true },
          { n: 'Rosca alternada halter', icon: '💪', color: 'blue', scheme: '3 séries × 10-12 reps', log: true }
        ]},
        { title: 'Pegada', dot: 'orange', items: [
          { n: 'Dead Hang', icon: '🤚', color: 'orange', scheme: '3 séries até falhar (meta 30s)', log: true, unit: 'seg' }
        ]},
        { title: 'Cardio', dot: 'pink', items: [
          { n: 'Esteira Zona 2', icon: '🏃', color: 'pink', scheme: '15 min · FC 108-126 bpm', log: false }
        ]},
        { title: 'BJJ', dot: 'purple', items: [
          { n: 'BJJ · 20h-21h', icon: '🥋', color: 'purple', scheme: 'Pull leve preserva tatame', log: false }
        ]}
      ]
    },
    qui: {
      label: 'Quinta',
      title: 'Push B — Hipertrofia', tagCls: 'push', tagTxt: 'PUSH',
      meta: ['🏋️ ~65 min', '🎯 RPE 8', '😴 Sem BJJ'],
      sections: [
        { title: 'Principal', dot: 'red', items: [
          { n: 'Supino inclinado Smith', icon: '💪', color: 'red', scheme: '4 séries × 8-12 reps', log: true, smith: true },
          { n: 'Máquina Supino', icon: '💪', color: 'red', scheme: '3 séries × 10-12 reps', log: true },
          { n: 'Desenv. halter sentado', icon: '💪', color: 'red', scheme: '4 séries × 10-12 reps', log: true },
          { n: 'Elev. lateral KB', icon: '💪', color: 'red', scheme: '4 séries × 12-15 reps cada', log: true },
          { n: 'Elev. frontal halter', icon: '⭐', color: 'yellow', tag: { cls: 'ombro', txt: 'OMBRO' }, scheme: '3 séries × 12-15 reps', log: true },
          { n: 'Crossover alto/baixo', icon: '💪', color: 'red', scheme: '3 séries × 12-15 reps (drop)', log: true },
          { n: 'Tríceps testa halter', icon: '💪', color: 'red', scheme: '3 séries × 10-12 reps', log: true },
          { n: 'Rotação externa Cross 45', icon: '🛡️', color: 'indigo', tag: { cls: 'saude', txt: 'SAÚDE' }, scheme: '3 séries × 15-20 reps cada', log: true }
        ]},
        { title: 'Abdômen', dot: 'teal', items: [
          { n: 'Abdominal cabo Cross45', icon: '🧘', color: 'teal', scheme: '3 séries × 12-15 reps', log: true }
        ]},
        { title: 'Cardio', dot: 'pink', items: [
          { n: 'Esteira ou Bike — Zona 2', icon: '🏃', color: 'pink', scheme: '15-20 min · FC 108-126 bpm', log: false }
        ]}
      ]
    },
    sex: {
      label: 'Sexta',
      title: 'Legs B — Hipertrofia', tagCls: 'legs', tagTxt: 'LEGS',
      meta: ['🏋️ ~60 min', '🎯 RPE 8', '😴 Sem BJJ'],
      sections: [
        { title: 'Principal', dot: 'green', items: [
          { n: 'Leg press', icon: '🏋️', color: 'green', scheme: '4 séries × 10-12 reps (pesado)', log: true },
          { n: 'Cadeira extensora', icon: '🏋️', color: 'green', scheme: '4 séries × 12-15 reps', log: true },
          { n: 'Cadeira flexora', icon: '🏋️', color: 'green', scheme: '4 séries × 12-15 reps', log: true },
          { n: 'Goblet squat KB', icon: '🏋️', color: 'green', scheme: '3 séries × 10-12 reps', log: true },
          { n: 'Cadeira adutora', icon: '🏋️', color: 'green', scheme: '3 séries × 12-15 reps', log: true },
          { n: 'Cadeira abdutora', icon: '🏋️', color: 'green', scheme: '3 séries × 12-15 reps', log: true },
          { n: 'Panturrilha leg press', icon: '🏋️', color: 'green', scheme: '4 séries × 15-20 reps', log: true }
        ]},
        { title: 'Pegada', dot: 'orange', items: [
          { n: 'Rosca punho halter', icon: '🤚', color: 'orange', scheme: '3 séries × 12-15 reps cada', log: true }
        ]},
        { title: 'Cardio', dot: 'pink', items: [
          { n: 'Bike leve', icon: '🚴', color: 'pink', scheme: '5-10 min', log: false }
        ]}
      ]
    },
    sab: {
      label: 'Sábado',
      title: 'Pull B — Pesado', tagCls: 'pull', tagTxt: 'PULL',
      meta: ['🏋️ ~70 min', '🎯 RPE 8-9', '😴 Sem BJJ'],
      sections: [
        { title: 'Pull-up Fase 1', dot: 'orange', items: [
          { n: 'Pull-up AMRAP', icon: '🎯', color: 'orange', scheme: '2 séries até falhar (3 min descanso)', log: true, unit: 'rep' }
        ]},
        { title: 'Principal', dot: 'blue', items: [
          { n: 'Remada barra hex', icon: '💪', color: 'blue', scheme: '4 séries × 6-8 reps (pesado)', log: true },
          { n: 'Pulldown supinado', icon: '💪', color: 'blue', scheme: '4 séries × 8-10 reps (pesado)', log: true },
          { n: 'Remada máquina', icon: '💪', color: 'blue', scheme: '3 séries × 10-12 reps', log: true },
          { n: 'Rosca scott', icon: '💪', color: 'blue', scheme: '4 séries × 10-12 reps', log: true },
          { n: 'Rosca corda', icon: '💪', color: 'blue', scheme: '3 séries × 12-15 reps', log: true }
        ]},
        { title: 'Abdômen', dot: 'teal', items: [
          { n: 'Roda abdominal (joelhos)', icon: '🧘', color: 'teal', scheme: '3 séries × 8-12 reps', log: true }
        ]},
        { title: 'Finisher', dot: 'red', items: [
          { n: 'KB swing', icon: '🔥', color: 'red', scheme: '5 séries × 15 reps (90s rest)', log: true }
        ]},
        { title: 'Cardio', dot: 'pink', items: [
          { n: 'Esteira Zona 2', icon: '🏃', color: 'pink', scheme: '15-20 min', log: false }
        ]}
      ]
    },
    dom: {
      label: 'Domingo',
      title: 'Descanso 😴', tagCls: '', tagTxt: '',
      meta: ['🛌 Recuperação'],
      info: { cls: 'success', html: '✓ <strong>Domingo é dia de recuperação total.</strong> Sem treino estruturado. Tempo com família, sono em dia.' },
      sections: [
        { title: 'Cardio leve (opcional)', dot: 'pink', items: [
          { n: 'Caminhada / passeio', icon: '🚶', color: 'pink', scheme: '30 min · Zona 1-2', log: false }
        ]}
      ]
    }
  };

  // programa padrão (meu) — usado quando a conta não tem programa próprio

  const DEFAULT_PROGRAM = {
    start: '2026-06-22', weeks: WEEKS, days: DAYS, bjj: true, pullup: true
  };

  // aplica um programa (da conta ou o padrão): troca DAYS/início/semanas/flags e re-renderiza

  function applyProgram(p) {
    p = p || DEFAULT_PROGRAM;
    DAYS = p.days || DEFAULT_PROGRAM.days;
    WEEKS = p.weeks || DEFAULT_PROGRAM.weeks;
    showBjj = p.bjj !== false;
    hasPullup = p.pullup !== false;
    if (p.start) { const a = p.start.split('-'); PROGRAM_START = new Date(+a[0], +a[1] - 1, +a[2]); }
    buildExIndexes();
    renderDayPills();
    buildProgressGroups();
    renderCronograma();
    applyProgramVisibility();
    if (activeDay) selectDay(activeDay); else selectDay(getDayKey());
  }

  function applyProgramVisibility() {
    const bjjRow = document.getElementById('menu-bjj-row');
    if (bjjRow) bjjRow.style.display = showBjj ? '' : 'none';
    const pu = document.getElementById('pullup-section');
    if (pu) pu.style.display = hasPullup ? '' : 'none';
  }

  // ====== STORAGE ======

  function slug(s) {
    return s.toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  // índices id -> {nome, smith, unidade, scheme} — reconstruídos quando o programa muda

  let EX_NAMES = {}, EX_SMITH = {}, EX_UNIT = {}, EX_SCHEME = {};

  function buildExIndexes() {
    EX_NAMES = {}; EX_SMITH = {}; EX_UNIT = {}; EX_SCHEME = {};
    Object.values(DAYS).forEach(d => d.sections.forEach(s => s.items.forEach(it => {
      if (it.log) {
        EX_NAMES[slug(it.n)] = it.n;
        if (it.smith) EX_SMITH[slug(it.n)] = true;
        EX_UNIT[slug(it.n)] = it.unit || 'kg';
        EX_SCHEME[slug(it.n)] = it.scheme;
      }
    })));
  }
  buildExIndexes();

  // extrai nº de séries e reps-alvo do texto do programa

  function parseScheme(scheme) {
    let sets = 1, reps = '';
    const ms = (scheme || '').match(/(\d+)\s*s[ée]ries?/i);
    if (ms) sets = parseInt(ms[1], 10);
    const mr = (scheme || '').match(/×\s*(\d+)(?:\s*-\s*\d+)?\s*reps?/i);
    if (mr) reps = mr[1]; // limite inferior da faixa
    return { sets: sets || 1, reps: reps };
  }

  // imagens de execução (free-exercise-db, domínio público) — slug -> arquivos em img/

  const EX_IMG = {
    'supino-reto-smith': ['Smith_Machine_Bench_Press__0.jpg', 'Smith_Machine_Bench_Press__1.jpg'],
    'desenv-shoulder': ['Leverage_Shoulder_Press__0.jpg', 'Leverage_Shoulder_Press__1.jpg'],
    'supino-inclinado-halter': ['Incline_Dumbbell_Press__0.jpg', 'Incline_Dumbbell_Press__1.jpg'],
    'crossover-alto': ['Cable_Crossover__0.jpg', 'Cable_Crossover__1.jpg'],
    'elev-lateral-kb-halter': ['Side_Lateral_Raise__0.jpg', 'Side_Lateral_Raise__1.jpg'],
    'triceps-corda': ['Triceps_Pushdown_-_Rope_Attachment__0.jpg', 'Triceps_Pushdown_-_Rope_Attachment__1.jpg'],
    'triceps-unilateral': ['Cable_One_Arm_Tricep_Extension__0.jpg', 'Cable_One_Arm_Tricep_Extension__1.jpg'],
    'deadlift-barra-hex': ['Trap_Bar_Deadlift__0.jpg', 'Trap_Bar_Deadlift__1.jpg'],
    'agacho-smith': ['Smith_Machine_Squat__0.jpg', 'Smith_Machine_Squat__1.jpg'],
    'leg-press': ['Leg_Press__0.jpg', 'Leg_Press__1.jpg'],
    'cadeira-flexora': ['Seated_Leg_Curl__0.jpg', 'Seated_Leg_Curl__1.jpg'],
    'bulgaro-halter': ['Split_Squat_with_Dumbbells__0.jpg', 'Split_Squat_with_Dumbbells__1.jpg'],
    'panturrilha-smith': ['Smith_Machine_Calf_Raise__0.jpg', 'Smith_Machine_Calf_Raise__1.jpg'],
    'negativa-pull-up': ['Pullups__0.jpg', 'Pullups__1.jpg'],
    'remada-baixa-cabo': ['Seated_Cable_Rows__0.jpg', 'Seated_Cable_Rows__1.jpg'],
    'pullover-crossover': ['Straight-Arm_Pulldown__0.jpg', 'Straight-Arm_Pulldown__1.jpg'],
    'face-pull-crossover': ['Face_Pull__0.jpg', 'Face_Pull__1.jpg'],
    'rosca-alternada-halter': ['Dumbbell_Alternate_Bicep_Curl__0.jpg', 'Dumbbell_Alternate_Bicep_Curl__1.jpg'],
    'dead-hang': ['Pullups__0.jpg', 'Pullups__1.jpg'],
    'supino-inclinado-smith': ['Smith_Machine_Incline_Bench_Press__0.jpg', 'Smith_Machine_Incline_Bench_Press__1.jpg'],
    'maquina-supino': ['Leverage_Chest_Press__0.jpg', 'Leverage_Chest_Press__1.jpg'],
    'desenv-halter-sentado': ['Seated_Dumbbell_Press__0.jpg', 'Seated_Dumbbell_Press__1.jpg'],
    'elev-frontal-halter': ['Front_Dumbbell_Raise__0.jpg', 'Front_Dumbbell_Raise__1.jpg'],
    'crossover-alto-baixo': ['Cable_Crossover__0.jpg', 'Cable_Crossover__1.jpg'],
    'triceps-testa-halter': ['Lying_Dumbbell_Tricep_Extension__0.jpg', 'Lying_Dumbbell_Tricep_Extension__1.jpg'],
    'rotacao-externa-cross-45': ['External_Rotation_with_Band__0.jpg', 'External_Rotation_with_Band__1.jpg'],
    'elev-lateral-kb': ['Side_Lateral_Raise__0.jpg', 'Side_Lateral_Raise__1.jpg'],
    'cadeira-extensora': ['Leg_Extensions__0.jpg', 'Leg_Extensions__1.jpg'],
    'goblet-squat-kb': ['Goblet_Squat__0.jpg', 'Goblet_Squat__1.jpg'],
    'adutor-abdutor': ['Thigh_Adductor__0.jpg', 'Thigh_Adductor__1.jpg'],
    'panturrilha-leg-press': ['Calf_Press_On_The_Leg_Press_Machine__0.jpg', 'Calf_Press_On_The_Leg_Press_Machine__1.jpg'],
    'pull-up-amrap': ['Pullups__0.jpg', 'Pullups__1.jpg'],
    'remada-barra-hex': ['Bent_Over_Two-Dumbbell_Row__0.jpg', 'Bent_Over_Two-Dumbbell_Row__1.jpg'],
    'pulldown-supinado': ['Underhand_Cable_Pulldowns__0.jpg', 'Underhand_Cable_Pulldowns__1.jpg'],
    'remada-maquina': ['Leverage_Iso_Row__0.jpg', 'Leverage_Iso_Row__1.jpg'],
    'rosca-scott': ['Preacher_Curl__0.jpg', 'Preacher_Curl__1.jpg'],
    'rosca-corda': ['Cable_Hammer_Curls_-_Rope_Attachment__0.jpg', 'Cable_Hammer_Curls_-_Rope_Attachment__1.jpg'],
    'prancha-frontal': ['Plank__0.jpg', 'Plank__1.jpg'],
    'abdominal-cabo-cross45': ['Cable_Crunch__0.jpg', 'Cable_Crunch__1.jpg'],
    'roda-abdominal-joelhos': ['Ab_Roller__0.jpg', 'Ab_Roller__1.jpg'],
    'kb-swing': ['One-Arm_Kettlebell_Swings__0.jpg', 'One-Arm_Kettlebell_Swings__1.jpg'],
    'rosca-punho-halter': ['Seated_Dumbbell_Palms-Up_Wrist_Curl__0.jpg', 'Seated_Dumbbell_Palms-Up_Wrist_Curl__1.jpg'],
    'elevacao-pelvica': ['Barbell_Hip_Thrust__0.jpg', 'Barbell_Hip_Thrust__1.jpg'],
    'afundo': ['Dumbbell_Lunges__0.jpg', 'Dumbbell_Lunges__1.jpg'],
    'cadeira-abdutora': ['Thigh_Abductor__0.jpg', 'Thigh_Abductor__1.jpg'],
    'cadeira-adutora': ['Thigh_Adductor__0.jpg', 'Thigh_Adductor__1.jpg'],
    'panturrilha': ['Standing_Calf_Raises__0.jpg', 'Standing_Calf_Raises__1.jpg'],
    'puxada-na-frente': ['Wide-Grip_Lat_Pulldown__0.jpg', 'Wide-Grip_Lat_Pulldown__1.jpg'],
    'remada-baixa': ['Seated_Cable_Rows__0.jpg', 'Seated_Cable_Rows__1.jpg'],
    'remada-unilateral': ['One-Arm_Dumbbell_Row__0.jpg', 'One-Arm_Dumbbell_Row__1.jpg'],
    'rosca-biceps': ['Dumbbell_Bicep_Curl__0.jpg', 'Dumbbell_Bicep_Curl__1.jpg'],
    'triceps-na-polia': ['Triceps_Pushdown__0.jpg', 'Triceps_Pushdown__1.jpg'],
    'prancha': ['Plank__0.jpg', 'Plank__1.jpg'],
    'stiff': ['Stiff-Legged_Dumbbell_Deadlift__0.jpg', 'Stiff-Legged_Dumbbell_Deadlift__1.jpg'],
    'gluteo-no-cabo': ['Glute_Kickback__0.jpg', 'Glute_Kickback__1.jpg'],
    'desenvolvimento-com-halter': ['Seated_Dumbbell_Press__0.jpg', 'Seated_Dumbbell_Press__1.jpg'],
    'elevacao-lateral': ['Side_Lateral_Raise__0.jpg', 'Side_Lateral_Raise__1.jpg'],
    'supino': ['Barbell_Bench_Press_-_Medium_Grip__0.jpg', 'Barbell_Bench_Press_-_Medium_Grip__1.jpg'],
    'crucifixo': ['Dumbbell_Flyes__0.jpg', 'Dumbbell_Flyes__1.jpg'],
    'triceps': ['Triceps_Pushdown__0.jpg', 'Triceps_Pushdown__1.jpg'],
    'biceps': ['Dumbbell_Bicep_Curl__0.jpg', 'Dumbbell_Bicep_Curl__1.jpg'],
    'leg-press-leve': ['Leg_Press__0.jpg', 'Leg_Press__1.jpg'],
    'supino-leve': ['Barbell_Bench_Press_-_Medium_Grip__0.jpg', 'Barbell_Bench_Press_-_Medium_Grip__1.jpg'],
    'abdominal-infra': ['Reverse_Crunch__0.jpg', 'Reverse_Crunch__1.jpg']
  };

  // grupo muscular por exercício (do free-exercise-db) — pro tracker de sobreposição

  const EX_GROUP = {
    'supino-reto-smith': 'Peito', 'desenv-shoulder': 'Ombro', 'supino-inclinado-halter': 'Peito',
    'crossover-alto': 'Peito', 'elev-lateral-kb-halter': 'Ombro', 'triceps-corda': 'Tríceps',
    'triceps-unilateral': 'Tríceps', 'deadlift-barra-hex': 'Quadríceps', 'agacho-smith': 'Quadríceps',
    'leg-press': 'Quadríceps', 'cadeira-flexora': 'Posterior', 'bulgaro-halter': 'Quadríceps',
    'panturrilha-smith': 'Panturrilha', 'negativa-pull-up': 'Costas', 'remada-baixa-cabo': 'Costas',
    'pullover-crossover': 'Costas', 'face-pull-crossover': 'Ombro', 'rosca-alternada-halter': 'Bíceps',
    'dead-hang': 'Costas', 'supino-inclinado-smith': 'Peito', 'maquina-supino': 'Peito',
    'desenv-halter-sentado': 'Ombro', 'elev-frontal-halter': 'Ombro', 'crossover-alto-baixo': 'Peito',
    'triceps-testa-halter': 'Tríceps', 'rotacao-externa-cross-45': 'Ombro', 'elev-lateral-kb': 'Ombro', 'cadeira-extensora': 'Quadríceps',
    'goblet-squat-kb': 'Quadríceps', 'adutor-abdutor': 'Adutor', 'panturrilha-leg-press': 'Panturrilha',
    'pull-up-amrap': 'Costas', 'remada-barra-hex': 'Costas', 'pulldown-supinado': 'Costas',
    'remada-maquina': 'Costas', 'rosca-scott': 'Bíceps', 'rosca-corda': 'Bíceps',
    'prancha-frontal': 'Core', 'abdominal-cabo-cross45': 'Core', 'roda-abdominal-joelhos': 'Core',
    'kb-swing': 'Posterior', 'rosca-punho-halter': 'Antebraço', 'elevacao-pelvica': 'Glúteo',
    'afundo': 'Quadríceps', 'cadeira-abdutora': 'Abdutor', 'cadeira-adutora': 'Adutor',
    'panturrilha': 'Panturrilha', 'puxada-na-frente': 'Costas', 'remada-baixa': 'Costas',
    'remada-unilateral': 'Costas', 'rosca-biceps': 'Bíceps', 'triceps-na-polia': 'Tríceps',
    'prancha': 'Core', 'stiff': 'Posterior', 'gluteo-no-cabo': 'Glúteo',
    'desenvolvimento-com-halter': 'Ombro', 'elevacao-lateral': 'Ombro', 'supino': 'Peito',
    'crucifixo': 'Peito', 'triceps': 'Tríceps', 'biceps': 'Bíceps',
    'leg-press-leve': 'Quadríceps', 'supino-leve': 'Peito', 'abdominal-infra': 'Core'
  };

  const GROUP_COLOR = {
    'Peito': '#FF453A', 'Costas': '#0A84FF', 'Ombro': '#FFD60A', 'Bíceps': '#64D2FF',
    'Tríceps': '#FF9F0A', 'Quadríceps': '#30D158', 'Posterior': '#5E5CE6', 'Glúteo': '#FF375F',
    'Panturrilha': '#8E8E93', 'Core': '#BF5AF2', 'Antebraço': '#AC8E68', 'Adutor': '#64D2FF', 'Abdutor': '#5AC8FA'
  };

  // valores reais do pino de cada stack (medidos nas máquinas da academia)

  const STACKS = {
    movement: [3.5, 8.5, 13.5, 18.5, 23.5, 33.5, 43.5, 53.5, 63.5, 73.5, 83.5, 93.5, 103.5],
    legpress: [7, 17, 27, 37, 47, 57, 77, 97, 117, 137, 157],
    cross45: [2.5, 5, 7.5, 10, 12.5, 15, 17.5, 20, 22.5, 25, 27.5, 30, 32.5, 35, 37.5, 40, 42.5, 45, 47.5]
  };
  // exercício -> stack (apenas máquinas/cabo selectorizados; Smith e pesos livres ficam de fora)

  const EX_STACK = {
    'cadeira-flexora': 'movement', 'cadeira-extensora': 'movement', 'adutor-abdutor': 'movement',
    'cadeira-abdutora': 'movement', 'cadeira-adutora': 'movement',
    'remada-maquina': 'movement', 'maquina-supino': 'movement', 'desenv-shoulder': 'movement',
    'pulldown-supinado': 'movement', 'remada-baixa-cabo': 'movement',
    'leg-press': 'legpress', 'panturrilha-leg-press': 'legpress',
    'crossover-alto': 'cross45', 'crossover-alto-baixo': 'cross45', 'pullover-crossover': 'cross45',
    'face-pull-crossover': 'cross45', 'triceps-corda': 'cross45', 'triceps-unilateral': 'cross45',
    'abdominal-cabo-cross45': 'cross45', 'rosca-corda': 'cross45',
    'rotacao-externa-cross-45': 'cross45'
  };

  // pegador recomendado por exercício de cabo (Cross 45 / puxada)

  const GRIP = {
    'triceps-corda': 'corda',
    'rosca-corda': 'corda',
    'face-pull-crossover': 'corda',
    'abdominal-cabo-cross45': 'corda',
    'triceps-unilateral': 'estribo',
    'crossover-alto': '2 estribos',
    'crossover-alto-baixo': '2 estribos',
    'pullover-crossover': 'barra reta',
    'remada-baixa-cabo': 'triângulo',
    'pulldown-supinado': 'barra (supinada)',
    'rotacao-externa-cross-45': 'estribo'
  };

  // calculadora de barra: slug -> { peso da barra, rótulo }

  const EX_BARCALC = {};
  Object.keys(EX_SMITH).forEach(id => { EX_BARCALC[id] = { bar: 22, label: 'Calculadora Smith' }; });
  EX_BARCALC['deadlift-barra-hex'] = { bar: 9, label: 'Calculadora Barra Hexagonal' };
  EX_BARCALC['remada-barra-hex'] = { bar: 9, label: 'Calculadora Barra Hexagonal' };

  // ====== HELPERS DE DATA ======

  function todayISO() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function agoText(iso) {
    const a = new Date(iso + 'T00:00:00');
    const b = new Date(todayISO() + 'T00:00:00');
    const days = Math.round((b - a) / 864e5);
    if (days <= 0) return 'hoje';
    if (days === 1) return 'ontem';
    if (days < 7) return 'há ' + days + 'd';
    const w = Math.floor(days / 7);
    return 'há ' + w + 'sem';
  }

  function currentWeekIdx() {
    const wk = Math.floor((Date.now() - PROGRAM_START.getTime()) / (7 * 864e5));
    return Math.min(Math.max(wk, 0), WEEKS.length - 1);
  }

  function fmtDate(iso) {
    const p = iso.split('-');
    return p[2] + '/' + p[1];
  }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  }

  // top set = maior carga; desempate por reps

  function topSet(session) {
    return session.sets.reduce((best, s) =>
      (s.w > best.w || (s.w === best.w && s.r > best.r)) ? s : best, session.sets[0]);
  }

  function lastSession(id) {
    const arr = LOGS[id];
    if (!arr || !arr.length) return null;
    return arr[arr.length - 1];
  }

  // e1RM estimado (Epley)

  function e1rm(w, r) { return (w > 0 && r > 0) ? w * (1 + r / 30) : 0; }

  // melhores marcas históricas do exercício (opcionalmente excluindo uma data)

  function exerciseBests(id, excludeDate) {
    let pr = 0, vol = 0, e1 = 0, secs = 0, reps = 0;
    (LOGS[id] || []).forEach(s => {
      if (excludeDate && s.date === excludeDate) return;
      s.sets.forEach(set => {
        if (set.w > pr) pr = set.w;
        if (set.w * set.r > vol) vol = set.w * set.r;
        const e = e1rm(set.w, set.r); if (e > e1) e1 = e;
        if (set.w > secs) secs = set.w;     // tempo (exercício de segundos)
        if (set.r > reps) reps = set.r;     // reps (peso corporal)
      });
    });
    return { pr: pr, vol: vol, e1: e1, secs: secs, reps: reps };
  }

  // compara séries novas com os recordes anteriores → lista de PRs batidos

  function detectPR(sets, prior, unit) {
    let np = 0, nv = 0, ne = 0, ns = 0, nr = 0;
    sets.forEach(set => {
      np = Math.max(np, set.w);
      nv = Math.max(nv, set.w * set.r);
      ne = Math.max(ne, e1rm(set.w, set.r));
      ns = Math.max(ns, set.w);
      nr = Math.max(nr, set.r);
    });
    const hits = [];
    if (unit === 'seg') {
      if (ns > prior.secs && ns > 0) hits.push('tempo ' + ns + 's');
    } else if (np > 0) {
      if (np > prior.pr) hits.push('carga ' + np + 'kg');
      if (ne > prior.e1 && ne > 0) hits.push('e1RM ' + Math.round(ne) + 'kg');
      if (nv > prior.vol && nv > 0) hits.push('volume ' + nv);
    } else if (nr > prior.reps && nr > 0) {
      hits.push('reps ' + nr);
    }
    return hits;
  }

  // ====== RENDER DO DIA ======

  function sessionE1(s) {
    let e = 0; s.sets.forEach(set => { const v = e1rm(set.w, set.r); if (v > e) e = v; });
    return e > 0 ? Math.round(e) : topSet(s).w;
  }

  function mondayOf(date) {
    const x = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const off = (x.getDay() + 6) % 7; // 0=segunda
    x.setDate(x.getDate() - off);
    return x;
  }

  function isoLocal(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function isoForWeekDay(wkIdx, dayIdx) {
    const d = new Date(PROGRAM_START.getTime() + (wkIdx * 7 + dayIdx) * 864e5);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
