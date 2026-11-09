// Real application + in-memory sample records. This preview never loads a live client.
const root=new URL('../',import.meta.url),nativeFetch=window.fetch.bind(window);
const params=new URLSearchParams(location.search),requestedTheme=params.get('theme');
const screen=['rent','car','salary'].includes(params.get('screen'))?params.get('screen'):'index';
let dark=requestedTheme?requestedTheme!=='light':false;
document.documentElement.dataset.resolvedTheme=dark?'dark':'light';
window.fetch=(resource,init)=>{
 const value=typeof resource==='string'||resource instanceof URL?String(resource):resource.url;
 if(new URL(value,location.href).hostname.endsWith('.supabase.co'))return Promise.resolve(new Response(JSON.stringify({message:'ข้อมูลตัวอย่างเท่านั้น',code:'PREVIEW_READ_ONLY'}),{status:403,headers:{'Content-Type':'application/json'}}));
 return nativeFetch(resource,init);
};
try{
 const response=await fetch(new URL(screen+'.html',root));if(!response.ok)throw Error('เปิดหน้าตัวอย่างไม่สำเร็จ');
 const parsed=new DOMParser().parseFromString(await response.text(),'text/html');
 for(const link of parsed.querySelectorAll('link[rel=stylesheet]')){
  const copy=link.cloneNode();copy.href=new URL(link.getAttribute('href'),root);
  if(copy.id==='darkThemeStylesheet')copy.media=dark?'all':'not all';document.head.append(copy);
 }
 for(const style of parsed.querySelectorAll('style'))document.head.append(style.cloneNode(true));
 const refined=document.createElement('link');refined.rel='stylesheet';refined.href=new URL('menu-ui.css?v=20261105-menu02',import.meta.url);document.head.append(refined);
 document.body.innerHTML=parsed.body.innerHTML;
 document.querySelectorAll('script').forEach(script=>script.remove());
 document.querySelectorAll('img[src]').forEach(img=>img.src=new URL(img.getAttribute('src'),root));
 const fixImages=node=>{
  if(node.nodeType!==1)return;
  for(const img of [...(node.matches('img[src]')?[node]:[]),...node.querySelectorAll('img[src]')]){
   const src=img.getAttribute('src');if(src.startsWith('./preview/'))img.src=new URL(src,root);
  }
 };
 const images=new MutationObserver(changes=>{for(const change of changes)for(const node of change.addedNodes)fixImages(node);});
 images.observe(document.body,{childList:true,subtree:true});
 document.querySelectorAll('a[href]').forEach(a=>{if(!a.getAttribute('href').startsWith('#'))a.href=new URL(a.getAttribute('href'),root);});
 const note=document.createElement('div');note.className='modern-preview-note';
 const label=document.createElement('span');label.textContent='TEST · การชำระและไฟล์สำรอง · ข้อมูลจำลอง';
 const theme=document.createElement('button');theme.type='button';theme.textContent=dark?'ธีมสว่าง':'ธีมมืด';theme.setAttribute('aria-label','สลับธีมสว่างและมืด');
 theme.onclick=()=>{dark=!dark;window.financeTheme.set(dark?'dark':'light');const address=new URL(location.href);address.searchParams.set('theme',dark?'dark':'light');history.replaceState(null,'',address);theme.textContent=dark?'ธีมสว่าง':'ธีมมืด';window.dispatchEvent(new Event('resize'));};
 note.append(label,theme);document.body.prepend(note);
 // Preferences and drafts are ephemeral too; preview cannot alter live local settings.
 for(const name of ['localStorage','sessionStorage']){
  const values=new Map();Object.defineProperty(window,name,{configurable:true,value:{getItem:key=>values.get(String(key))??null,setItem:(key,value)=>values.set(String(key),String(value)),removeItem:key=>values.delete(String(key)),clear:()=>values.clear(),key:index=>[...values.keys()][index]??null,get length(){return values.size;}}});
 }
 // Local HTTP visual QA also needs ephemeral IDs; these never leave the demo.
 if(typeof crypto.randomUUID!=='function'){let sequence=0;crypto.randomUUID=()=> '00000000-0000-4000-8000-'+String(++sequence).padStart(12,'0');}
 window.localStorage.setItem('my-finance-theme',dark?'dark':'light');
 window.localStorage.setItem('my-finance-ui-settings-v1',JSON.stringify({accent:'blue'}));
 window.addEventListener('finance:theme',event=>{dark=event.detail.resolved==='dark';theme.textContent=dark?'ธีมสว่าง':'ธีมมืด';});
 const loadScript=path=>new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=new URL(path,root);script.onload=resolve;script.onerror=reject;document.head.append(script);});
 await loadScript('theme.js?v=20261023-quality02&status=02');
 await loadScript('vendor/chart-4.4.7.umd.js?v=20261023-quality02');
 // Do not create/replace a worker for a visual demo.
 if('serviceWorker'in navigator){try{navigator.serviceWorker.register=async()=>({update:async()=>{}});}catch{}}
 let readbackFailure=false,armReadbackFailure=false;
 const fault=document.createElement('button');fault.type='button';fault.textContent='จำลองโหลดกลับไม่สำเร็จ';fault.onclick=()=>{if(readbackFailure||armReadbackFailure){readbackFailure=false;armReadbackFailure=false;fault.textContent='จำลองโหลดกลับไม่สำเร็จ';window.dispatchEvent(new Event('online'));}else{armReadbackFailure=true;fault.textContent='พร้อมจำลอง · ลองบันทึกชำระ';}};note.append(fault);
 const owner='modern-demo',user={id:owner,email:'ข้อมูลตัวอย่าง'},today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()),month=today.slice(0,7);
 const day=n=>month+'-'+String(Math.min(n,Number(today.slice(-2)))).padStart(2,'0');
 const categories=[['food','อาหารและเครื่องดื่ม','🍜','expense'],['coffee','กาแฟ','☕','expense'],['travel','เดินทาง','🚆','expense'],['car','รถยนต์','🚗','expense'],['shop','ช้อปปิ้ง','🛍️','expense'],['rent','ห้องเช่า','🏠','expense'],['bills','บิล/สาธารณูปโภค','📅','expense'],['debt','หนี้/ผ่อน','💳','expense'],['income','เงินเดือน','↗','income']].map(([id,name,icon,type],i)=>({id,name,icon,type,sort_order:i,user_id:owner,is_active:true}));
 const transaction=(id,description,amount,category_id,transaction_date=today,type='expense')=>({id,description,amount,category_id,transaction_date,type,user_id:owner,account_id:'bank',status:'paid',source:'web'});
 const data={categories,subcategories:[],accounts:[{id:'bank',name:'บัญชีหลัก',account_type:'bank',opening_balance:5000,is_active:true,user_id:owner}],
  transactions:[transaction('coffee','กาแฟก่อนเริ่มวัน',65,'coffee'),transaction('lunch','ข้าวกลางวัน',89,'food'),transaction('train','เดินทางไปทำงาน',30,'travel'),transaction('groceries','ของใช้เข้าห้อง',459,'shop',day(3)),transaction('dinner','มื้อเย็น',120,'food',day(2)),transaction('food-earlier','อาหารและของสด',870,'food',day(1)),transaction('rent','ค่าห้องเช่า',2500,'rent',day(1)),transaction('salary','เงินเดือน',23000,'income',day(1),'income')],
  budgets:[{id:'food-budget',name:'งบอาหาร',monthly_limit:4000,category_names:['อาหารและเครื่องดื่ม','กาแฟ'],is_active:true,user_id:owner}],
  bills:[{id:'internet',name:'อินเทอร์เน็ตมือถือ',amount:426,due_day:8,is_active:true,frequency:'monthly',category_id:'bills',user_id:owner},{id:'music',name:'Spotify',amount:79,due_day:12,is_active:true,frequency:'monthly',category_id:'bills',user_id:owner}],
  debts:[{id:'credit',name:'KBank',debt_type:'credit_card',original_amount:30000,outstanding_amount:5200,installment_amount:1200,due_day:20,is_active:true,logo_key:'kbank',user_id:owner},{id:'paylater',name:'PayLater',debt_type:'loan',original_amount:12000,outstanding_amount:6800,installment_amount:850,due_day:25,is_active:true,user_id:owner}]};
 data.rent_records=[{id:'rent-sample',user_id:owner,bill_month:month+'-01',payment_date:day(1),full_amount:5000,my_amount:2500,partner_amount:2500,status:'paid',transaction_id:'rent',category_id:'rent',account_id:'bank'}];
 data.salary_records=[{id:'salary-sample',user_id:owner,salary_month:month+'-01',payment_date:day(1),base_salary:23750,overtime:0,allowance:0,bonus:0,other_income:0,social_security:750,tax:0,provident_fund:0,other_deductions:0,net_amount:23000,transaction_id:'salary',account_id:'bank',category_id:'income'}];
 data.car_installments=[{id:'car-sample',user_id:owner,installment_no:1,due_date:month+'-20',scheduled_amount:6000,partner_amount:null,my_amount:null,status:'pending'}];
 data.car_expenses=[{id:'fuel-sample',user_id:owner,expense_type:'fuel',expense_date:day(1),description:'เติมน้ำมัน',amount:800,created_at:today+'T00:00:00Z'}];
 data.finance_subcategories=[{id:'home-cook',user_id:owner,category_id:'food',name:'อาหารทำเอง',is_active:true}];
 const channel={on(){return this;},subscribe(){return this;}};
 window.modernDemoDb={auth:{getSession:async()=>({data:{session:{user}},error:null}),getUser:async()=>({data:{user}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),signOut:async()=>({error:{message:'นี่คือหน้าตัวอย่าง ไม่ได้เชื่อมต่อบัญชีจริง'}})},
  channel:()=>channel,removeChannel(){},rpc:async(name)=>name==='export_finance_backup_v2'?({data:{format:'my-finance-backup',version:2,owner_id:owner,exported_at:new Date().toISOString(),data:Object.fromEntries(['categories','accounts','transactions','bills','debts','budgets','salary_records','car_installments','car_expenses','rent_records','finance_subcategories'].map(t=>[t,data[t]||[]]))},error:null}):({data:null,error:null}),from(table){
   let filters=[],orders=[],limit=Infinity,write,operation;
   const rows=()=>{let result=(data[table]||[]).filter(r=>filters.every(fn=>fn(r)));result=[...result].sort((a,b)=>{for(const [key,ascending]of orders){const n=String(a[key]??'').localeCompare(String(b[key]??''));if(n)return ascending?n:-n;}return 0;});return result.slice(0,limit).map(r=>({...r,categories:categories.find(c=>c.id===r.category_id),accounts:data.accounts.find(a=>a.id===r.account_id)}));};
   const q={select(){return q;},order(key,options={}){orders.push([key,options.ascending!==false]);return q;},limit(n){limit=n;return q;},eq(key,value){filters.push(r=>r[key]===value);return q;},neq(key,value){filters.push(r=>r[key]!==value);return q;},not(key){filters.push(r=>r[key]!=null);return q;},
    insert(value){write=value;operation='insert';return q;},update(value){write=value;operation='update';return q;},delete(){operation='delete';return q;},
    async single(){data[table]??=[];if(operation==='insert'){if(data[table].some(r=>r.id===write.id))return{error:{code:'23505',message:'duplicate id'}};data[table].push({...write,id:write.id||crypto.randomUUID()});}else if(operation==='update'){for(const row of rows()){Object.assign(data[table].find(r=>r.id===row.id),write);}}if(armReadbackFailure&&operation){readbackFailure=true;armReadbackFailure=false;fault.textContent='ยกเลิกจำลองและโหลดใหม่';}return{data:{id:write?.id||rows()[0]?.id||'sample'},error:null};},
    async range(a,b){return readbackFailure?{data:null,error:{message:'จำลองโหลดข้อมูลกลับไม่สำเร็จ'}}:{data:rows().slice(a,b+1),error:null};},then(resolve,reject){if(operation==='delete')data[table]=(data[table]||[]).filter(r=>!rows().some(x=>x.id===r.id));return Promise.resolve({data:rows(),error:null}).then(resolve,reject);}};return q;
  }};
 window.financeSplashStartedAt=performance.now()-800;
 const original=await (await fetch(new URL(screen==='index'?'preview/stability-app.js?v=20261109-stability01':screen+'.js',root))).text();
 const clientImport=/^import\s*\{\s*createClient\s*\}\s*from .*$/m;
 if(!clientImport.test(original))throw Error('หน้าตัวอย่างต้องอัปเดตให้ตรงกับแอป');
 const source=original.replace(clientImport,'const createClient=()=>window.modernDemoDb;').replace(/from '(\.\/[^']+)'/g,(_,path)=>"from '"+new URL(path,root).href+"'").replace(/import\('(\.\/[^']+)'\)/g,(_,path)=>"import('"+new URL(path,root).href+"')");
 const script=document.createElement('script'),blob=URL.createObjectURL(new Blob([source],{type:'text/javascript'}));script.type='module';script.src=blob;document.body.append(script);
 await new Promise((resolve,reject)=>{script.onload=resolve;script.onerror=reject;});URL.revokeObjectURL(blob);
 const navText=await(await fetch(new URL('menu-nav.js?v=20261105-menu02',import.meta.url))).text();
 const navSource=navText.replace("else location.href='./index.html#'+page;","else {const target=new URL(location.href);target.searchParams.delete('screen');target.hash=page;location.href=target.href;}")
 .replace("else location.href='./index.html#capture-'+type;","else {const target=new URL(location.href);target.searchParams.delete('screen');target.hash='capture-'+type;location.href=target.href;}");
 const nav=document.createElement('script'),navBlob=URL.createObjectURL(new Blob([navSource],{type:'text/javascript'}));nav.type='module';nav.src=navBlob;document.body.append(nav);
 await new Promise((resolve,reject)=>{nav.onload=resolve;nav.onerror=reject;});URL.revokeObjectURL(navBlob);
 if(screen!=='index')window.dispatchEvent(new CustomEvent('finance:page',{detail:screen}));
 // The same navigation/actions; only replace decorative emoji with a compact line icon set.
 const icons={dashboard:'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',transactions:'M6 3h12v18l-3-2-3 2-3-2-3 2z M9 8h6 M9 12h6',capture:'M12 5v14 M5 12h14',summary:'M4 20V4 M4 20h17 M8 15l4-5 4 2 5-7',more:'M4 6h16 M4 12h16 M4 18h16'};
 if(!document.documentElement.classList.contains('summary-only-preview'))document.querySelectorAll('.app-nav-tab').forEach(button=>{const path=icons[button.dataset.destination];if(path)button.querySelector('.app-nav-icon').innerHTML='<svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="'+path+'"/></svg>';});
 document.addEventListener('click',event=>{
  const anchor=event.target.closest('a[href]');if(!anchor||anchor.getAttribute('href').startsWith('#'))return;
  const target=new URL(anchor.href,location.href);if(target.protocol==='blob:')return;
  event.preventDefault();const name=target.pathname.split('/').pop(),next=new URL(location.href);
  if(['rent.html','car.html','salary.html'].includes(name)){next.searchParams.set('screen',name.slice(0,-5));next.hash='';location.href=next.href;}
  else if(name==='index.html'||target.pathname===root.pathname){next.searchParams.delete('screen');next.hash=target.hash;location.href=next.href;}
  else window.alert('หน้านี้เป็นตัวอย่าง UI · รายการที่ลองบันทึกจะอยู่เฉพาะในหน้านี้');
 },true);
 // Reuse production ring selection behavior even though this page boots after DOMContentLoaded.
 if(screen==='index'){
 const selectionText=await (await fetch(new URL('summary-proportion.js?v=20261023-quality02',root))).text();
 const selectionSource=selectionText.replace("document.addEventListener('DOMContentLoaded',()=>{",'(()=>{').replace(/}\);\s*$/,'})();');
 const selectionBlob=URL.createObjectURL(new Blob([selectionSource],{type:'text/javascript'})),selectionScript=document.createElement('script');selectionScript.src=selectionBlob;document.body.append(selectionScript);
 await new Promise((resolve,reject)=>{selectionScript.onload=resolve;selectionScript.onerror=reject;});URL.revokeObjectURL(selectionBlob);
 await loadScript('summary-layout.js?v=20261023-quality02&summary=02&period=17');
 const requestedPage=(params.get('page')||location.hash.slice(1));if(['summary','transactions','settings','debts','accounts','categories','bills','budget'].includes(requestedPage))window.dispatchEvent(new CustomEvent('finance:navigate',{detail:requestedPage}));
 }
 window.dispatchEvent(new Event('myfinance:preview-ready'));
}catch(error){document.body.replaceChildren();const message=document.createElement('p');message.className='modern-start';message.textContent='เปิดตัวอย่างไม่สำเร็จ กรุณาโหลดหน้าใหม่';document.body.append(message);console.error(error);}
