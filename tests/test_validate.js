const fs=require('fs'),path=require('path'),{JSDOM}=require('jsdom');
const ROOT=path.resolve(__dirname,'..');
let html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8').replace(/<script[^>]*supabase[^>]*><\/script>/g,'');
const js=['data.js','sync.js','workout.js','progress.js','app.js'].map(f=>fs.readFileSync(path.join(ROOT,'js',f),'utf8')).join('\n;\n');
html=html.replace(/<script\s+src="js\/[^"]*"><\/script>/g,'').replace('</body>','<script>'+js+'<\/script></body>');
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://localhost/'});const w=dom.window;
w.dispatchEvent(new w.Event('load'));
let pass=0,fail=0;const ok=(n,c,e)=>{c?(pass++,console.log('  ok  '+n)):(fail++,console.log('FAIL  '+n+(e?'  → '+e:'')));};

let confirmMsg=null,confirmRet=false,lastToast=null;
w.confirm=(m)=>{confirmMsg=m;return confirmRet;};
w.alert=()=>{};
w.eval('window.__toastOrig=typeof toast;');
// intercepta toast global
w.eval('toast=function(m){window.__lastToast=m;};');

function openKg(){ w.eval('LOGS={};'); w.eval("openLog('supino-reto-smith','Supino reto Smith')"); }
function rows(){return w.document.querySelectorAll('#set-list .set-row');}
function setRow(i,wv,rv,pv){const r=rows()[i];const ww=r.querySelector('.set-w'),rr=r.querySelector('.set-r'),pp=r.querySelector('.set-rpe');
  ww.value=wv;rr.value=rv;pp.value=pv;[ww,rr,pp].forEach(el=>el.dispatchEvent(new w.Event('input',{bubbles:true})));}
const lt=()=>w.eval('window.__lastToast');

// caso 1: tudo 0 tocado → não salva, avisa toast
openKg();confirmMsg=null;w.eval('window.__lastToast=null;');
setRow(0,'0','0','0');
w.eval('saveLog()');
ok('zeros não salvam', !w.eval("LOGS['supino-reto-smith']"));
ok('zeros disparam toast de aviso', /Preencha/.test(lt()||''), lt());
ok('zeros não disparam confirm de salvar', confirmMsg===null);

// caso 1b: 0 pré-preenchido SEM digitar (touched=0) → ainda avisa, não fecha mudo
openKg();confirmMsg=null;w.eval('window.__lastToast=null;');
{const r=rows()[0];r.querySelector('.set-w').value='0';r.querySelector('.set-r').value='0';r.querySelector('.set-rpe').value='0';}
w.eval('saveLog()');
ok('zeros não-tocados avisam (não fecha mudo)', /valores > 0/.test(lt()||''), lt());
ok('zeros não-tocados não salvam', !w.eval("LOGS['supino-reto-smith']"));

// caso 1c: folha totalmente em branco (todas as linhas) → fecha sem toast
openKg();w.eval('window.__lastToast=null;');
rows().forEach(r=>{r.querySelector('.set-w').value='';r.querySelector('.set-r').value='';r.querySelector('.set-rpe').value='';});
w.eval('saveLog()');
ok('folha em branco não dispara toast', lt()===null, lt());

// caso 2: carga 0, reps/rpe ok → confirm por carga faltando
openKg();confirmMsg=null;confirmRet=false;
setRow(0,'0','8','7');
w.eval('saveLog()');
ok('carga 0 marca incompleta (confirm)', /faltando/.test(confirmMsg||''), confirmMsg);
ok('set-w recebe field-missing', !!w.document.querySelector('.set-w.field-missing'));
ok('carga 0 negada não salva', !w.eval("LOGS['supino-reto-smith']"));

// caso 3: completo → salva sem confirm
openKg();confirmMsg=null;
setRow(0,'80','8','7');
w.eval('saveLog()');
ok('completo salva sem confirm', confirmMsg===null, confirmMsg);
ok('valores corretos', w.eval("JSON.stringify(LOGS['supino-reto-smith'][0].sets[0])")==='{"w":80,"r":8,"rpe":7}', w.eval("JSON.stringify((LOGS['supino-reto-smith']||[{}])[0].sets&&LOGS['supino-reto-smith'][0].sets[0])"));

