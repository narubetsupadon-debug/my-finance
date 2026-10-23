// Test-only: the rent form scrolls inside main, not window.
// Main, car and salary continue to use the existing shared window-scroll controller.
const scroller=document.querySelector('.rent-wrap');
const nav=document.querySelector('.mobile-app-nav');
if(scroller&&nav){
 let previous=Math.max(0,scroller.scrollTop),distance=0;
 const reveal=()=>{nav.classList.remove('is-scroll-hidden');distance=0;previous=Math.max(0,scroller.scrollTop);};
 scroller.addEventListener('scroll',()=>{
  const max=Math.max(0,scroller.scrollHeight-scroller.clientHeight);
  const current=Math.min(max,Math.max(0,scroller.scrollTop));
  const delta=current-previous;
  previous=current;
  if(window.innerWidth>820||current<=32||document.querySelector('dialog[open]')||nav.contains(document.activeElement)){reveal();return;}
  if(!delta)return;
  if(Math.sign(delta)!==Math.sign(distance))distance=0;
  distance+=delta;
  if(distance>=24){nav.classList.add('is-scroll-hidden');distance=0;}
  else if(distance<=-12){reveal();}
 },{passive:true});
 nav.addEventListener('focusin',reveal);
 window.addEventListener('pageshow',reveal);
 window.addEventListener('resize',reveal);
}
