const homeApp=document.getElementById('app');
const mount=homeApp||document.body;
const primary=[['dashboard','📊','ภาพรวม'],['transactions','🧾','รายรับ–รายจ่าย'],['capture','＋','บันทึก'],['summary','📈','สรุป']];
const groups=[
 ['วางแผนเงิน',[['budget','🎯','งบประมาณ'],['bills','📅','บิลประจำ'],['debts','💳','บัตรและสินเชื่อ']]],
 ['บันทึกเฉพาะเรื่อง',[['salary','💰','เงินเดือน','./salary.html'],['rent','🏠','ค่าห้องเช่า','./rent.html'],['car','🚗','รถของฉัน','./car.html']]],
 ['จัดการข้อมูล',[['accounts','🏦','บัญชี'],['categories','🏷️','หมวดหมู่'],['settings','⚙️','ตั้งค่า']]]
];
const secondary=groups.flatMap(([,items])=>items);
const buttons=new Map();
const nav=document.createElement('nav');nav.className='mobile-app-nav';nav.setAttribute('aria-label','เมนูหลัก');
function createSheet(id,title){const dialog=document.createElement('dialog');dialog.className='app-menu-sheet';dialog.setAttribute('aria-labelledby',id);dialog.innerHTML='<div class="app-menu-head"><div><div class="app-menu-eyebrow">MY FINANCE</div><h2 id="'+id+'">'+title+'</h2></div><button type="button" class="app-menu-close" aria-label="ปิดเมนู">✕</button></div>';dialog.querySelector('.app-menu-close').onclick=()=>dialog.close();dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientY<r.top||e.clientY>r.bottom||e.clientX<r.left||e.clientX>r.right)dialog.close();}});return dialog;}
const sheet=createSheet('appMenuTitle','เพิ่มเติม'),captureSheet=createSheet('appCaptureTitle','บันทึกอะไรดี?');
function navigate(page,href){if(sheet.open)sheet.close();if(captureSheet.open)captureSheet.close();if(href){location.href=href;return;}if(homeApp)window.dispatchEvent(new CustomEvent('finance:navigate',{detail:page}));else location.href='./index.html#'+page;}
const warmedPages=new Set();
function warmPage(href){if(!href||warmedPages.has(href))return;warmedPages.add(href);const link=document.createElement('link');link.rel='prefetch';link.href=href;link.as='document';document.head.append(link);}
function makeButton(item,cls,action=null){const [page,icon,label,href]=item,b=document.createElement('button');b.type='button';b.className=cls;b.dataset.destination=page;const ico=document.createElement('span');ico.className='app-nav-icon';ico.setAttribute('aria-hidden','true');ico.textContent=icon;const txt=document.createElement('span');txt.textContent=label;b.append(ico,txt);b.onclick=action||(()=>navigate(page,href));if(href){b.addEventListener('pointerenter',()=>warmPage(href),{once:true});b.addEventListener('focus',()=>warmPage(href),{once:true});b.addEventListener('touchstart',()=>warmPage(href),{once:true,passive:true});}if(!action)buttons.set(page,[...(buttons.get(page)||[]),b]);return b;}
function openCapture(){if(sheet.open)sheet.close();if(!captureSheet.open)captureSheet.showModal();}
primary.forEach(x=>{const b=makeButton(x,'app-nav-tab'+(x[0]==='capture'?' app-nav-capture':''),x[0]==='capture'?openCapture:null);if(x[0]==='capture'){b.setAttribute('aria-haspopup','dialog');b.setAttribute('aria-expanded','false');captureSheet.addEventListener('close',()=>b.setAttribute('aria-expanded','false'));b.onclick=()=>{openCapture();b.setAttribute('aria-expanded','true');};}nav.append(b);});
const more=makeButton(['more','☰','เพิ่มเติม'],'app-nav-tab',()=>{sheet.showModal();more.setAttribute('aria-expanded','true');});more.setAttribute('aria-haspopup','dialog');more.setAttribute('aria-expanded','false');nav.append(more);sheet.addEventListener('close',()=>more.setAttribute('aria-expanded','false'));
function appendGroup(dialog,label,items,action){const section=document.createElement('section'),heading=document.createElement('h3'),grid=document.createElement('div');section.className='app-menu-group';heading.className='app-menu-group-title';heading.textContent=label;grid.className='app-menu-grid';for(const item of items)grid.append(makeButton(item,'app-menu-item',action?()=>action(item[0]):null));section.append(heading,grid);dialog.append(section);}
groups.forEach(([label,items])=>appendGroup(sheet,label,items));
appendGroup(captureSheet,'รายรับ–รายจ่ายทั่วไป',[['income','↗','เพิ่มรายรับ'],['expense','↘','เพิ่มรายจ่าย']],type=>{captureSheet.close();if(homeApp)window.dispatchEvent(new CustomEvent('finance:capture',{detail:type}));else location.href='./index.html#capture-'+type;});
appendGroup(captureSheet,'ใช้ฟอร์มเฉพาะเรื่อง',groups[1][1]);
function active(page){buttons.forEach((nodes,key)=>nodes.forEach(b=>{b.classList.toggle('is-active',key===page);if(key===page)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');}));more.classList.toggle('is-active',secondary.some(x=>x[0]===page));}
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
