const navigationPaths={dashboard:'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',transactions:'M6 3h12v18l-3-2-3 2-3-2-3 2z M9 8h6 M9 12h6',capture:'M12 5v14 M5 12h14',summary:'M4 20V4 M4 20h17 M8 15l4-5 4 2 5-7',more:'M4 6h16 M4 12h16 M4 18h16',budget:'M12 3a9 9 0 1 0 9 9 M12 7a5 5 0 1 0 5 5 M12 12l8-8 M16 4h4v4',bills:'M5 5h14v16H5z M8 3v4 M16 3v4 M5 10h14 M8 14h3 M8 17h6',debts:'M3 5h18v14H3z M3 10h18 M7 15h4',accounts:'M3 9l9-6 9 6z M5 10v9 M10 10v9 M15 10v9 M20 10v9 M3 21h18',categories:'M3 4h8l10 10-7 7L3 10z M7 8h.01',settings:'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M9 3h6l1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1z'};
function paintNavigationIcon(element,page,fallback,classes){
 const path=navigationPaths[page];if(!path){element.textContent=fallback;return;}
 const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg'),line=document.createElementNS(ns,'path');
 for(const [name,value]of Object.entries({viewBox:'0 0 24 24',width:'21',height:'21',fill:'none',stroke:'currentColor','stroke-width':'1.6','stroke-linecap':'round','stroke-linejoin':'round','aria-hidden':'true'}))svg.setAttribute(name,value);
 line.setAttribute('d',path);svg.append(line);element.append(svg);
}
const homeApp=document.getElementById('app');
const mount=homeApp||document.body;
const primary=[['dashboard','📊','ภาพรวม'],['transactions','🧾','รายรับ–รายจ่าย'],['capture','＋','เพิ่ม'],['summary','📈','วิเคราะห์']];
const groups=[
 ['วางแผนเงิน',[['budget','🎯','งบประมาณ'],['bills','📅','บิลประจำ'],['debts','💳','บัตรและหนี้']]],
 ['จัดการข้อมูล',[['accounts','🏦','บัญชี'],['categories','🏷️','หมวดหมู่'],['settings','⚙️','ตั้งค่า']]]
];
const secondary=groups.flatMap(([,items])=>items);
const buttons=new Map();
const nav=document.createElement('nav');nav.className='mobile-app-nav';nav.setAttribute('aria-label','เมนูหลัก');
function createSheet(id,title){const dialog=document.createElement('dialog');dialog.className='app-menu-sheet';dialog.setAttribute('aria-labelledby',id);dialog.innerHTML='<div class="app-menu-head"><div><div class="app-menu-eyebrow">MY FINANCE</div><h2 id="'+id+'">'+title+'</h2></div><button type="button" class="app-menu-close" aria-label="ปิดเมนู">✕</button></div>';dialog.querySelector('.app-menu-close').onclick=()=>dialog.close();dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientY<r.top||e.clientY>r.bottom||e.clientX<r.left||e.clientX>r.right)dialog.close();}});return dialog;}
const sheet=createSheet('appMenuTitle','เพิ่มเติม'),captureSheet=createSheet('appCaptureTitle','บันทึกอะไรดี?');
sheet.classList.add('more-menu-modern');
function navigate(page,href){if(sheet.open)sheet.close();if(captureSheet.open)captureSheet.close();if(href){location.href=href;return;}if(homeApp)window.dispatchEvent(new CustomEvent('finance:navigate',{detail:page}));else location.href='./index.html#'+page;}
const warmedPages=new Set();
function warmPage(href){if(!href||warmedPages.has(href))return;warmedPages.add(href);const link=document.createElement('link');link.rel='prefetch';link.href=href;link.as='document';document.head.append(link);}
function makeButton(item,cls,action=null){const [page,icon,label,href]=item,b=document.createElement('button');b.type='button';b.className=cls;b.dataset.destination=page;const ico=document.createElement('span');ico.className='app-nav-icon';ico.setAttribute('aria-hidden','true');paintNavigationIcon(ico,page,icon,cls);const txt=document.createElement('span');txt.textContent=page==='transactions'&&cls.split(' ').includes('app-nav-tab')?'รายรับ–\nรายจ่าย':label;if(page==='transactions')b.setAttribute('aria-label',label);b.append(ico,txt);b.onclick=action||(()=>navigate(page,href));if(href){b.addEventListener('pointerenter',()=>warmPage(href),{once:true});b.addEventListener('focus',()=>warmPage(href),{once:true});b.addEventListener('touchstart',()=>warmPage(href),{once:true,passive:true});}if(!action)buttons.set(page,[...(buttons.get(page)||[]),b]);return b;}
function openCapture(){if(sheet.open)sheet.close();if(!captureSheet.open)captureSheet.showModal();}
primary.forEach(x=>{const b=makeButton(x,'app-nav-tab'+(x[0]==='capture'?' app-nav-capture':''),x[0]==='capture'?openCapture:null);if(x[0]==='capture'){b.setAttribute('aria-haspopup','dialog');b.setAttribute('aria-expanded','false');captureSheet.addEventListener('close',()=>b.setAttribute('aria-expanded','false'));b.onclick=()=>{openCapture();b.setAttribute('aria-expanded','true');};}nav.append(b);});
const more=makeButton(['more','☰','เพิ่มเติม'],'app-nav-tab',()=>{sheet.showModal();more.setAttribute('aria-expanded','true');});more.setAttribute('aria-haspopup','dialog');more.setAttribute('aria-expanded','false');nav.append(more);sheet.addEventListener('close',()=>more.setAttribute('aria-expanded','false'));
function appendGroup(dialog,label,items,action){const section=document.createElement('section'),heading=document.createElement('h3'),grid=document.createElement('div');section.className='app-menu-group';heading.className='app-menu-group-title';heading.textContent=label;grid.className='app-menu-grid';for(const item of items)grid.append(makeButton(item,'app-menu-item',action?()=>action(item[0]):null));section.append(heading,grid);dialog.append(section);}
groups.forEach(([label,items])=>appendGroup(sheet,label,items));
for(const button of sheet.querySelectorAll('.app-menu-item')){const arrow=document.createElement('span');arrow.className='menu-chevron';arrow.setAttribute('aria-hidden','true');arrow.textContent='›';button.append(arrow);}
appendGroup(captureSheet,'รายรับ–รายจ่ายทั่วไป',[['income','↗','เพิ่มรายรับ'],['expense','↘','เพิ่มรายจ่าย']],type=>{captureSheet.close();if(homeApp)window.dispatchEvent(new CustomEvent('finance:capture',{detail:type}));else location.href='./index.html#capture-'+type;});
function active(page){buttons.forEach((nodes,key)=>nodes.forEach(b=>{b.classList.toggle('is-active',key===page);if(key===page)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');}));more.classList.toggle('is-active',secondary.some(x=>x[0]===page)||['salary','rent','car'].includes(page));}
window.addEventListener('finance:page',e=>active(e.detail));
window.addEventListener('finance:open-capture',openCapture);
document.querySelector('[data-open-capture]')?.addEventListener('click',openCapture);
active(location.pathname.endsWith('/rent.html')?'rent':location.pathname.endsWith('/salary.html')?'salary':location.pathname.endsWith('/car.html')?'car':location.hash.slice(1)||'dashboard');
mount.append(nav,sheet,captureSheet);
document.documentElement.classList.add('mobile-nav-ready');

// Follow deliberate page scrolling, ignoring dialog scrolls and iOS overscroll.
let navScrollY=Math.max(0,window.scrollY),navScrollDistance=0;
function revealNavigation(){nav.classList.remove('is-scroll-hidden');navScrollDistance=0;navScrollY=Math.max(0,window.scrollY);}
window.addEventListener('scroll',()=>{
 const maxY=Math.max(0,document.documentElement.scrollHeight-window.innerHeight);
 const y=Math.min(maxY,Math.max(0,window.scrollY)),delta=y-navScrollY;navScrollY=y;
 if(window.innerWidth>820||y<=32||document.querySelector('dialog[open]')||nav.querySelector(':focus-visible')){revealNavigation();return;}
 if(!delta)return;
 if(Math.sign(delta)!==Math.sign(navScrollDistance))navScrollDistance=0;
 navScrollDistance+=delta;
 if(navScrollDistance>=24){nav.classList.add('is-scroll-hidden');navScrollDistance=0;}
 else if(navScrollDistance<=-12){nav.classList.remove('is-scroll-hidden');navScrollDistance=0;}
},{passive:true});
nav.addEventListener('focusin',revealNavigation);
window.addEventListener('finance:page',revealNavigation);
window.addEventListener('finance:open-capture',revealNavigation);
window.addEventListener('resize',revealNavigation);
window.addEventListener('pageshow',revealNavigation);
sheet.addEventListener('close',revealNavigation);captureSheet.addEventListener('close',revealNavigation);

// Guide actions use the same capture chooser as the main navigation.
document.addEventListener('click',e=>{
 const capture=e.target.closest('[data-guide-capture]');if(capture){openCapture();return;}
 const jump=e.target.closest('[data-guide-target]');if(!jump)return;
 const target=document.getElementById(jump.dataset.guideTarget);if(!target)return;
 const card=target.closest('.settings-card')||target;card.scrollIntoView({behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches?'auto':'smooth',block:'start'});
 const focus=target.matches('button,input,select')?target:target.querySelector('button,input,select');focus?.focus({preventScroll:true});
});
