/* Test-only wrapper: reuse production report scope and calculations unchanged. */
import {createSummaryRenderer as createOriginal} from '../app-summary.js?v=20261021-stability1&preview-source=1';
import {createTotalDetails} from '../total-details.js?v=20261021-stability1';
export * from '../app-summary.js?v=20261021-stability1&preview-source=1';
export function rankedExpenses(rows){
 return rows.filter(row=>row.type==='expense'&&Number.isFinite(Number(row.amount))&&Number(row.amount)>0)
 .slice().sort((a,b)=>Math.round(Number(b.amount)*100)-Math.round(Number(a.amount)*100)||String(b.transaction_date).localeCompare(String(a.transaction_date))||String(a.description).localeCompare(String(b.description),'th')).slice(0,3);
}
export function createSummaryRenderer(options){
 const original=createOriginal(options),{$,money}=options,openDetails=createTotalDetails({$,money,fmtDate:date=>date});
 const card=$('summaryHighest'),controls=$('summaryHighestControls'),dots=$('summaryHighestDots'),pause=$('summaryHighestPause');
 const motion=window.matchMedia?.('(prefers-reduced-motion: reduce)');
 let ranked=[],index=0,report=null,timer=null,paused=!!motion?.matches,hovered=false,pointerStart=null,swiped=false;
 function stop(){clearTimeout(timer);timer=null;}
 function visible(){return !document.hidden&&!$('summaryPage')?.classList.contains('hidden')&&!$('app')?.classList.contains('hidden');}
 function schedule(){stop();if(ranked.length<2||paused||hovered||!visible()||card?.contains(document.activeElement)||document.querySelector('dialog[open]'))return;timer=setTimeout(()=>{timer=null;if(paused||hovered||!visible()||card?.contains(document.activeElement)||document.querySelector('dialog[open]')){schedule();return;}index=(index+1)%ranked.length;paint();schedule();},5000);}
 function paint(){
  if(!card)return;const item=ranked[index];
  $('summaryHighestLabel').textContent=item?'รายจ่ายอันดับ '+(index+1):'รายจ่ายสูงสุด';
  $('summaryHighestAmount').textContent=item?'−'+money(item.amount):'—';
  $('summaryHighestName').textContent=item?(item.description||'รายการไม่ระบุชื่อ'):'ยังไม่มีรายจ่ายในช่วงนี้';
  $('summaryHighestMeta').textContent=item?(item.reportCategory||'ไม่ระบุหมวด')+' · '+item.transaction_date:'';
  card.disabled=!item;card.setAttribute('aria-label',item?'ดูรายละเอียดรายจ่ายอันดับ '+(index+1)+' '+(item.description||'รายการไม่ระบุชื่อ'):'ยังไม่มีรายจ่าย');
  controls.hidden=ranked.length<2;dots.replaceChildren(...ranked.map((_,i)=>{const button=document.createElement('button');button.type='button';button.className='highest-dot';button.setAttribute('aria-label','ดูรายจ่ายอันดับ '+(i+1));button.setAttribute('aria-current',String(i===index));button.addEventListener('click',()=>move(i));return button;}));
  pause.textContent=paused?'▶ เล่นต่อ':'Ⅱ หยุด';pause.setAttribute('aria-label',paused?'เล่นการ์ดรายจ่ายอัตโนมัติ':'หยุดการ์ดรายจ่ายอัตโนมัติ');pause.setAttribute('aria-pressed',String(paused));
 }
 function move(next){if(!ranked.length)return;index=(next+ranked.length)%ranked.length;paint();schedule();}
 if(card){
  card.addEventListener('click',event=>{if(swiped){event.preventDefault();swiped=false;return;}const item=ranked[index];if(item&&report){stop();openDetails('รายจ่ายอันดับ '+(index+1),[{label:item.description||'รายการ',rows:[item]}],report.label+' · '+report.scope);}});
  card.addEventListener('pointerenter',event=>{if(event.pointerType==='mouse'){hovered=true;stop();}});
  card.addEventListener('pointerleave',()=>{hovered=false;schedule();});
  card.addEventListener('focus',stop);card.addEventListener('blur',schedule);
  card.addEventListener('pointerdown',event=>{pointerStart={x:event.clientX,y:event.clientY};swiped=false;stop();});
  card.addEventListener('pointerup',event=>{if(pointerStart){const dx=event.clientX-pointerStart.x,dy=event.clientY-pointerStart.y;if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy)){swiped=true;move(index+(dx<0?1:-1));}}pointerStart=null;schedule();});
  card.addEventListener('pointercancel',()=>{pointerStart=null;schedule();});
 }
 $('summaryHighestPrev')?.addEventListener('click',()=>move(index-1));$('summaryHighestNext')?.addEventListener('click',()=>move(index+1));pause?.addEventListener('click',()=>{paused=!paused;paint();schedule();});
 document.addEventListener('visibilitychange',schedule);
 const page=$('summaryPage');if(page)new MutationObserver(schedule).observe(page,{attributes:true,attributeFilter:['class']});
 document.querySelectorAll('dialog').forEach(dialog=>dialog.addEventListener('close',schedule));
 motion?.addEventListener?.('change',event=>{paused=event.matches;paint();schedule();});
 function refreshHighest(){
  stop();report=original.getReport();ranked=report?rankedExpenses(report.rows):[];index=0;paint();schedule();
  const total=$('summaryPieTotal');if(total&&report?.rows.some(row=>row.type==='expense'&&Number(row.amount)>0))total.textContent='−'+total.textContent.replace(/^−/,'');
 }
 function render(){original();refreshHighest();}
 render.setRange=range=>{original.setRange(range);refreshHighest();};render.getReport=original.getReport;return render;
}
