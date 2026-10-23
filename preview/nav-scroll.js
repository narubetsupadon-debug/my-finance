// Unified TEST controller: use exactly one scroll tracker per screen.
// Rent scrolls in <main>; all other pages scroll the document.
const nav=document.querySelector('.mobile-app-nav');
const rent=document.querySelector('.rent-wrap');
const scroller=rent||document.scrollingElement||document.documentElement;
if(nav){
 let previous=Math.max(0,rent?rent.scrollTop:window.scrollY),distance=0;
 function currentY(){return Math.max(0,rent?rent.scrollTop:window.scrollY);}
 function reveal(){nav.classList.remove('is-scroll-hidden');distance=0;previous=currentY();}
 // Prevent app-nav's window handler and this controller from fighting.
 if(!rent)window.__financePreviewNavOwnsWindowScroll=true;
 function onScroll(){
  const current=currentY(),delta=current-previous;previous=current;
  if(window.innerWidth>820||current<=32||document.querySelector('dialog[open]')||nav.contains(document.activeElement)){reveal();return;}
  if(!delta)return;
  if(Math.sign(delta)!==Math.sign(distance))distance=0;
  distance+=delta;
  if(distance>=24){nav.classList.add('is-scroll-hidden');distance=0;}
  else if(distance<=-12){reveal();}
 }
 (rent||window).addEventListener('scroll',onScroll,{passive:true});
 nav.addEventListener('focusin',reveal);
 window.addEventListener('pageshow',reveal);
 window.addEventListener('resize',reveal);
 window.addEventListener('finance:page',reveal);
 window.addEventListener('finance:open-capture',reveal);
 document.querySelectorAll('.app-menu-sheet').forEach(el=>el.addEventListener('close',reveal));
}
