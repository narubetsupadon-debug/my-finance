const fs=require('node:fs'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
function harness(reduced=false){
 const dom=new JSDOM(fs.readFileSync('preview/proportion.html','utf8'),{url:'https://narubetsupadon-debug.github.io/my-finance/preview/proportion.html#summary',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window,$=id=>w.document.getElementById(id);
 $('app').classList.remove('hidden');$('summaryPage').classList.remove('hidden');
 const scheduled=new Map();let next=0,opened=null,report={label:'ตุลาคม',scope:'เฉพาะจ่ายแล้ว',rows:[]},rangeCalls=0,renderCalls=0;
 w.setTimeout=fn=>{const id=++next;scheduled.set(id,fn);return id;};w.clearTimeout=id=>scheduled.delete(id);
 w.matchMedia=()=>({matches:reduced,addEventListener:()=>{}});
 w.createOriginal=()=>{const original=()=>{renderCalls++;$('summaryPieTotal').textContent='฿999';};original.getReport=()=>report;original.setRange=()=>{rangeCalls++;original();};return original;};
 w.createTotalDetails=()=> (...args)=>{opened=args;$('insightDetailDialog').setAttribute('open','');};
 w.eval(fs.readFileSync('preview/proportion-summary.js','utf8').replace(/^import .*$/gm,'').replace(/^export \*.*$/gm,'').replace(/^export /gm,'')+'\nwindow.testRank=rankedExpenses;window.makeSummary=createSummaryRenderer;');
 const renderer=w.makeSummary({$,money:n=>'฿'+Number(n).toFixed(2)});
 return {w,$,renderer,setReport:rows=>{report={...report,rows};renderer();},tick:()=>{const entry=scheduled.entries().next().value;assert(entry,'Expected a single active timer');scheduled.delete(entry[0]);entry[1]();},timers:()=>scheduled.size,opened:()=>opened,report:()=>report,rangeCalls:()=>rangeCalls,close:()=>w.close()};
}
const row=(amount,description,date='2026-10-01',type='expense')=>({amount,description,transaction_date:date,type,reportCategory:'อาหาร'});
(async()=>{
 const h=harness();const {$}=h,active=()=>[...$('summaryHighestTrack').children].find(el=>el.getAttribute('aria-hidden')==='false');
 h.setReport([row(100,'อันดับสาม'),row(300,'อันดับหนึ่ง'),row(200,'อันดับสอง'),row(50,'อันดับสี่'),row(25,'อันดับห้า'),row(10,'อันดับหก'),row(1000,'รายรับ','2026-10-01','income')]);
 assert.equal(active().dataset.rank,'1');assert.equal($('summaryHighestTrack').children.length,6);assert.equal(h.timers(),1);
 for(let i=2;i<=5;i++){h.tick();assert.equal(active().dataset.rank,String(i));assert.equal($('summaryHighestTrack').style.transform,'translateX(-'+((i-1)*100)+'%)');}
 h.tick();assert.equal(active().dataset.rank,'1');assert.equal($('summaryHighestTrack').style.transform,'translateX(-500%)');const end=new h.w.Event('transitionend');Object.defineProperty(end,'propertyName',{value:'transform'});$('summaryHighestTrack').dispatchEvent(end);assert.equal($('summaryHighestTrack').style.transform,'translateX(-0%)');
 $('summaryHighestNext').click();assert.equal(active().dataset.rank,'2');$('summaryHighestPrev').click();assert.equal(active().dataset.rank,'1');$('summaryHighestPause').click();assert.equal(h.timers(),0);$('summaryHighestPause').click();assert.equal(h.timers(),1);
 // Moving cards do not open details. The stable action opens exactly all five in ranked order.
 $('summaryHighest').click();assert.equal(h.opened(),null);$('summaryHighestAll').click();assert.equal(h.opened()[1].length,5);assert.deepEqual(Array.from(h.opened()[1],g=>g.rows[0].description),['อันดับหนึ่ง','อันดับสอง','อันดับสาม','อันดับสี่','อันดับห้า']);assert.equal(h.timers(),0);
 $('insightDetailDialog').removeAttribute('open');$('insightDetailDialog').dispatchEvent(new h.w.Event('close'));assert.equal(h.timers(),1);
 $('summaryPage').classList.add('hidden');h.tick();assert.equal(h.timers(),0);$('summaryPage').classList.remove('hidden');await new Promise(r=>setTimeout(r,0));assert.equal(h.timers(),1);
 h.setReport([row(400,'เพิ่มรายการใหม่'),row(200,'แก้ยอดแล้ว')]);assert.match(active().textContent,/เพิ่มรายการใหม่/);h.tick();assert.match(active().textContent,/แก้ยอดแล้ว/);
 h.setReport([row(200,'เหลือรายการเดียว')]);assert.equal($('summaryHighestControls').hidden,true);assert.equal(h.timers(),0);assert.match(active().textContent,/เหลือรายการเดียว/);assert.equal($('summaryHighestAll').disabled,false);$('summaryHighestAll').click();assert.equal(h.opened()[1].length,1);$('insightDetailDialog').removeAttribute('open');
 h.setReport([]);assert.equal($('summaryHighestAll').disabled,true);assert.equal(h.timers(),0);assert.match($('summaryHighestTrack').textContent,/ยังไม่มี/);
 h.setReport([row(100,'เก่า','2026-10-01'),row(100,'ใหม่','2026-10-02')]);assert.match(active().textContent,/ใหม่/);h.renderer.setRange('3m');assert.equal(h.rangeCalls(),1);assert.equal(h.renderer.getReport(),h.report());assert.equal(active().dataset.rank,'1');
 assert.equal(h.w.testRank([row(NaN,'bad'),row(-10,'bad'),row(0,'bad')]).length,0);h.close();
 const reduced=harness(true);reduced.setReport([row(100,'หนึ่ง'),row(50,'สอง')]);assert.equal(reduced.timers(),0);reduced.$('summaryHighestNext').click();assert.equal(reduced.$('summaryHighestTrack').style.transition,'none');assert.equal(reduced.$('summaryHighestDots').querySelector('[aria-current=true]').getAttribute('aria-label'),'ดูรายจ่ายอันดับ 2');reduced.close();
 console.log('PASS top5 flow: ranked cutoff, sliding/clone loop reset, stable all-details action, zero/one rows, timers, controls, hidden pages/dialogs, data/period refresh, reduced motion and report preservation');
})().catch(error=>{console.error(error);process.exit(1)});
