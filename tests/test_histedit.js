const fs=require('fs'),path=require('path'),{JSDOM}=require('jsdom');
const ROOT=path.resolve(__dirname,'..');
let html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8').replace(/<script[^>]*supabase[^>]*><\/script>/g,'');
const js=['data.js','sync.js','workout.js','progress.js','app.js'].map(f=>fs.readFileSync(path.join(ROOT,'js',f),'utf8')).join('\n;\n');
html=html.replace(/<script\s+src="js\/[^"]*"><\/script>/g,'').replace('</body>','<script>'+js+'<\/script></body>');
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://localhost/'});const w=dom.window;
w.dispatchEvent(new w.Event('load'));
let pass=0,fail=0;const ok=(n,c,e)=>{c?(pass++,console.log('  ok  '+n)):(fail++,console.log('FAIL  '+n+(e?'  → '+e:'')));};
w.confirm=()=>true; w.alert=()=>{}; w.eval('toast=function(){};');

// seed rosca-corda com sessão antiga 27/06 (rpe 0 numa série) + hoje
w.eval("LOGS={'rosca-corda':[{date:'2026-06-27',sets:[{w:20,r:12,rpe:0}],note:'antiga'}]};");
// abre edição da data passada
w.eval("openLog('rosca-corda','Rosca corda','2026-06-27')");
ok('sheetDate = data passada', w.eval('sheetDate')==='2026-06-27', w.eval('sheetDate'));
ok('carregou a série existente (1 row)', w.document.querySelectorAll('#set-list .set-row').length===1);
ok('título mostra a data', /27\/06/.test(w.document.getElementById('sheet-title').textContent), w.document.getElementById('sheet-title').textContent);
ok('nota pré-carregada', w.document.getElementById('log-note').value==='antiga');
// corrige rpe da série pra 8 e salva
w.eval(`
  const r=document.querySelectorAll('#set-list .set-row')[0];
  r.querySelector('.set-w').value='20'; r.querySelector('.set-r').value='12';
  r.querySelector('.set-rpe').value='8';
  [r.querySelector('.set-w'),r.querySelector('.set-r'),r.querySelector('.set-rpe')].forEach(e=>e.dispatchEvent(new window.Event('input',{bubbles:true})));
  r.querySelector('.set-rpe').dispatchEvent(new window.Event('change',{bubbles:true}));
  saveLog();
`);
ok('salvou na data 27/06 (não criou hoje)', w.eval("LOGS['rosca-corda'].length")===1, w.eval("JSON.stringify(LOGS['rosca-corda'])"));
ok('rpe corrigido pra 8', w.eval("LOGS['rosca-corda'][0].sets[0].rpe")===8, w.eval("JSON.stringify(LOGS['rosca-corda'][0])"));
ok('data preservada', w.eval("LOGS['rosca-corda'][0].date")==='2026-06-27');

// novo treino (sem editDate) usa hoje
w.eval("openLog('rosca-corda','Rosca corda')");
ok('sem editDate → sheetDate = hoje', w.eval('sheetDate')===w.eval('todayISO()'));

console.log('\n'+pass+' pass, '+fail+' fail'); process.exit(fail?1:0);
