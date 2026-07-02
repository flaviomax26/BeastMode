const fs=require('fs'),path=require('path'),{JSDOM}=require('jsdom');
const ROOT=path.resolve(__dirname,'..');
let html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8').replace(/<script[^>]*supabase[^>]*><\/script>/g,'');
const js=['data.js','sync.js','workout.js','progress.js','app.js'].map(f=>fs.readFileSync(path.join(ROOT,'js',f),'utf8')).join('\n;\n');
html=html.replace(/<script\s+src="js\/[^"]*"><\/script>/g,'').replace('</body>','<script>'+js+'<\/script></body>');
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://localhost/'});const w=dom.window;
w.dispatchEvent(new w.Event('load'));
let pass=0,fail=0;const ok=(n,c,e)=>{c?(pass++,console.log('  ok  '+n)):(fail++,console.log('FAIL  '+n+(e?'  → '+e:'')));};
const set=(wv,r,rpe)=>({w:wv,r:r,rpe:rpe});
const sess=(d,sets)=>({date:d,sets:sets,note:''});

// <3 sessões → null
w.eval("LOGS={'supino-reto-smith':[{date:'2026-06-01',sets:[{w:80,r:8,rpe:8}]}]}");
ok('pouco dado → null', w.eval("exerciseTrend('supino-reto-smith')")===null);

// subindo: última supera tudo
w.eval("LOGS={'supino-reto-smith':[{date:'2026-06-01',sets:[{w:80,r:8,rpe:8}]},{date:'2026-06-08',sets:[{w:82,r:8,rpe:8}]},{date:'2026-06-15',sets:[{w:85,r:8,rpe:8}]}]}");
ok('subindo', w.eval("exerciseTrend('supino-reto-smith').dir")==='up', w.eval("JSON.stringify(exerciseTrend('supino-reto-smith'))"));

// estagnado: recorde na 1ª, 3 sessões depois sem bater
w.eval("LOGS={'supino-reto-smith':[{date:'2026-05-01',sets:[{w:90,r:8,rpe:8}]},{date:'2026-05-08',sets:[{w:85,r:8,rpe:8}]},{date:'2026-05-15',sets:[{w:85,r:8,rpe:8}]},{date:'2026-05-22',sets:[{w:84,r:8,rpe:8}]}]}");
ok('estagnado (3+ sem recorde)', w.eval("exerciseTrend('supino-reto-smith').dir")==='stale', w.eval("JSON.stringify(exerciseTrend('supino-reto-smith'))"));

// caindo: última abaixo da anterior, mas não 3 sessões
w.eval("LOGS={'supino-reto-smith':[{date:'2026-06-01',sets:[{w:80,r:8,rpe:8}]},{date:'2026-06-08',sets:[{w:85,r:8,rpe:8}]},{date:'2026-06-15',sets:[{w:82,r:8,rpe:8}]}]}");
ok('caindo (abaixo da última)', w.eval("exerciseTrend('supino-reto-smith').dir")==='down', w.eval("JSON.stringify(exerciseTrend('supino-reto-smith'))"));

// estável: última igual anterior, sem 3 sem recorde
w.eval("LOGS={'supino-reto-smith':[{date:'2026-06-01',sets:[{w:80,r:8,rpe:8}]},{date:'2026-06-08',sets:[{w:85,r:8,rpe:8}]},{date:'2026-06-15',sets:[{w:85,r:8,rpe:8}]}]}");
ok('estável', w.eval("exerciseTrend('supino-reto-smith').dir")==='flat', w.eval("JSON.stringify(exerciseTrend('supino-reto-smith'))"));

// peso corporal usa reps
w.eval("LOGS={'negativa-pull-up':[{date:'2026-06-01',sets:[{w:0,r:3,rpe:8}]},{date:'2026-06-08',sets:[{w:0,r:4,rpe:8}]},{date:'2026-06-15',sets:[{w:0,r:5,rpe:8}]}]}");
ok('peso corporal subindo por reps', w.eval("exerciseTrend('negativa-pull-up').dir")==='up', w.eval("JSON.stringify(exerciseTrend('negativa-pull-up'))"));

// render mostra a pill
w.eval("LOGS={'supino-reto-smith':[{date:'2026-05-01',sets:[{w:90,r:8,rpe:8}]},{date:'2026-05-08',sets:[{w:85,r:8,rpe:8}]},{date:'2026-05-15',sets:[{w:85,r:8,rpe:8}]},{date:'2026-05-22',sets:[{w:84,r:8,rpe:8}]}]}");
w.eval("renderProgressGroup('seg')");
const html2=w.document.getElementById('progress-body').innerHTML;
ok('render mostra pill estagnado', /prog-trend dir-stale/.test(html2) && /estagnado/.test(html2));

console.log('\n'+pass+' pass, '+fail+' fail');
process.exit(fail?1:0);
