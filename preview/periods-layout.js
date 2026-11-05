// Summary-only presentation. Existing financial renderers and actions are retained.
function initializeSummaryLayout(){
 document.documentElement.classList.add('summary-layout-ready');
 const $=id=>document.getElementById(id),page=$('summaryPage');if(!page)return;
 const hero=page.querySelector('.summary-hero'),heading=hero.querySelector('h2'),year=$('summaryYear'),month=$('summaryMonth');
 const header=document.createElement('header');header.className='make-summary-header';
 const back=document.createElement('button');back.type='button';back.className='make-summary-back';back.textContent='‹';back.setAttribute('aria-label','กลับภาพรวม');back.onclick=()=>window.dispatchEvent(new CustomEvent('finance:navigate',{detail:'dashboard'}));
 const picker=document.createElement('div');picker.className='make-summary-month';picker.setAttribute('role','group');picker.setAttribute('aria-label','เลือกเดือนและปี');
 const calendar=document.createElement('span');calendar.setAttribute('aria-hidden','true');calendar.innerHTML='<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 2v6M17 2v6M3 11h18M7 15h3M14 15h3"/></svg>';
 picker.append(month,year,calendar);heading.textContent='รายรับรายจ่าย';header.append(back,picker,heading);hero.before(header);hero.classList.add('hidden');
 const now=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 if(!month.querySelector('option[value=\"'+now.slice(5,7)+'\"]')){for(let i=1;i<=12;i++){const opt=document.createElement('option');opt.value=String(i).padStart(2,'0');opt.textContent=String(i);month.append(opt);}}
 if(!year.options.length){const opt=document.createElement('option');opt.value=now.slice(0,4);opt.textContent=String(Number(now.slice(0,4))+543);year.append(opt);}
 month.value=now.slice(5,7);year.value=now.slice(0,4);
 for(const option of month.options){if(option.value!=='all'){const text=new Intl.DateTimeFormat('th-TH',{month:'short'}).format(new Date(2026,Number(option.value)-1,1));if(option.textContent!==text)option.textContent=text;}}
 for(const option of year.options){const text=String(Number(option.value)+543);if(option.textContent!==text)option.textContent=text;}
 const formatPicker=()=>{for(const option of month.options){if(option.value!=='all'){const text=new Intl.DateTimeFormat('th-TH',{month:'short'}).format(new Date(2026,Number(option.value)-1,1));if(option.textContent!==text)option.textContent=text;}}for(const option of year.options){const text=String(Number(option.value)+543);if(option.textContent!==text)option.textContent=text;}};
 for(const select of [month,year])new MutationObserver(formatPicker).observe(select,{childList:true});
 const rangePanel=document.createElement('div');rangePanel.className='summary-period-control';
 const rangeLabel=document.createElement('label');rangeLabel.htmlFor='summaryRangeSelect';rangeLabel.textContent='ช่วงเวลา';
 const rangeSelect=document.createElement('select');rangeSelect.id='summaryRangeSelect';
 for(const [value,text]of [['month','เดือนนี้'],['3m','3 เดือนล่าสุด'],['6m','6 เดือนล่าสุด'],['year','ปีนี้'],['custom','เลือกเดือน / ปีเอง'],['dates','ระบุช่วงวันที่']]){const option=document.createElement('option');option.value=value;option.textContent=text;rangeSelect.append(option);}
 const rangeHint=document.createElement('small');rangeHint.className='summary-range-hint';rangeHint.textContent='ช่วง 3 และ 6 เดือน นับรวมเดือนปัจจุบัน';
 const periodText=$('summaryPeriodText');periodText.setAttribute('role','status');periodText.setAttribute('aria-live','polite');
 rangePanel.append(rangeLabel,rangeSelect,periodText,rangeHint);header.after(rangePanel);
 const dateControls=document.createElement('div');dateControls.className='summary-date-controls';dateControls.hidden=true;
 const startLabel=document.createElement('label');startLabel.textContent='ตั้งแต่วันที่';startLabel.htmlFor='summaryFromDate';
 const from=document.createElement('input');from.type='date';from.id='summaryFromDate';from.min='1900-01-01';from.max='2199-12-31';from.value=now.slice(0,7)+'-01';startLabel.append(from);
 const endLabel=document.createElement('label');endLabel.textContent='ถึงวันที่';endLabel.htmlFor='summaryToDate';
 const to=document.createElement('input');to.type='date';to.id='summaryToDate';to.min=from.min;to.max=from.max;to.value=now;endLabel.append(to);
 const apply=document.createElement('button');apply.type='button';apply.textContent='ใช้ช่วงวันที่นี้';apply.className='btn soft';
 const error=document.createElement('small');error.className='summary-date-error';error.setAttribute('role','alert');
 dateControls.append(startLabel,endLabel,apply,error);rangePanel.append(dateControls);
 const chips=$('summaryRangeChips');
 const datesChip=document.createElement('button');datesChip.type='button';datesChip.dataset.summaryRange='dates';datesChip.hidden=true;datesChip.textContent='ระบุช่วงวันที่';chips.append(datesChip);
 const validDates=()=>{const ok=from.value&&to.value&&from.checkValidity()&&to.checkValidity()&&from.value<=to.value;error.textContent=ok?'':'เลือกวันเริ่มต้นและสิ้นสุดให้ครบ โดยวันสิ้นสุดต้องไม่ก่อนวันเริ่มต้น';return ok;};apply.onclick=()=>{if(validDates())datesChip.click();};
 const syncRange=()=>{const selected=chips.querySelector('[aria-pressed="true"],.active')?.dataset.summaryRange||'month';rangeSelect.value=selected;dateControls.hidden=selected!=='dates';picker.hidden=!['month','custom'].includes(selected);rangeHint.hidden=!['3m','6m','year'].includes(selected);rangeHint.textContent=selected==='year'?'ปีปฏิทินปัจจุบัน · ใช้สถานะรายการตามตัวกรอง':'ช่วง '+(selected==='3m'?'3':'6')+' เดือน นับรวมเดือนปัจจุบัน';};
 rangeSelect.onchange=()=>{if(rangeSelect.value==='dates'){dateControls.hidden=false;if(validDates())datesChip.click();return;}const chip=chips.querySelector('[data-summary-range="'+rangeSelect.value+'"]');if(rangeSelect.value==='month'){month.value=now.slice(5,7);year.value=now.slice(0,4);}chip?.click();syncRange();};
 new MutationObserver(syncRange).observe(chips,{subtree:true,attributes:true,attributeFilter:['aria-pressed','class']});syncRange();
 const custom=page.querySelector('[data-summary-range="custom"]');
 for(const select of [month,year])select.addEventListener('change',()=>custom.click(),true);
 const kpis=page.querySelector('.summary-kpi-grid'),balance=kpis.querySelector('.balance-kpi');kpis.classList.add('make-summary-totals');
 const caption=document.createElement('p');caption.className='make-summary-caption';
 const updateScope=()=>{caption.textContent=$('summaryStatus').value==='paid'?'เฉพาะรับ/จ่ายแล้วถึงวันนี้':'รวมรอดำเนินการและวันที่อนาคต';};updateScope();$('summaryStatus').addEventListener('change',updateScope);kpis.after(caption);
 const card=page.querySelector('.summary-share-card'),highest=document.createElement('section');highest.className='make-summary-highest';
 const highestHeading=card.querySelector('.highest-heading');highestHeading.querySelector('h4').textContent='รายจ่ายสูงสุด';highest.append(highestHeading,$('summaryHighest'));caption.after(highest);
 const pause=$('summaryHighestPause');if(pause.getAttribute('aria-pressed')!=='true')pause.click();
 const tab=document.createElement('div');tab.className='make-summary-tabs';
 const categories=document.createElement('button');categories.type='button';categories.textContent='หมวดหมู่';categories.className='is-active';categories.setAttribute('aria-pressed','true');
 const detailsButton=document.createElement('button');detailsButton.type='button';detailsButton.textContent='ยอดแยก';detailsButton.setAttribute('aria-expanded','false');
 tab.append(detailsButton,categories);highest.after(tab);
 const extra=document.createElement('details');extra.className='make-summary-extra';const extraTitle=document.createElement('summary');extraTitle.textContent='ตัวกรองและรายละเอียดเพิ่มเติม';extra.append(extraTitle);
 const exportBar=page.querySelector('.summary-export-toolbar'),breakdown=page.querySelector('.summary-details');extra.append(exportBar,$('summaryPdfStatus'),$('summaryScope'),balance,breakdown,$('summaryHighestControls'));page.append(extra);
 detailsButton.onclick=()=>{extra.open=true;breakdown.open=true;detailsButton.setAttribute('aria-expanded','true');extra.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});};
 categories.onclick=()=>{extra.open=false;detailsButton.setAttribute('aria-expanded','false');card.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});};
 // Match chart/list colors and the thick, continuous ring of the reference screen.
 const colors=['#48c5cf','#b4e4e8','#8eb8ee','#afa0da','#efb4cf','#f6aaa0'];
 const paths={home:'M3 10l9-7 9 7M5 9v11h14V9M10 20v-7h4v7',food:'M4 11h16c0 6-4 9-8 9s-8-3-8-9M8 4v4M12 3v5M16 4v4',bag:'M5 8h14l2 13H3L5 8M8 9V6a4 4 0 0 1 8 0v3',cup:'M4 7h12v9a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V7M16 8h2a3 3 0 0 1 0 6h-2M7 3v2M11 3v2',car:'M5 5h14l2 8v7h-3v-3H6v3H3v-7l2-8M3 12h18M7 15h2M15 15h2'};
 const decorateList=()=>document.querySelectorAll('#foodSubcategoryBreakdown>.summary-category').forEach((row,i)=>{
  const dot=row.querySelector('.summary-category-dot'),name=row.querySelector('.summary-category-name').textContent;
  dot.style.background=colors[i%colors.length];const key=/ห้อง|บ้าน/.test(name)?'home':/อาหาร/.test(name)?'food':/กาแฟ/.test(name)?'cup':/เดินทาง|รถ/.test(name)?'car':'bag';
  if(!dot.querySelector('svg'))dot.innerHTML='<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="'+paths[key]+'"/></svg>';
 });
 if(window.Chart){Chart.register({id:'my-finance-summary-reference',beforeUpdate(chart){if(chart.canvas.id!=='categoryPieChart')return;for(const data of chart.data.datasets){data.backgroundColor=data.data.map((_,i)=>colors[i%colors.length]);data.borderWidth=0;data.borderRadius=0;data.spacing=0;}chart.options.cutout='55%';},afterUpdate(chart){if(chart.canvas.id!=='categoryPieChart')return;decorateList();if($('summaryCenterLabel').textContent==='รายจ่ายรวม')$('summaryCenterLabel').textContent='รวม';},afterDatasetsDraw(chart){
  if(chart.canvas.id!=='categoryPieChart'||document.body.classList.contains('privacy-mode'))return;const values=chart.data.datasets[0].data,total=values.reduce((a,b)=>a+Number(b),0),ctx=chart.ctx;
  chart.getDatasetMeta(0).data.forEach((arc,i)=>{const pct=total?Number(values[i])/total*100:0;if(pct<8)return;const {x,y,startAngle,endAngle,innerRadius,outerRadius}=arc.getProps(['x','y','startAngle','endAngle','innerRadius','outerRadius'],true),angle=(startAngle+endAngle)/2,r=(innerRadius+outerRadius)/2;ctx.save();ctx.fillStyle=i===1?'#467d83':'#ffffff';ctx.font='500 10px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(pct.toFixed(0)+'%',x+Math.cos(angle)*r,y+Math.sin(angle)*r);ctx.restore();});
 }});const chart=Chart.getChart($('categoryPieChart'));if(chart)chart.update('none');}
 // Renderer keeps all query/filter behavior; only activate the compact month controls.
 chips.querySelector('[data-summary-range="month"]').click();decorateList();

(()=>{
const page=document.getElementById('summaryPage'),$=id=>document.getElementById(id);


const caption=page.querySelector('.make-summary-caption');
const net=document.createElement('div');net.className='summary-net';
const label=document.createElement('span');label.textContent='รายรับ − รายจ่าย';net.append(label,$('sumBalance'));caption.after(net);
const highest=page.querySelector('.make-summary-highest');highest.append($('summaryHighestControls'));
const extra=page.querySelector('.make-summary-extra');extra.querySelector('summary').textContent='ตัวกรองเพิ่มเติม';
const breakdown=page.querySelector('.summary-details');
const categoryPanel=page.querySelector('.summary-share-card');categoryPanel.id='summaryCategoryPanel';categoryPanel.setAttribute('role','tabpanel');
const detailPanel=document.createElement('section');detailPanel.id='summaryBreakdownPanel';detailPanel.setAttribute('role','tabpanel');detailPanel.hidden=true;
const note=document.createElement('p');note.className='summary-breakdown-note';note.textContent='ยอดตามกลุ่มค่าใช้จ่าย · บางกลุ่มอาจมีรายการซ้อนกัน จึงไม่ควรนำมารวมซ้ำ';detailPanel.append(note,breakdown);breakdown.open=true;categoryPanel.after(detailPanel);
const tabs=[...page.querySelectorAll('.make-summary-tabs button')];tabs[0].id='summaryDetailTab';tabs[1].id='summaryCategoryTab';
const panelFor=[detailPanel,categoryPanel];page.querySelector('.make-summary-tabs').setAttribute('role','tablist');
function activate(index,focus=false){tabs.forEach((button,i)=>{button.classList.toggle('is-active',i===index);button.setAttribute('aria-selected',String(i===index));button.tabIndex=i===index?0:-1;panelFor[i].hidden=i!==index;});if(focus)tabs[index].focus();if(index===1)window.dispatchEvent(new Event('resize'));}
tabs.forEach((button,i)=>{button.setAttribute('role','tab');button.setAttribute('aria-controls',panelFor[i].id);button.removeAttribute('aria-expanded');button.removeAttribute('aria-pressed');panelFor[i].setAttribute('aria-labelledby',button.id);button.onclick=()=>activate(i);button.onkeydown=event=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){event.preventDefault();activate(event.key==='Home'?0:event.key==='End'?1:1-i,true);}};});activate(1);
const month=$('summaryMonth'),year=$('summaryYear'),picker=page.querySelector('.make-summary-month');
function step(delta){let y=Number(year.value),m=month.value==='all'?1:Number(month.value);m+=delta;if(m===0){m=12;y--;}if(m===13){m=1;y++;}if(![...year.options].some(o=>o.value===String(y))){const opt=document.createElement('option');opt.value=String(y);opt.textContent=String(y+543);year.append(opt);}year.value=String(y);month.value=String(m).padStart(2,'0');month.dispatchEvent(new Event('change',{bubbles:true}));}
for(const [delta,text,aria]of [[-1,'‹','เดือนก่อนหน้า'],[1,'›','เดือนถัดไป']]){const b=document.createElement('button');b.type='button';b.className='month-arrow';b.textContent=text;b.setAttribute('aria-label',aria);b.onclick=()=>step(delta);delta<0?picker.prepend(b):picker.append(b);}
$('sumIncome').setAttribute('aria-label','ดูรายการรายรับ');$('sumExpense').setAttribute('aria-label','ดูรายการรายจ่าย');$('sumBalance').setAttribute('aria-label','ดูรายการประกอบเงินเหลือสุทธิ');
$('summaryHighestAll').textContent='ดู 5 อันดับ ›';
page.querySelector('.summary-category-help').textContent='แตะวงแหวนเพื่อดูยอดหมวด · แตะชื่อหมวดเพื่อดูรายละเอียด';
})();

}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initializeSummaryLayout,{once:true});else initializeSummaryLayout();

