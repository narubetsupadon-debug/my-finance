/* Presentation only. Keep original IDs, event handlers and financial calculations. */
document.addEventListener('DOMContentLoaded',()=>{
 const $=id=>document.getElementById(id), page=$('dashboardPage');
 const feed=page.querySelector('.home-feed');
 const insight=feed.querySelector('.insight-card');
 const upcoming=$('upcomingList').closest('details');
 upcoming.open=true;feed.append(upcoming);page.append(insight);
 const ring=document.createElement('div');ring.className='budget-ring';ring.setAttribute('aria-hidden','true');
 const label=document.createElement('span');ring.append(label);$('budgetCard').append(ring);
 function updateRing(){const raw=$('budgetPctDash').textContent;const pct=Number.parseFloat(raw.replace(/,/g,''));const valid=Number.isFinite(pct);ring.style.setProperty('--progress',(valid?Math.max(0,Math.min(100,pct)):0)+'%');label.replaceChildren(document.createTextNode(valid?raw:'—'));const small=document.createElement('small');small.textContent='ใช้ไปแล้ว';label.append(small)}
 new MutationObserver(updateRing).observe($('budgetPctDash'),{subtree:true,characterData:true,childList:true});updateRing();
 // Keep users inside read-only test pages; opening the real site is a deliberate action.
 document.addEventListener('click',e=>{const a=e.target.closest('a[href]');if(a&&a.getAttribute('href').match(/(?:salary|rent|car)\.html/)){e.preventDefault();alert('หน้านี้เป็น Preview ของ Dashboard ค่ะ เมนูนี้ยังไม่ได้เปิดในชุดทดสอบนี้')}});
});
