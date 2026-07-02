const fs=require('fs'),path=require('path'),{JSDOM}=require('jsdom');
const ROOT=path.resolve(__dirname,'..');
let html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8').replace(/<script[^>]*supabase[^>]*><\/script>/g,'');
const js=['data.js','sync.js','workout.js','progress.js','app.js'].map(f=>fs.readFileSync(path.join(ROOT,'js',f),'utf8')).join('\n;\n');
html=html.replace(/<script\s+src="js\/[^"]*"><\/script>/g,'').replace('</body>','<script>'+js+'<\/script></body>');
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://localhost/'});const w=dom.window;
w.dispatchEvent(new w.Event('load'));
let pass=0,fail=0;const ok=(n,c,e)=>{c?(pass++,console.log('  ok  '+n)):(fail++,console.log('FAIL  '+n+(e?'  → '+e:'')));};
let lastToast=null; w.eval('toast=function(m){window.__t=m;}'); const lt=()=>w.eval('window.__t');

w.eval('CHK=[]; window.__t=null;');
w.eval("switchView('view-checkin')");
ok('view-checkin renderiza form', /chk-form/.test(w.document.getElementById('checkin-box').innerHTML));
ok('4 grupos de opções', (w.document.getElementById('checkin-box').innerHTML.match(/chk-opts/g)||[]).length===4);

// salvar sem responder → toast pede
w.eval("window.__t=null; saveCheckin();");
ok('save vazio avisa', /4 opções/.test(lt()||''), lt());
ok('nada salvo', w.eval('CHK.length')===0);

// responde os 4 + nota e salva
w.eval(`
  const box=document.getElementById('checkin-box');
  [['aderencia','todos'],['sono','bom'],['energia','alta'],['dor','nenhuma']].forEach(([k,v])=>{
    box.querySelector('.chk-opts[data-k="'+k+'"] .chk-opt[data-v="'+v+'"]').classList.add('on');
  });
  box.querySelector('#chk-note').value='semana boa';
  window.__t=null; saveCheckin();
`);
ok('save completo grava 1', w.eval('CHK.length')===1, w.eval('JSON.stringify(CHK)'));
ok('toast salvo', /Check-in salvo/.test(lt()||''));
ok('dados corretos', w.eval("CHK[0].aderencia==='todos'&&CHK[0].sono==='bom'&&CHK[0].energia==='alta'&&CHK[0].dor==='nenhuma'&&CHK[0].nota==='semana boa'"), w.eval('JSON.stringify(CHK[0])'));
ok('week é segunda ISO', /^\d{4}-\d{2}-\d{2}$/.test(w.eval('CHK[0].week')) && new Date(w.eval('CHK[0].week')+'T12:00').getDay()===1, w.eval('CHK[0].week'));

// re-render mostra histórico + form prefilled (editável) + sub do menu
w.eval('renderCheckin()');
ok('histórico aparece', /chk-hist/.test(w.document.getElementById('checkin-box').innerHTML));
ok('prefill marca opção salva', /chk-opt on[^>]*data-v="todos"|data-v="todos"[^>]*class="chk-opt on"/.test(w.document.getElementById('checkin-box').innerHTML)|| !!w.document.querySelector('.chk-opts[data-k="aderencia"] .chk-opt.on'));
ok('botão vira Atualizar', /Atualizar check-in/.test(w.document.getElementById('checkin-box').innerHTML));
ok('menu sub = respondida', (w.eval("(function(){updateCheckinMenu();return document.getElementById('menu-checkin-sub').textContent})()"))==='✓ Semana respondida', w.eval("document.getElementById('menu-checkin-sub').textContent"));

// re-salvar mesma semana substitui (não duplica)
w.eval(`
  const box=document.getElementById('checkin-box');
  box.querySelector('.chk-opts[data-k="aderencia"] .chk-opt[data-v="faltei1"]').classList.add('on');
  box.querySelector('.chk-opts[data-k="aderencia"] .chk-opt[data-v="todos"]').classList.remove('on');
  saveCheckin();
`);
ok('re-save não duplica', w.eval('CHK.length')===1);
ok('re-save atualiza valor', w.eval("CHK[0].aderencia")==='faltei1', w.eval("CHK[0].aderencia"));

// editar semana PASSADA via histórico
w.eval("CHK=[{week:'2026-06-22',date:'2026-06-22',aderencia:'todos',sono:'bom',energia:'alta',dor:'nenhuma',nota:'velha'}]; chkWeek=null; renderCheckin();");
ok('histórico tem botão editar', (w.document.getElementById('checkin-box').innerHTML.match(/chk-hist[\s\S]*?hist-edit/)||[]).length>0);
// clica editar da semana passada
w.eval("document.querySelector('.chk-hist .hist-edit').click();");
ok('entra em modo edição (banner)', /editando/.test(w.document.getElementById('checkin-box').innerHTML));
ok('prefill da semana passada', !!w.document.querySelector('.chk-opts[data-k="aderencia"] .chk-opt.on'));
// muda algo e salva → atualiza a semana 22/06, não cria semana atual
w.eval(`
  const box=document.getElementById('checkin-box');
  box.querySelector('.chk-opts[data-k="sono"] .chk-opt.on').classList.remove('on');
  box.querySelector('.chk-opts[data-k="sono"] .chk-opt[data-v="ruim"]').classList.add('on');
  saveCheckin();
`);
ok('editou a semana passada (1 entrada)', w.eval('CHK.length')===1, w.eval('JSON.stringify(CHK)'));
ok('semana preservada 22/06', w.eval("CHK[0].week")==='2026-06-22');
ok('valor atualizado (sono ruim)', w.eval("CHK[0].sono")==='ruim');
ok('volta pra semana atual após salvar', w.eval('chkWeek')===null);

console.log('\n'+pass+' pass, '+fail+' fail');
process.exit(fail?1:0);
