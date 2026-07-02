const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const ROOT = path.resolve(__dirname, '..');
let html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').replace(/<script[^>]*supabase[^>]*><\/script>/g, '');
const js = ['data.js', 'sync.js', 'workout.js', 'progress.js', 'app.js'].map(f => fs.readFileSync(path.join(ROOT, 'js', f), 'utf8')).join('\n;\n');
html = html.replace(/<script\s+src="js\/[^"]*"><\/script>/g, '').replace('</body>', '<script>' + js + '<\/script></body>');

const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://localhost/' });
const w = dom.window;
w.dispatchEvent(new w.Event('load'));

let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  ok  ' + name); }
  else { fail++; console.log('FAIL  ' + name + (extra ? '  → ' + extra : '')); }
}

// semana corrente calculada pelo próprio app (datas relativas → roda em qualquer dia/CI)
const dates = w.eval('weekDatesCur()');
ok('weekDatesCur retorna 7 dias', dates.length === 7);
ok('começa numa segunda', new w.Date(dates[0] + 'T12:00').getDay() === 1, dates[0]);

// seed: supino (Peito, kg) 2 sessões na semana + 1 antiga mais fraca (→ PR por e1RM)
// negativa pull-up (Costas, rep) 1 na semana + 1 antiga com menos reps (→ PR por reps)
// prancha (Core, seg) só sessão antiga (fora da semana; não conta volume)
w.eval(`
  const ds = weekDatesCur();
  LOGS = {
    'supino-reto-smith': [
      { date: '2020-01-06', sets: [{ w: 70, r: 8, rpe: 8 }], note: '' },
      { date: ds[0], sets: [{w:80,r:8,rpe:8},{w:80,r:8,rpe:8},{w:80,r:8,rpe:8},{w:80,r:8,rpe:8}], note: '' },
      { date: ds[2], sets: [{w:80,r:8,rpe:8},{w:80,r:8,rpe:8},{w:80,r:8,rpe:8},{w:80,r:8,rpe:8}], note: '' }
    ],
    'negativa-pull-up': [
      { date: '2020-01-08', sets: [{ w: 0, r: 3, rpe: 8 }], note: '' },
      { date: ds[2], sets: [{ w: 0, r: 5, rpe: 8 }, { w: 0, r: 4, rpe: 8 }], note: '' }
    ],
    'prancha-frontal': [
      { date: '2020-01-07', sets: [{ w: 60, r: 0, rpe: 8 }], note: '' }
    ]
  };
  DONE = [ds[0], ds[2]];
`);

const s = w.eval('weekStats()');
ok('séries de Peito na semana = 8', s.doneSets['Peito'] === 8, JSON.stringify(s.doneSets));
ok('séries de Costas na semana = 2', s.doneSets['Costas'] === 2, JSON.stringify(s.doneSets));
ok('Core sem volume na semana', !s.doneSets['Core']);
ok('tonelagem = 80×8×8 = 5120', s.ton === 5120, s.ton);
ok('2 PRs detectados', s.prs.length === 2, JSON.stringify(s.prs));
ok('PR do supino por nome', s.prs.some(p => /Supino reto/i.test(p)), JSON.stringify(s.prs));

// PR não dispara sem histórico anterior (primeira vez não é recorde)
w.eval(`LOGS = { 'supino-reto-smith': [ { date: weekDatesCur()[0], sets: [{w:80,r:8,rpe:8}], note: '' } ] }; DONE = [];`);
ok('primeira sessão não vira PR', w.eval('weekStats()').prs.length === 0);

// planejado por grupo deriva do programa
const planned = w.eval('plannedWeekSets()');
ok('Peito planejado > 0', planned['Peito'] > 0, JSON.stringify(planned));
ok('Quadríceps planejado > 0', planned['Quadríceps'] > 0);

// render: barras + resumo no DOM
w.eval("LOGS = { 'supino-reto-smith': [ { date: weekDatesCur()[0], sets: [{w:80,r:8,rpe:8},{w:80,r:8,rpe:8}], note: '' } ] }; DONE=[weekDatesCur()[0]]; renderWeekSummary();");
const sumHtml = w.document.getElementById('week-summary').innerHTML;
const volHtml = w.document.getElementById('week-volume').innerHTML;
ok('resumo NÃO duplica dias (Consistência é a fonte)', !/treinos concluídos/.test(sumHtml), sumHtml.slice(0, 120));
ok('resumo mostra tonelagem', /1,3 t|1280 kg/.test(sumHtml), sumHtml.match(/stat-value">[^<]*/g));
ok('barra do Peito com 2/N', /Peito[\s\S]*?2\//.test(volHtml));
ok('barras usam cor do grupo', /wk-fill/.test(volHtml) && /background:/.test(volHtml));

console.log('\n' + pass + ' pass, ' + fail + ' fail');
process.exit(fail ? 1 : 0);
