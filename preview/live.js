import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const BASE='https://mmvdhopogchcxwlstflk.supabase.co';
const KEY='sb_publishable_PYkDjHN3ULlFW9BavMvAVQ_d77eZZ5W';
const db=createClient(BASE,KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
const gate=document.getElementById('preview-gate');
const gateText=document.getElementById('gate-text');
const loginForm=document.getElementById('preview-login');
const errorEl=document.getElementById('preview-error');
const retry=document.getElementById('preview-retry');
const content=document.querySelector('.shell');
const banner=document.querySelector('.preview');
const state={rows:[],budgets:[],debts:[],bills:[],month:'',filter:'all',type:'expense',loaded:false,user:null};
const $=id=>document.getElementById(id);
const fmt=n=>'฿'+Number(n||0).toLocaleString('th-TH',{minimumFractionDigits:2,maximumFractionDigits:2});
const today=()=>new Date(Date.now()+7*3600000).toISOString().slice(0,10);
const valid=(x)=>Number.isFinite(Number(x))?Number(x):0;
const sum=xs=>Math.round(xs.reduce((s,x)=>s+Math.round(valid(x.amount)*100),0))/100;
function monthLabel(ym){const [y,m]=ym.split('-').map(Number);return new Intl.DateTimeFormat('th-TH',{month:'long',year:'numeric',timeZone:'Asia/Bangkok'}).format(new Date(Date.UTC(y,m-1,15)))}
function iconTile(v){const node=document.createElement('div');node.className='tile';node.textContent=v;return node}
function setGate(message,showLogin=false,error=''){gate.hidden=false;gateText.textContent=message;loginForm.hidden=!showLogin;errorEl.textContent=error;retry.hidden=!error;content.hidden=true}
function showApp(){gate.hidden=true;content.hidden=false;state.loaded=true;banner.textContent='🔒 LIVE PREVIEW · ข้อมูลจริงของบัญชีที่ล็อกอิน · อ่านอย่างเดียว ไม่บันทึกข้อมูล';renderAll()}
async function pages(table,select,userId,order='id'){
 const out=[];for(let offset=0;offset<100000;offset+=500){
  const {data,error}=await db.from(table).select(select).eq('user_id',userId).order(order,{ascending:false}).range(offset,offset+499);
  if(error)throw new Error('โหลด '+table+' ไม่สำเร็จ: '+error.message);
  out.push(...(data||[]));if(!data||data.length<500)return out;
 }
 throw new Error('รายการมีจำนวนมากเกินขอบเขตที่กำหนด')
}
async function refresh(){
 setGate('กำลังตรวจสอบการเข้าสู่ระบบ…');
 try{
  const {data,error}=await db.auth.getUser();
  if(error||!data?.user){setGate('กรุณาเข้าสู่ระบบด้วยบัญชี My Finance เพื่อดูข้อมูลจริง',true);return}
  const user=data.user;state.user=user;
  gateText.textContent='กำลังโหลดข้อมูลจริงของบัญชีคุณ…';
  const [rows,budgets,debts,bills]=await Promise.all([
   pages('transactions','id,description,type,amount,status,transaction_date,created_at,categories(name,icon),accounts(name)',user.id,'transaction_date'),
   pages('budgets','id,name,is_active,monthly_limit,category_names',user.id),
   pages('debts','id,name,debt_type,is_active,original_amount,outstanding_amount,due_day',user.id),
   pages('bills','id,name,is_active,amount,due_day',user.id)
  ]);
  state.rows=rows;state.budgets=budgets;state.debts=debts;state.bills=bills;
  if(!state.month)state.month=today().slice(0,7);
  showApp();
 }catch(e){setGate('โหลดข้อมูลจริงไม่สำเร็จ',false,e?.message||'เกิดข้อผิดพลาดในการเชื่อมต่อ')}
}
loginForm.addEventListener('submit',async e=>{
 e.preventDefault();errorEl.textContent='';const submit=loginForm.querySelector('button[type=submit]');
 submit.disabled=true;gateText.textContent='กำลังเข้าสู่ระบบ…';
 try{
  const email=$('preview-email').value.trim(),password=$('preview-password').value;
  const {error}=await db.auth.signInWithPassword({email,password});
  if(error)throw error;
  $('preview-password').value='';await refresh();
 }catch(err){setGate('เข้าสู่ระบบไม่สำเร็จ',true,err.message||'กรุณาตรวจสอบอีเมลหรือรหัสผ่าน')}
 finally{submit.disabled=false}
});
retry.addEventListener('click',()=>refresh());
function selectedRows(){return state.rows.filter(x=>String(x.transaction_date||'').slice(0,7)===state.month&&x.status!=='cancelled')}
function monthAmounts(){const rows=selectedRows();return {income:sum(rows.filter(x=>x.type==='income')),expense:sum(rows.filter(x=>x.type==='expense'))}}
function allBudget(){const budgets=state.budgets.filter(x=>x.is_active!==false);const names=new Set(budgets.flatMap(x=>Array.isArray(x.category_names)?x.category_names:[]));
 const spend=selectedRows().filter(x=>x.type==='expense'&&names.has(x.categories?.name||''));
 const limit=Math.round(budgets.reduce((s,x)=>s+Math.round(valid(x.monthly_limit)*100),0))/100;
 const used=sum(spend);
 return {used,limit,remain:Math.max(0,limit-used),percentage:limit?Math.round(used/limit*100):null};
}
function td(tag,txt,cls){const e=document.createElement(tag);if(cls)e.className=cls;e.textContent=txt;return e}
function transactionNode(x){
 const d=td('div','', 'item');const tile=iconTile(x.categories?.icon|| (x.type==='income'?'💰':'🧾'));
 const mid=td('div','', 'grow');mid.append(td('div',x.description||'รายการ','mainline'),td('div',(x.categories?.name||'ไม่ระบุหมวด')+' · '+x.transaction_date+(x.accounts?.name?' · '+x.accounts.name:''),'meta'));
 const amount=td('b',(x.type==='income'?'+':'−')+fmt(x.amount),'price '+(x.type==='income'?'green':''));d.append(tile,mid,amount);return d;
}
function renderHome(){
 const amount=monthAmounts(),budget=allBudget();
 $('.big-money').textContent=fmt(amount.income-amount.expense);
 const cells=document.querySelectorAll('#home .slab b');if(cells[0])cells[0].textContent=fmt(amount.income);if(cells[1])cells[1].textContent=fmt(amount.expense);
 const homeBudget=document.querySelector('#home .pane>.card');
 if(homeBudget){
  const heading=homeBudget.querySelector('.heading');
  if(heading)heading.firstChild.textContent='🍜 งบเดือนนี้ ';
  const middle=homeBudget.querySelector('.row');
  if(middle){
   const main=middle.querySelector('.mainline'),meta=middle.querySelector('.meta'),right=middle.lastElementChild;
   if(main)main.textContent='ใช้ไป '+fmt(budget.used);
   if(meta)meta.textContent='จาก '+fmt(budget.limit);
   if(right){right.replaceChildren(td('b',budget.percentage===null?'—':budget.percentage+'%'),td('div',budget.limit?'เหลือ '+fmt(budget.remain):'ยังไม่ตั้งงบ','meta'))}
  }
  const fill=homeBudget.querySelector('.bar>div');
  if(fill)fill.style.width=Math.min(100,Math.max(0,budget.percentage||0))+'%';
 }
 $('home-items').replaceChildren(...selectedRows().slice(0,4).map(transactionNode));
 if(!$('home-items').children.length)$('home-items').append(td('div','ยังไม่มีรายการเดือนนี้','meta'));
}
function renderTransactions(){
 const q=$('search').value.trim().toLowerCase();
 const xs=selectedRows().filter(x=>(state.filter==='all'||x.type===state.filter)&&(!q||((x.description||'')+' '+(x.categories?.name||'')).toLowerCase().includes(q)));
 const root=$('tx-items');root.replaceChildren(...xs.slice(0,100).map(transactionNode));
 if(!xs.length)root.append(td('div','ไม่มีรายการตามเงื่อนไข','meta'));
 if(xs.length>100)root.append(td('div','แสดง 100 รายการแรก · กรุณาค้นหาเพื่อลดผลลัพธ์','meta'));
}
function setFilter(f,button){state.filter=f;document.querySelectorAll('#filters .pill').forEach(x=>x.classList.toggle('active',x===button));renderTransactions()}
function setType(t,button){state.type=t;document.querySelectorAll('#add-types .pill').forEach(x=>x.classList.toggle('active',x===button))}
function renderSummary(){
 const {income,expense}=monthAmounts();
 const target=document.querySelectorAll('#summary .metric b');
 if(target[0])target[0].textContent=fmt(income);if(target[1])target[1].textContent=fmt(expense);
 const map=new Map();
 for(const x of selectedRows().filter(x=>x.type==='expense')){const name=x.categories?.name||'อื่น ๆ';map.set(name,(map.get(name)||0)+valid(x.amount))}
 const sorted=[...map].sort((a,b)=>b[1]-a[1]),colors=['#f5a1a8','#968cf3','#68c2f5','#f1bd6e','#77d4b1','#c2d3f1'];
 const root=document.querySelector('#summary .card');const donut=root.querySelector('.donut');
 donut.dataset.amount=fmt(expense);
 const cumulative=[];let total=0;for(let i=0;i<sorted.length;i++){const portion=expense?sorted[i][1]/expense*100:0;const next=Math.min(100,total+portion);cumulative.push(colors[i%colors.length]+' '+total.toFixed(2)+'% '+next.toFixed(2)+'%');total=next;}
 donut.style.background=cumulative.length?'conic-gradient('+cumulative.join(',')+')':'#e5ebf5';
 root.querySelectorAll('.alt').forEach(n=>n.remove());
 sorted.slice(0,12).forEach(([name,value],i)=>{const row=td('div','','alt');const left=td('span',name);const dot=td('span','','dot');dot.style.background=colors[i%colors.length];left.prepend(dot);row.append(left,td('b',(expense?Math.round(value/expense*100):0)+'%'));root.append(row)});
 if(!sorted.length)root.append(td('div','ยังไม่มีรายจ่ายในเดือนนี้','meta'));
}
function renderBudget(){
 const pane=document.querySelector('#budget .pane');
 pane.querySelectorAll('.card').forEach(e=>e.remove());
 const all=state.budgets.filter(b=>b.is_active!==false);
 if(!all.length){const card=td('div','ยังไม่มีงบประมาณที่เปิดใช้งาน','card');pane.append(card);return}
 all.forEach(b=>{
  const cats=new Set(b.category_names||[]),used=sum(selectedRows().filter(x=>x.type==='expense'&&cats.has(x.categories?.name||'')));
  const limit=valid(b.monthly_limit),percent=limit?Math.round(used/limit*100):0;
  const card=td('div','','card'),head=td('div','','heading');head.append(td('span',b.name||'งบประมาณ'),td('span',limit?percent+'%':'—','blue'));
  const bar=td('div','','bar'),fill=td('div','');fill.style.width=Math.min(100,percent)+'%';if(used>limit&&limit>0)fill.style.background='#f09ca2';bar.append(fill);
  card.append(head,bar,td('div','ใช้ไป '+fmt(used)+' / '+fmt(limit)+' · เหลือ '+fmt(Math.max(0,limit-used)),'meta'));pane.append(card);
 });
}
function renderCards(){
 const root=$('card-items');root.replaceChildren();
 const cards=state.debts.filter(x=>x.debt_type==='credit_card'&&x.is_active!==false).sort((a,b)=>valid(b.outstanding_amount)-valid(a.outstanding_amount));
 if(!cards.length){root.append(td('div','ยังไม่มีบัตรเครดิต','card'));return}
 for(const c of cards){
  const used=valid(c.outstanding_amount),limit=valid(c.original_amount);
  const card=td('div','','card'),head=td('div',c.name||'บัตรเครดิต','heading'),row=td('div','','row');
  row.append(td('span','ยอดค้าง','meta'),td('b',fmt(used),'price'),td('span','','grow'),td('span','เหลือ '+fmt(Math.max(0,limit-used)),'meta'));
  const bar=td('div','','bar'),fill=td('div','');fill.style.width=(limit?Math.min(100,used/limit*100):0)+'%';bar.append(fill);
  card.append(head,row,bar,td('div','วงเงินเต็ม '+fmt(limit),'meta'));root.append(card);
 }
}
function renderCalendar(){
 const grid=$('calendar-grid');grid.replaceChildren();
 ['อา','จ','อ','พ','พฤ','ศ','ส'].forEach(x=>grid.append(td('b',x)));
 const [y,m]=state.month.split('-').map(Number),first=new Date(Date.UTC(y,m-1,1)).getUTCDay(),days=new Date(Date.UTC(y,m,0)).getUTCDate();
 for(let i=0;i<first;i++)grid.append(document.createElement('div'));
 for(let i=1;i<=days;i++){const d=td('button',String(i),'secondary');d.style.padding='8px 0';d.addEventListener('click',()=>{grid.querySelectorAll('button').forEach(b=>b.style.background='#fff');d.style.background='#d6e7ff'});grid.append(d)}
 const report=document.querySelector('#calendar .card+.card');
 if(report){const m=monthAmounts();report.textContent='รายรับ '+fmt(m.income)+' · รายจ่าย '+fmt(m.expense)}
}
function renderMonthPicker(){
 const input=$('monthPicker');input.replaceChildren();
 const months=new Set([today().slice(0,7),...state.rows.map(x=>String(x.transaction_date).slice(0,7))].filter(x=>/^\d{4}-\d{2}$/.test(x)));
 [...months].sort().reverse().forEach(ym=>{const o=document.createElement('option');o.value=ym;o.textContent=monthLabel(ym);input.append(o)});
 if(!months.has(state.month)){const o=document.createElement('option');o.value=state.month;o.textContent=monthLabel(state.month);input.append(o)}
 input.value=state.month;
 document.querySelectorAll('#summary .page-note,#budget .page-note,#calendar .page-note').forEach(el=>{el.textContent=monthLabel(state.month)+' · ข้อมูลจริง'});
 const h=document.querySelector('#calendar .heading');if(h)h.textContent=monthLabel(state.month);
}
function renderAll(){renderMonthPicker();renderHome();renderTransactions();renderSummary();renderBudget();renderCards();renderCalendar()}
function changeMonth(value){if(!/^\d{4}-\d{2}$/.test(value))return;state.month=value;renderAll()}
function go(id){
 if(!state.loaded)return;
 if(!$(id)){const names={bills:'บิลประจำ',salary:'เงินเดือน',rent:'ค่าห้องเช่า',car:'รถของฉัน',accounts:'บัญชี',categories:'หมวดหมู่',settings:'ตั้งค่า'};
 $('extra-title').textContent=names[id]||'รายละเอียด';$('extra-content').textContent='หน้าทดลอง '+(names[id]||'')+' ยังไม่ได้ออกแบบใน Preview นี้ · ไม่มีการแก้ข้อมูลจริง';id='extra'}
 document.querySelectorAll('.screen').forEach(el=>el.classList.toggle('active',el.id===id));
 document.querySelectorAll('.nav [data-to]').forEach(el=>el.classList.toggle('active',el.dataset.to===id));
 window.scrollTo({top:0,behavior:'instant'});
}
function startAdd(cat){go('add');const select=$('category');if([...select.options].some(o=>o.value===cat))select.value=cat}
function saveMock(e){e.preventDefault();$('test-save-message').textContent='โหมด Preview อ่านข้อมูลจริงอย่างเดียว รายการนี้ไม่ได้ถูกบันทึก';$('test-save-message').hidden=false}
Object.assign(window,{go,changeMonth,setFilter,setType,startAdd,saveMock});
refresh();
