
const homeApp=document.getElementById('app');
const mount=homeApp||document.body;
const primary=[['dashboard','📊','ภาพรวม'],['transactions','🧾','รายการ'],['budget','🎯','งบประมาณ'],['summary','📈','สรุป']];
const secondary=[['rent','🏠','ค่าห้องเช่า','./rent.html'],['salary','💰','เงินเดือน','./salary.html'],['bills','📅','บิลประจำ'],['debts','💳','บัตร/สินเชื่อ'],['car','🚗','ผ่อนรถ','./car.html'],['accounts','🏦','บัญชี'],['categories','🏷️','หมวดหมู่'],['settings','⚙️','ตั้งค่า']];
const nav=document.createElement('nav');nav.className='mobile-app-nav';nav.setAttribute('aria-label','เมนูหลัก');
const sheet=document.createElement('dialog');sheet.className='app-menu-sheet';sheet.setAttribute('aria-labelledby','appMenuTitle');
sheet.innerHTML='<div class="app-menu-head"><div><div class="app-menu-eyebrow">MY FINANCE</div><h2 id="appMenuTitle">เพิ่มเติม</h2></div><button type="button" class="app-menu-close" aria-label="ปิดเมนู">✕</button></div><div class="app-menu-grid"></div>';
const buttons=new Map();
function navigate(page,href){
 if(sheet.open)sheet.close();
 if(href){location.href=href;return;}
 if(homeApp)window.dispatchEvent(new CustomEvent('finance:navigate',{detail:page}));
 else location.href='./index.html#'+page;
}
function makeButton(item,cls){
 const [page,icon,label,href]=item,b=document.createElement('button');b.type='button';b.className=cls;
 const ico=document.createElement('span');ico.className='app-nav-icon';ico.setAttribute('aria-hidden','true');ico.textContent=icon;
 const txt=document.createElement('span');txt.textContent=label;b.append(ico,txt);b.onclick=()=>navigate(page,href);buttons.set(page,b);return b;
}
primary.forEach(x=>nav.append(makeButton(x,'app-nav-tab')));
const more=document.createElement('button');more.type='button';more.className='app-nav-tab';more.setAttribute('aria-haspopup','dialog');more.setAttribute('aria-expanded','false');more.innerHTML='<span class="app-nav-icon" aria-hidden="true">☰</span><span>เพิ่มเติม</span>';
more.onclick=()=>{sheet.showModal();more.setAttribute('aria-expanded','true');};nav.append(more);
secondary.forEach(x=>sheet.querySelector('.app-menu-grid').append(makeButton(x,'app-menu-item')));
sheet.querySelector('.app-menu-close').onclick=()=>sheet.close();
sheet.addEventListener('close',()=>more.setAttribute('aria-expanded','false'));
sheet.addEventListener('click',e=>{if(e.target===sheet){const r=sheet.getBoundingClientRect();if(e.clientY<r.top||e.clientY>r.bottom||e.clientX<r.left||e.clientX>r.right)sheet.close();}});
function active(page){
 buttons.forEach((b,key)=>{b.classList.toggle('is-active',key===page);if(key===page)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
 more.classList.toggle('is-active',secondary.some(x=>x[0]===page));
}
window.addEventListener('finance:page',e=>active(e.detail));
active(location.pathname.endsWith('/rent.html')?'rent':location.pathname.endsWith('/salary.html')?'salary':location.pathname.endsWith('/car.html')?'car':location.hash.slice(1)||'dashboard');
mount.append(nav,sheet);

document.documentElement.classList.add('mobile-nav-ready');
