// Summary-only presentation. Existing financial renderers and actions are retained.
window.addEventListener('myfinance:preview-ready',()=>{
 const $=id=>document.getElementById(id),page=$('summaryPage');if(!page)return;
 const hero=page.querySelector('.summary-hero'),heading=hero.querySelector('h2'),year=$('summaryYear'),month=$('summaryMonth');
 const header=document.createElement('header');header.className='make-summary-header';
 const back=document.createElement('button');back.type='button';back.className='make-summary-back';back.textContent='‹';back.setAttribute('aria-label','กลับภาพรวม');back.onclick=()=>window.dispatchEvent(new CustomEvent('finance:navigate',{detail:'dashboard'}));
 const picker=document.createElement('div');picker.className='make-summary-month';picker.setAttribute('role','group');picker.setAttribute('aria-label','เลือกเดือนและปี');
 const calendar=document.createElement('span');calendar.setAttribute('aria-hidden','true');calendar.innerHTML='<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 2v6M17 2v6M3 11h18M7 15h3M14 15h3"/></svg>';
 picker.append(month,year,calendar);heading.textContent='รายรับรายจ่าย';header.append(back,picker,heading);hero.before(header);hero.classList.add('hidden');
 const now=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 month.value=now.slice(5,7);year.value=now.slice(0,4);
 for(const option of month.options){if(option.value!=='all')option.textContent=new Intl.DateTimeFormat('th-TH',{month:'short'}).format(new Date(2026,Number(option.value)-1,1));}
 for(const option of year.options)option.textContent=String(Number(option.value)+543);
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
  if(chart.canvas.id!=='categoryPieChart')return;const values=chart.data.datasets[0].data,total=values.reduce((a,b)=>a+Number(b),0),ctx=chart.ctx;
  chart.getDatasetMeta(0).data.forEach((arc,i)=>{const pct=total?Number(values[i])/total*100:0;if(pct<8)return;const {x,y,startAngle,endAngle,innerRadius,outerRadius}=arc.getProps(['x','y','startAngle','endAngle','innerRadius','outerRadius'],true),angle=(startAngle+endAngle)/2,r=(innerRadius+outerRadius)/2;ctx.save();ctx.fillStyle=i===1?'#467d83':'#ffffff';ctx.font='500 10px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(pct.toFixed(0)+'%',x+Math.cos(angle)*r,y+Math.sin(angle)*r);ctx.restore();});
 }});const chart=Chart.getChart($('categoryPieChart'));if(chart)chart.update('none');}
 // Renderer keeps all query/filter behavior; only activate the compact month controls.
 custom.click();decorateList();window.dispatchEvent(new CustomEvent('finance:navigate',{detail:'summary'}));
},{once:true});
