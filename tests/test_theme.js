const fs=require('fs'),path=require('path'),{JSDOM}=require('jsdom');
const ROOT=path.resolve(__dirname,'..');
let html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8').replace(/<script[^>]*supabase[^>]*><\/script>/g,'');
const js=['data.js','sync.js','workout.js','progress.js','app.js'].map(f=>fs.readFileSync(path.join(ROOT,'js',f),'utf8')).join('\n;\n');
html=html.replace(/<script\s+src="js\/[^"]*"><\/script>/g,'').replace('</body>','<script>'+js+'<\/script></body>');
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://localhost/'});const w=dom.window;
w.dispatchEvent(new w.Event('load'));
let pass=0,fail=0;const ok=(n,c,e)=>{c?(pass++,console.log('  ok  '+n)):(fail++,console.log('FAIL  '+n+(e?'  → '+e:'')));};
const dt=()=>w.document.documentElement.getAttribute('data-theme');
const meta=()=>w.document.querySelector('meta[name=theme-color]').getAttribute('content');

// claro
w.eval("setTheme('light')");
ok('data-theme=light', dt()==='light', dt());
ok('persistiu light', w.localStorage.getItem('beastmode.theme')==='light');
ok('meta theme-color claro', meta()==='#F2F2F7', meta());
ok('seg marca Claro', !!w.document.querySelector('.theme-opt[data-theme-pref="light"].on'));

// escuro
w.eval("setTheme('dark')");
ok('data-theme=dark', dt()==='dark', dt());
ok('meta theme-color escuro', meta()==='#000000', meta());

// auto segue sistema (stub matchMedia)
w.matchMedia=(q)=>({matches:true, addEventListener(){}, removeEventListener(){}}); // sistema=claro
w.eval("setTheme('auto')");
ok('auto + sistema claro → light', dt()==='light', dt());
w.matchMedia=(q)=>({matches:false, addEventListener(){}, removeEventListener(){}}); // sistema=escuro
w.eval("applyTheme('auto')");
ok('auto + sistema escuro → dark', dt()==='dark', dt());
ok('auto persistido', w.localStorage.getItem('beastmode.theme')==='auto');

// paleta light existe no CSS
const css=fs.readFileSync(path.join(ROOT,'css','styles.css'),'utf8');
ok('CSS tem html[data-theme=light]', /html\[data-theme="light"\]\s*\{[^}]*--bg:\s*#F2F2F7/.test(css));

console.log('\n'+pass+' pass, '+fail+' fail');
process.exit(fail?1:0);
