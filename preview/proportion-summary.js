/* Test-only wrapper: reuse production report scope and calculations unchanged. */
import {createSummaryRenderer as createOriginal} from '../app-summary.js?v=20261021-stability1&preview-source=1';
import {createTotalDetails} from '../total-details.js?v=20261021-stability1';
export * from '../app-summary.js?v=20261021-stability1&preview-source=1';
export function rankedExpenses(rows){
 return rows.filter(row=>row.type==='expense'&&Number.isFinite(Number(row.amount))&&Number(row.amount)>0)
 .slice().sort((a,b)=>Math.round(Number(b.amount)*100)-Math.round(Number(a.amount)*100)||String(b.transaction_date).localeCompare(String(a.transaction_date))||String(a.description).localeCompare(String(b.description),'th')).slice(0,5);
}
export function createSummaryRenderer(options){
 const original=createOriginal(options),{$,money}=options,openDetails=createTotalDetails({$,money,fmtDate:date=>date});
 const card=$('summaryHighest'),track=$('summaryHighestTrack'),controls=$('summaryHighestControls'),dots=$('summaryHighestDots'),pause=$('summaryHighestPause'),all=$('summaryHighestAll');
 const motion=window.matchMedia?.('(prefers-reduced-motion: reduce)');
 let ranked=[],index=0,position=0,report=null,timer=null,paused=!!motion?.matches,hovered=false,pointerStart=null;
 function stop(){clearTimeout(timer);timer=null;}
 function visible(){return !document.hidden&&!$('summaryPage')?.classList.contains('hidden')&&!$('app')?.classList.contains('hidden');}
 function blocked(){return paused||hovered||!visible()||card?.contains(document.activeElement)||document.querySelector('dialog[open]');}
 function schedule(){stop();if(ranked.length<2||blocked())return;timer=setTimeout(()=>{timer=null;if(blocked()){schedule();return;}move(index+1,true);},5000);}
 function element(tag,text,cls){const el=document.createElement(tag);el.textContent=text||'';if(cls)el.className=cls;return el;}
 function slide(item,i){
  const el=element('div','','highest-slide');el.dataset.rank=String(i+1);el.setAttribute('role','group');el.setAttribute('aria-label','รายจ่ายอันดับ '+(i+1));
  const icon=element('span',String(i+1),'highest-icon');icon.setAttribute('aria-hidden','true');
  const info=element('span','','highest-info');info.append(element('small','รายจ่ายอันดับ '+(i+1)),element('strong',item.description||'รายการไม่ระบุชื่อ'),element('span',(item.reportCategory||'ไม่ระบุหมวด')+' · '+item.transaction_date));
  el.append(icon,info,element('strong','−'+money(item.amount),'highest-amount money'));return el;
 }
 function positionTrack(animate){track.style.transition=animate&&!motion?.matches?'transform 700ms cubic-bezier(.22,.7,.25,1)':'none';track.style.transform='translateX(-'+(position*100)+'%)';}
 function state(){
  [...track.children].forEach((el,i)=>el.setAttribute('aria-hidden',String(i!==index)));
  [...dots.children].forEach((el,i)=>el.setAttribute('aria-current',String(i===index)));
  pause.textContent=paused?'▶ เล่นต่อ':'Ⅱ หยุด';pause.setAttribute('aria-label',paused?'เล่นการ์ดรายจ่ายอัตโนมัติ':'หยุดการ์ดรายจ่ายอัตโนมัติ');pause.setAttribute('aria-pressed',String(paused));
 }
 function move(next,automatic=false){
  if(!ranked.length)return;index=(next+ranked.length)%ranked.length;
  // The duplicate first slide lets the last item flow forward back to the first.
  position=automatic&&index===0&&!motion?.matches?ranked.length:index;positionTrack(true);state();schedule();
 }
 function resetTrack(){if(position===ranked.length){position=0;positionTrack(false);}}
 track?.addEventListener('transitionend',event=>{if(event.target===track&&event.propertyName==='transform')resetTrack();});
 if(card){
  card.addEventListener('pointerenter',event=>{if(event.pointerType==='mouse'){hovered=true;stop();}});card.addEventListener('pointerleave',()=>{hovered=false;schedule();});
  card.addEventListener('focusin',stop);card.addEventListener('focusout',schedule);
  card.addEventListener('pointerdown',event=>{pointerStart={x:event.clientX,y:event.clientY};stop();});
  card.addEventListener('pointerup',event=>{if(pointerStart){const dx=event.clientX-pointerStart.x,dy=event.clientY-pointerStart.y;if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy))move(index+(dx<0?1:-1));}pointerStart=null;schedule();});
  card.addEventListener('pointercancel',()=>{pointerStart=null;schedule();});
 }
 $('summaryHighestPrev')?.addEventListener('click',()=>move(index-1));$('summaryHighestNext')?.addEventListener('click',()=>move(index+1));pause?.addEventListener('click',()=>{paused=!paused;state();schedule();});
 all?.addEventListener('click',()=>{if(!ranked.length||!report)return;stop();openDetails('รายจ่ายสูงสุด '+ranked.length+' อันดับ',ranked.map((item,i)=>({label:'อันดับ '+(i+1)+' · '+(item.description||'รายการไม่ระบุชื่อ'),rows:[item]})),report.label+' · '+report.scope);});
 document.addEventListener('visibilitychange',schedule);const page=$('summaryPage');if(page)new MutationObserver(schedule).observe(page,{attributes:true,attributeFilter:['class']});
 document.querySelectorAll('dialog').forEach(dialog=>dialog.addEventListener('close',schedule));motion?.addEventListener?.('change',event=>{paused=event.matches;resetTrack();state();schedule();});
 function refreshHighest(){
  stop();report=original.getReport();ranked=report?rankedExpenses(report.rows):[];index=0;position=0;
  if(!card||!track)return;track.replaceChildren(...ranked.map(slide));
  if(ranked.length>1){const clone=slide(ranked[0],0);clone.dataset.clone='true';clone.setAttribute('aria-hidden','true');track.append(clone);}
  if(!ranked.length)track.append(element('div','ยังไม่มีรายจ่ายในช่วงนี้','highest-empty'));
  all.disabled=!ranked.length;controls.hidden=ranked.length<2;
  dots.replaceChildren(...ranked.map((_,i)=>{const button=element('button','','highest-dot');button.type='button';button.setAttribute('aria-label','ดูรายจ่ายอันดับ '+(i+1));button.addEventListener('click',()=>move(i));return button;}));
  positionTrack(false);state();schedule();
  const total=$('summaryPieTotal');if(total&&report?.rows.some(row=>row.type==='expense'&&Number(row.amount)>0))total.textContent='−'+total.textContent.replace(/^−/,'');
 }
 function render(){original();refreshHighest();}render.setRange=range=>{original.setRange(range);refreshHighest();};render.getReport=original.getReport;return render;
}
