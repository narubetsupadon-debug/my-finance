/* Presentation-only enhancement of the existing summary card. No financial reads/writes or recalculation. */
document.addEventListener('DOMContentLoaded',()=>{
 const root=document.getElementById('foodSubcategoryBreakdown');if(!root)return;
 function decorate(){
  for(const item of root.querySelectorAll(':scope > .summary-category')){
   const summary=item.querySelector('summary');if(!summary||summary.querySelector('.proportion-track'))continue;
   const percent=Number.parseFloat(summary.querySelector('.summary-category-numbers small')?.textContent||'');
   if(!Number.isFinite(percent))continue;
   const track=document.createElement('span');track.className='proportion-track';track.setAttribute('aria-hidden','true');
   const fill=document.createElement('span');fill.className='proportion-fill';fill.style.width=Math.min(100,Math.max(0,percent))+'%';fill.style.background=summary.querySelector('.summary-category-dot')?.style.background||'var(--primary)';track.append(fill);summary.append(track);
  }
 }
 new MutationObserver(records=>{if(records.some(record=>record.target===root))decorate();}).observe(root,{childList:true});decorate();
});
