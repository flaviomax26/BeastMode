const fs=require('fs'),path=require('path'),{JSDOM}=require('jsdom');
const ROOT=path.resolve(__dirname,'..');
let html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8').replace(/<script[^>]*supabase[^>]*><\/script>/g,'');
const js=['data.js','sync.js','workout.js','progress.js','app.js'].map(f=>fs.readFileSync(path.join(ROOT,'js',f),'utf8')).join('\n;\n');
html=html.replace(/<script\s+src="js\/[^"]*"><\/script>/g,'').replace('</body>','<script>'+js+'<\/script></body>');
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://localhost/'});const w=dom.window;
w.dispatchEvent(new w.Event('load'));
let pass=0,fail=0;const ok=(n,c,e)=>{c?(pass++,console.log('  ok  '+n)):(fail++,console.log('FAIL  '+n+(e?'  → '+e:'')));};

// switchView com id inexistente não explode
let threw=false;
try{ w.eval("window.scrollTo=function(){}; switchView('view-week'); switchView('view-nao-existe');"); }
catch(e){ threw=true; console.log('  threw:', e.message); }
ok('switchView desconhecido não lança', !threw);
ok('view ativa continua a válida', w.document.getElementById('view-week').classList.contains('active'));

// escaping: nome de exercício com HTML não injeta elemento vivo
try{ w.eval(`
  DAYS['seg'].sections[0].items[0].n = '<img src=x>Supino reto Smith';
  const sid = slug(DAYS['seg'].sections[0].items[0].n);
  LOGS = {}; LOGS[sid] = [{date:'2026-06-29',sets:[{w:80,r:8,rpe:8}],note:''}];
  renderProgressGroup('seg');
`); }catch(e){ /* canvas jsdom */ }
ok('sem <img> vivo no DOM (escapado)', !w.document.querySelector('#progress-body img'));
ok('texto escapado visível', /&lt;img/.test(w.document.getElementById('progress-body').innerHTML));
console.log('\n'+pass+' pass, '+fail+' fail'); process.exit(fail?1:0);