// caso 4: aceitar incompleta (confirm true) salva
openKg();confirmMsg=null;confirmRet=true;
setRow(0,'0','5','5');
w.eval('saveLog()');
ok('aceitar incompleta salva', w.eval("LOGS['supino-reto-smith'] && LOGS['supino-reto-smith'][0].sets.length===1"));

// caso 4b: 4 válidas + 1 zerada (cenário do vídeo) → AVISA via confirm, salva 4, dropa a zerada
w.eval('LOGS={};');w.eval("openLog('triceps-corda','Triceps corda')");confirmMsg=null;confirmRet=false;
while(rows().length<5) w.eval('addSetRow("","","")');
setRow(0,'10','10','7');setRow(1,'10','12','8');setRow(2,'10','12','8');setRow(3,'10','12','8');
setRow(4,'0','0','0'); // 5ª série zerada (+série)
w.eval('saveLog()');
ok('5ª zerada dispara confirm (avisa)', /Série\(s\) 5/.test(confirmMsg||''), confirmMsg);
ok('confirm negado não salva nada', !w.eval("LOGS['triceps-corda']"));
ok('5ª marca field-missing', !!w.document.querySelectorAll('#set-list .set-row')[4].querySelector('.field-missing'));
// agora aceita: salva as 4 válidas, dropa a 5ª
confirmRet=true;w.eval('saveLog()');
ok('aceito salva 4 séries (5ª dropada)', w.eval("LOGS['triceps-corda'] && LOGS['triceps-corda'][0].sets.length===4"), w.eval("LOGS['triceps-corda']&&LOGS['triceps-corda'][0].sets.length"));
ok('séries salvas batem input', w.eval("JSON.stringify(LOGS['triceps-corda'][0].sets)")==='[{"w":10,"r":10,"rpe":7},{"w":10,"r":12,"rpe":8},{"w":10,"r":12,"rpe":8},{"w":10,"r":12,"rpe":8}]', w.eval("JSON.stringify(LOGS['triceps-corda'][0].sets)"));

// caso 5: rep unit (negativa) — sem carga, reps obrigatória, salva ok
w.eval('LOGS={};');w.eval("openLog('negativa-pull-up','Negativa Pull-up')");confirmMsg=null;confirmRet=false;
{const r=rows()[0];const rr=r.querySelector('.set-r'),pp=r.querySelector('.set-rpe');rr.value='3';pp.value='8';[rr,pp].forEach(el=>el.dispatchEvent(new w.Event('input',{bubbles:true})));}
w.eval('saveLog()');
ok('rep unit salva sem exigir carga', confirmMsg===null && w.eval("LOGS['negativa-pull-up'] && LOGS['negativa-pull-up'][0].sets.length===1"), confirmMsg);

// caso 6: RPE é select fixo 6–10
openKg();
{const sel=rows()[0].querySelector('select.set-rpe');
 ok('rpe é select', !!sel);
 const vals=Array.from(sel.options).map(o=>o.value);
 ok('opções rpe = ,6,7,8,9,10', JSON.stringify(vals)==='["","6","7","8","9","10"]', JSON.stringify(vals));
 sel.value='11'; ok('não aceita 11 (fora 6-10)', sel.value!=='11', sel.value);}

// caso 7: sanitizer bloqueia zero em carga/reps
openKg();
function typeW(i,v){const x=rows()[i].querySelector('.set-w');x.value=v;x.dispatchEvent(new w.Event('input',{bubbles:true}));return x.value;}
function typeR(i,v){const x=rows()[i].querySelector('.set-r');x.value=v;x.dispatchEvent(new w.Event('input',{bubbles:true}));return x.value;}
ok("carga '0' vira vazio", typeW(0,'0')==='', JSON.stringify(typeW(0,'0')));
ok("carga '05' vira '5'", typeW(0,'05')==='5', typeW(0,'05'));
ok("carga '0.5' preservada", typeW(0,'0.5')==='0.5', typeW(0,'0.5'));
ok("reps '0' vira vazio", typeR(0,'0')==='', JSON.stringify(typeR(0,'0')));
ok("reps '012' vira '12'", typeR(0,'012')==='12', typeR(0,'012'));

console.log('\n'+pass+' pass, '+fail+' fail');
process.exit(fail?1:0);
