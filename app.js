import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4'
const url='https://'+'mmvdhopogchcxwlstflk'+'.supabase.co'
const key='sb_'+'publishable_'+'PYkDjHN3ULlFW9BavMvAVQ_'+'d77eZZ5W'
const supabase=createClient(url,key)
const $=id=>document.getElementById(id)
const money=n=>new Intl.NumberFormat('th-TH',{style:'currency',currency:'THB',maximumFractionDigits:2}).format(Number(n||0))
const fmtDate=s=>s?new Intl.DateTimeFormat('th-TH',{day:'numeric',month:'short',year:'2-digit'}).format(new Date(s+'T00:00:00')):''
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
let mode='login',user=null,categories=[],accounts=[],transactions=[],bills=[],debts=[],budgets=[],channel=null,editing={type:null,id:null},trendChart=null,categoryChart2=null,pieChart=null

function toast(t,type=''){const e=$('authMsg');if(!e)return;e.textContent=t;e.className='notice '+type;e.classList.remove('hidden')}
function setAuthMode(m){mode=m;$('tabLogin').classList.toggle('active',m==='login');$('tabSignup').classList.toggle('active',m==='signup');$('authBtn').textContent=m==='login'?'เข้าสู่ระบบ':'สร้างบัญชี';$('password').autocomplete=m==='login'?'current-password':'new-password';$('authMsg').classList.add('hidden')}
$('tabLogin').onclick=()=>setAuthMode('login');$('tabSignup').onclick=()=>setAuthMode('signup')
$('authBtn').onclick=async()=>{const email=$('email').value.trim(),password=$('password').value;if(!email||password.length<6){toast('กรอกอีเมลและรหัสผ่านอย่างน้อย 6 ตัวอักษร','err');return}
 $('authBtn').disabled=true
 try{if(mode==='signup'){const {data,error}=await supabase.auth.signUp({email,password,options:{data:{display_name:'มิว'}}});if(error)throw error;if(!data.session){toast('สมัครแล้ว ✅ กรุณายืนยันอีเมลก่อน','ok');return}await boot(data.user)}
 else{const {data,error}=await supabase.auth.signInWithPassword({email,password});if(error)throw error;await boot(data.user)}}catch(e){toast(e.message||'เกิดข้อผิดพลาด','err')}finally{$('authBtn').disabled=false}}
$('logout').onclick=async()=>{await supabase.auth.signOut();location.reload()}

async function boot(u){user=u;$('authScreen').classList.add('hidden');$('app').classList.remove('hidden');$('userEmail').textContent=u.email||'';await loadAll();subscribe()}
async function loadAll(){
 const [c,a,t,b,d,g]=await Promise.all([
  supabase.from('categories').select('*').order('sort_order').order('name'),
  supabase.from('accounts').select('*').order('created_at'),
  supabase.from('transactions').select('*,categories(name,icon),accounts(name)').order('transaction_date',{ascending:false}).order('created_at',{ascending:false}).limit(1000),
  supabase.from('bills').select('*,categories(name),accounts(name)').order('due_day'),
  supabase.from('debts').select('*').order('created_at'),
  supabase.from('budgets').select('*').order('created_at')
 ])
 for(const r of [c,a,t,b,d,g])if(r.error)console.error(r.error)
 categories=c.data||[];accounts=a.data||[];transactions=t.data||[];bills=b.data||[];debts=d.data||[];budgets=g.data||[];renderAll()
}
function renderAll(){renderDashboard();renderTransactions();renderCategories();renderAccounts();renderBills();renderDebts();renderBudget();renderSummary();fillTxSelectors()}
function showAppToast(message){
 const el=$('appToast'); if(!el)return; el.textContent=message; el.classList.remove('hidden'); clearTimeout(window.__toastTimer); window.__toastTimer=setTimeout(()=>el.classList.add('hidden'),2200)
}
function quickCategoryMatch(label){
 const aliases={อาหาร:['อาหาร'],กาแฟ:['อาหาร'],รถ:['รถยนต์','เดินทาง'],ซื้อของ:['ช้อปปิ้ง'],จ่ายบัตร:['หนี้/ผ่อน'],บิล:['บิล/สาธารณูปโภค']}
 const names=aliases[label]||[label]
 return categories.find(c=>c.type==='expense'&&names.includes(c.name))||categories.find(c=>c.type==='expense')
}
window.quickAdd=(label,desc='')=>{
 const cat=quickCategoryMatch(label); openTx(); $('txType').value='expense'; fillTxSelectors(); if(cat)$('txCategory').value=cat.id; $('txDesc').value=desc||label; renderCardPaymentSuggestions(); if(label==='จ่ายบัตร'&&debts.some(d=>d.is_active&&Number(d.outstanding_amount||0)>0))$('cardPaymentSuggest')?.scrollIntoView({behavior:'smooth',block:'center'}); else $('txAmount').focus()
}
function nextDueDate(day){
 const now=new Date(),y=now.getFullYear(),m=now.getMonth(); let d=new Date(y,m,Math.min(Number(day||28),new Date(y,m+1,0).getDate()))
 if(d<new Date(y,m,now.getDate())){const nm=m+1;d=new Date(y,nm,Math.min(Number(day||28),new Date(y,nm+1,0).getDate()))}
 return d
}

const dailyMessages = [
 'วันนี้มีอะไรดี ๆ รอมิวอยู่บ้างนะ ☀️',
 'แวะมาดูแลเงินกันสักนิดนะมิว 💙',
 'มิว วันนี้อยากเก็บเงินไว้ทำอะไรดี ✨',
 'วันใหม่ เริ่มจากเรื่องเล็ก ๆ ก็พอ 🌱',
 'กาแฟพร้อม แล้วกระเป๋าล่ะมิว ☕',
 'วันนี้ใช้เงินกับสิ่งที่มิวชอบได้เลย 🌷',
 'เหนื่อยก็พัก แล้วค่อยมาเล่าให้ฟังนะ 💙',
 'มิว วันนี้มีรายการไหนอยากจดไว้ไหม 📝',
 'เก็บทีละนิด ก็เข้าใกล้สิ่งที่อยากได้ 🌱',
 'วันนี้ขอให้ตัวเลขใจดีกับมิวนะ 😄',
 'มิว แวะเช็กเงินก่อนออกไปลุยกัน 🚀',
 'ซื้อความสุขบ้าง แล้วเผื่อเงินให้พรุ่งนี้ด้วย 🌈',
 'วันนี้ไม่ต้องเป๊ะทุกอย่างก็ได้มิว 💙',
 'มิว มีเป้าหมายเล็ก ๆ ของวันนี้หรือยัง 🎯',
 'เรื่องเงินค่อย ๆ จัดการไปด้วยกันนะ 🤝',
 'กลับมาแล้วเหรอมิว วันนี้เป็นยังไงบ้าง 🌤️',
 'เงินเข้าเงินออก มาเล่าให้นิลินฟังได้เลย 🧾',
 'มิว วันนี้ให้รางวัลตัวเองแบบไหนดี 🎁',
 'บันทึกนิดเดียว เดี๋ยวที่เหลือนิลินรวมให้ ✨',
 'วันนี้ขอให้มิวมีเรื่องให้ยิ้มเยอะ ๆ 😊',
 'กระเป๋าพร้อมไปกับมิวทุกวัน 👛',
 'มิว ลองดูว่าเดือนนี้เข้าใกล้เป้าหมายแค่ไหน 🌟',
 'วันธรรมดา ก็มีความสุขเล็ก ๆ ได้ 🍃',
 'มิว วันนี้มีเงินเหลือเก็บสักนิดไหม 🪙',
 'แวะพักตรงนี้ แล้วค่อยไปต่อก็ได้นะ 💙',
 'วันนี้อยากกินอะไร อย่าลืมจดด้วยนะ 🍜',
 'มิว มาดูว่าเงินเดินทางไปไหนบ้าง 🔎',
 'จดวันนี้ไว้ จะได้ไม่ต้องนึกย้อนหลัง 📝',
 'เริ่มวันด้วยใจเบา ๆ นะมิว 🌼',
 'มิว วันนี้เลือกสิ่งที่คุ้มกับความสุขของเรา ✨',
 'นิลินอยู่ตรงนี้ มาเช็กเงินกันได้เลย 💙'
];
let dailyGreetingDate = '';
function refreshDailyGreeting() {
 const parts = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit'
 }).formatToParts(new Date());
 const part = type => parts.find(p => p.type === type).value;
 const dayKey = part('year') + '-' + part('month') + '-' + part('day');
 if (dayKey === dailyGreetingDate) return;
 const ordinal = Math.floor(Date.UTC(Number(part('year')), Number(part('month')) - 1, Number(part('day'))) / 86400000);
 const heading = $('helloTitle');
 if (heading) heading.textContent = dailyMessages[ordinal % dailyMessages.length];
 dailyGreetingDate = dayKey;
}
setInterval(refreshDailyGreeting, 60000);
document.addEventListener('visibilitychange', () => {
 if (!document.hidden) refreshDailyGreeting();
});

function renderDashboard(){
 refreshDailyGreeting();
 const now=new Date(),today=now.toISOString().slice(0,10),y=now.getFullYear(),m=now.getMonth()
 const monthly=transactions.filter(x=>{const d=new Date(x.transaction_date+'T00:00:00');return d.getFullYear()===y&&d.getMonth()===m&&x.status!=='cancelled'})
 const prevDate=new Date(y,m-1,1),py=prevDate.getFullYear(),pm=prevDate.getMonth()
 const previous=transactions.filter(x=>{const d=new Date(x.transaction_date+'T00:00:00');return d.getFullYear()===py&&d.getMonth()===pm&&x.status!=='cancelled'})
 const inc=monthly.filter(x=>x.type==='income').reduce((s,x)=>s+Number(x.amount),0)
 const exp=monthly.filter(x=>x.type==='expense').reduce((s,x)=>s+Number(x.amount),0)
 const prevExp=previous.filter(x=>x.type==='expense').reduce((s,x)=>s+Number(x.amount),0)
 const todayRows=monthly.filter(x=>x.type==='expense'&&x.transaction_date===today),todaySpent=todayRows.reduce((s,x)=>s+Number(x.amount),0)
 const bsum=budgetTotals(),dailyLeft=Math.max(0,bsum.daily-todaySpent),pct=bsum.limit?Math.min(100,bsum.spent/bsum.limit*100):0
 $('todayLabel').textContent=now.toLocaleDateString('th-TH',{weekday:'long',day:'numeric',month:'long',year:'numeric'})
 $('monthLabel').textContent=now.toLocaleDateString('th-TH',{month:'long',year:'numeric'})
 $('todaySpent').textContent=money(todaySpent);$('todayCount').textContent=todayRows.length+' รายการ'
 $('todayCanSpend').textContent=money(dailyLeft);$('todayCanSpendHint').textContent=bsum.limit?'จากงบเฉลี่ยต่อวันที่เหลือ':'ยังไม่ได้ตั้งงบ'
 $('incomeTotal').textContent=money(inc);$('expenseTotal').textContent=money(exp);$('balanceTotal').textContent=money(inc-exp)
 $('debtTotal').textContent=money(debts.filter(x=>x.is_active).reduce((s,x)=>s+Number(x.outstanding_amount||0),0))
 $('budgetSpentDash').textContent=money(bsum.spent);$('budgetLimitDash').textContent=money(bsum.limit);$('budgetRemainDash').textContent=money(bsum.remain);$('budgetDailyDash').textContent='ใช้ได้เฉลี่ยวันละ '+money(bsum.daily)
 $('budgetPctDash').textContent=Math.round(pct)+'%';$('budgetProgressDash').style.width=pct+'%';$('budgetProgressDash').classList.toggle('over',bsum.spent>bsum.limit)

 const quick=[
  ['🍜','อาหาร','อาหาร'],['☕','กาแฟ','กาแฟ'],['🚗','รถ','รถ'],['🛍️','ซื้อของ','ซื้อของ'],['💳','จ่ายบัตร','จ่ายบัตร'],['🧾','บิล','บิล']
 ]
 $('quickAdd').innerHTML=quick.map(([ico,label,desc])=>'<button class="quick-btn" onclick="quickAdd(\''+label+'\',\''+desc+'\')"><span>'+ico+'</span><b>'+label+'</b></button>').join('')+'<button class="quick-btn more" onclick="openTx()"><span>＋</span><b>อื่น ๆ</b></button>'

 const sums={};monthly.filter(x=>x.type==='expense').forEach(x=>{const n=x.categories?.name||'อื่นๆ';sums[n]=(sums[n]||0)+Number(x.amount)})
 const sorted=Object.entries(sums).sort((a,b)=>b[1]-a[1]),top=sorted[0]
 const insights=[]
 if(top)insights.push('เดือนนี้ใช้มากสุดที่ '+top[0]+' '+money(top[1]))
 if(prevExp>0){const diff=(exp-prevExp)/prevExp*100;insights.push(diff>0?'รายจ่ายมากกว่าเดือนก่อน '+Math.abs(diff).toFixed(0)+'%':'รายจ่ายลดลงจากเดือนก่อน '+Math.abs(diff).toFixed(0)+'%')}
 if(bsum.limit)insights.push(bsum.spent>bsum.limit?'งบ 4,000 เกินแล้ว '+money(bsum.spent-bsum.limit):'งบใช้ทั่วไปยังเหลือ '+money(bsum.remain))
 if(inc>0)insights.push('เดือนนี้เก็บเหลือ '+((inc-exp)/inc*100).toFixed(0)+'% ของรายรับ')
 $('insightList').innerHTML=insights.length?insights.slice(0,4).map((t,k)=>'<div class="insight-item"><span>'+['✨','📊','🎯','💙'][k%4]+'</span><div>'+esc(t)+'</div></div>').join(''):'<div class="empty">เริ่มบันทึกรายการ แล้วนิลินจะสรุปให้ตรงนี้ ✨</div>'

 const upcoming=[
  ...bills.filter(x=>x.is_active).map(x=>({kind:'บิล',name:x.name,amount:Number(x.amount||0),due:nextDueDate(x.due_day)})),
  ...debts.filter(x=>x.is_active&&Number(x.outstanding_amount||0)>0).map(x=>({kind:'บัตร/สินเชื่อ',name:x.name,amount:Number(x.installment_amount||0)||Number(x.outstanding_amount||0),due:nextDueDate(x.due_day)}))
 ].sort((a,b)=>a.due-b.due).slice(0,5)
 $('upcomingList').innerHTML=upcoming.length?upcoming.map(x=>{const days=Math.ceil((x.due-new Date(y,m,now.getDate()))/86400000);return '<div class="upcoming-item"><div><b>'+esc(x.name)+'</b><div class="muted">'+x.kind+' · '+(days===0?'วันนี้':'อีก '+days+' วัน')+'</div></div><div><b>'+money(x.amount)+'</b><div class="muted">'+x.due.toLocaleDateString('th-TH',{day:'numeric',month:'short'})+'</div></div></div>'}).join(''):'<div class="empty">ไม่มีรายการใกล้ครบกำหนด 🎉</div>'

 renderTxList($('recentList'),transactions.slice(0,8))
 const max=Math.max(1,...Object.values(sums));$('categoryChart').innerHTML=Object.keys(sums).length?sorted.slice(0,8).map(([n,v])=>'<div class="bar-row"><span>'+esc(n)+'</span><div class="barbg"><div class="barfill" style="width:'+Math.round(v/max*100)+'%"></div></div><b>'+money(v)+'</b></div>').join(''):'<div class="empty">ยังไม่มีรายจ่ายเดือนนี้</div>'
}
function filteredTx(){let a=[...transactions],f=$('txFilterType').value,q=$('txSearch').value.trim().toLowerCase(),cat=$('txFilterCategory').value,mon=$('txFilterMonth').value;if(f!=='all')a=a.filter(x=>x.type===f);if(cat)a=a.filter(x=>x.category_id===cat);if(mon)a=a.filter(x=>String(x.transaction_date).slice(0,7)===mon);if(q)a=a.filter(x=>(x.description+' '+(x.categories?.name||'')+' '+(x.note||'')).toLowerCase().includes(q));return a}
function renderTransactions(){const arr=filteredTx();renderTxList($('txList'),arr);$('txCount').textContent=arr.length+' รายการ'}
function renderTxList(el,arr){el.innerHTML=arr.length?arr.map(x=>'<div class="item"><div><b>'+(x.categories?.icon||'🧾')+' '+esc(x.description)+'</b><span class="muted">'+fmtDate(x.transaction_date)+' · '+esc(x.categories?.name||'ไม่ระบุหมวด')+(x.accounts?.name?' · '+esc(x.accounts.name):'')+'</span></div><span class="amount '+(x.type==='income'?'income':'expense')+'">'+(x.type==='income'?'+':'-')+money(x.amount)+'</span><div class="actions"><button class="btn small soft" data-edit="tx" data-id="'+x.id+'">แก้ไข</button><button class="btn small danger" data-del="transactions" data-id="'+x.id+'">ลบ</button></div></div>').join(''):'<div class="empty">ยังไม่มีรายการ</div>'}
function renderCategories(){for(const type of ['expense','income']){const el=$(type==='expense'?'expenseCats':'incomeCats'),arr=categories.filter(c=>c.type===type);el.innerHTML=arr.length?arr.map(c=>'<div class="category-card"><div class="left"><span class="icon">'+esc(c.icon||'🏷️')+'</span><span class="name">'+esc(c.name)+'</span></div><div class="actions"><button class="btn small soft" data-edit="category" data-id="'+c.id+'">แก้</button><button class="btn small danger" data-del="categories" data-id="'+c.id+'">ลบ</button></div></div>').join(''):'<div class="empty">ยังไม่มีหมวด</div>'}}
function renderAccounts(){$('accountList').innerHTML=accounts.length?accounts.map(a=>'<div class="item"><div><b>🏦 '+esc(a.name)+'</b><span class="muted">'+esc(a.account_type)+(a.note?' · '+esc(a.note):'')+'</span></div><span class="amount">'+money(a.opening_balance)+'</span><div class="actions"><button class="btn small soft" data-edit="account" data-id="'+a.id+'">แก้ไข</button><button class="btn small danger" data-del="accounts" data-id="'+a.id+'">ลบ</button></div></div>').join(''):'<div class="empty">ยังไม่มีบัญชี</div>'}
function renderBills(){$('billList').innerHTML=bills.length?bills.map(b=>'<div class="item"><div><b>📅 '+esc(b.name)+'</b><span class="muted">ทุกวันที่ '+(b.due_day||'-')+' · '+esc(b.categories?.name||'ไม่ระบุหมวด')+'</span></div><span class="amount expense">'+money(b.amount)+'</span><div class="actions"><button class="btn small soft" data-edit="bill" data-id="'+b.id+'">แก้ไข</button><button class="btn small danger" data-del="bills" data-id="'+b.id+'">ลบ</button></div></div>').join(''):'<div class="empty">ยังไม่มีบิล</div>'}
function renderDebts(){$('debtList').innerHTML=debts.length?debts.map(d=>{const limit=Number(d.original_amount||0),used=Number(d.outstanding_amount||0),available=Math.max(0,limit-used),pct=limit?Math.min(100,used/limit*100):0;return '<div class="card credit-card"><div class="row"><div><b>💳 '+esc(d.name)+'</b><div class="muted">ครบกำหนดวันที่ '+(d.due_day||'-')+(Number(d.installment_amount||0)>0?' · จ่ายรอบนี้ '+money(d.installment_amount):'')+'</div></div><div class="actions"><button class="btn small soft" data-edit="debt" data-id="'+d.id+'">แก้ไข</button><button class="btn small danger" data-del="debts" data-id="'+d.id+'">ลบ</button></div></div><div class="credit-stats"><div><span>ยอดคงเหลือบัตร</span><b class="expense">'+money(used)+'</b></div><div><span>วงเงิน</span><b>'+money(limit)+'</b></div><div><span>วงเงินเหลือใช้</span><b class="income">'+money(available)+'</b></div></div><div class="budget-progress"><div class="credit-used" style="width:'+pct+'%"></div></div><div class="muted" style="margin-top:7px">ใช้วงเงินไป '+pct.toFixed(0)+'%</div></div>'}).join(''):'<div class="empty">ยังไม่มีบัตรหรือสินเชื่อ</div>'}
function budgetSpent(b){
 const now=new Date(),ym=now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0'),names=b.category_names||[]
 return transactions.filter(x=>x.type==='expense'&&x.status!=='cancelled'&&String(x.transaction_date).slice(0,7)===ym&&names.includes(x.categories?.name||'')).reduce((s,x)=>s+Number(x.amount||0),0)
}
function budgetTotals(){
 const active=budgets.filter(b=>b.is_active),limit=active.reduce((s,b)=>s+Number(b.monthly_limit||0),0),spent=active.reduce((s,b)=>s+budgetSpent(b),0),remain=Math.max(0,limit-spent),now=new Date(),daysLeft=Math.max(1,new Date(now.getFullYear(),now.getMonth()+1,0).getDate()-now.getDate()+1)
 return{limit,spent,remain,daily:remain/daysLeft}
}
function renderBudget(){
 const t=budgetTotals();$('budgetLimitTotal').textContent=money(t.limit);$('budgetSpentTotal').textContent=money(t.spent);$('budgetRemainTotal').textContent=money(t.remain);$('budgetDailyTotal').textContent='ใช้ได้วันละ '+money(t.daily)+' จนจบเดือน'
 $('budgetList').innerHTML=budgets.length?budgets.map(b=>{const spent=budgetSpent(b),limit=Number(b.monthly_limit||0),remain=Math.max(0,limit-spent),pct=limit?Math.min(100,spent/limit*100):0,status=spent>limit?'เกินงบ '+money(spent-limit):'เหลือ '+money(remain);return '<div class="card budget-card"><div class="row"><div><h3 style="margin:0">'+esc(b.name)+'</h3><div class="muted">'+esc((b.category_names||[]).join(' · '))+'</div></div><div class="actions"><button class="btn small soft" data-edit="budget" data-id="'+b.id+'">แก้ไข</button><button class="btn small danger" data-del="budgets" data-id="'+b.id+'">ลบ</button></div></div><div class="budget-numbers"><b>'+money(spent)+'</b><span>/ '+money(limit)+'</span></div><div class="budget-progress"><div class="budget-progress-fill '+(spent>limit?'over':'')+'" style="width:'+pct+'%"></div></div><div class="'+(spent>limit?'expense':'income')+'" style="font-weight:800;margin-top:8px">'+status+'</div></div>'}).join(''):'<div class="card empty">ยังไม่มีงบประมาณ</div>'
}
function excelGroup(x){
 const cat=x.categories?.name||'อื่นๆ',text=((x.description||'')+' '+(x.note||'')).toLowerCase()
 if(cat==='ที่พัก')return 'ค่าห้อง'
 if(cat==='หนี้/ผ่อน')return 'ชำระบัตร/สินเชื่อ'
 if(cat==='บิล/สาธารณูปโภค')return 'รายจ่ายประจำ'
 if(cat==='รถยนต์'){
  if(/ค่างวด|ผ่อนรถ|รถ – มิว|รถ - มิว/.test(text))return 'ค่างวดรถ'
  if(/ซ่อม|ประกัน|ภาษี|น้ำมันเครื่อง|เช็คระยะ|บำรุง/.test(text))return 'ซ่อม/ประกัน/ภาษีรถ'
  return 'รถยนต์อื่น ๆ'
 }
 return cat
}
function setupSummaryFilters(){
 const years=[...new Set(transactions.map(x=>String(x.transaction_date).slice(0,4)).filter(Boolean))].sort((a,b)=>b.localeCompare(a))
 const ys=$('summaryYear'),current=ys.value||String(new Date().getFullYear())
 ys.innerHTML=years.map(y=>'<option value="'+y+'" '+(y===current?'selected':'')+'>'+y+'</option>').join('')
 if(!ys.value&&years.length)ys.value=years[0]
 const ms=$('summaryMonth'),mv=ms.value||'all'
 ms.innerHTML='<option value="all">ทุกเดือน</option>'+Array.from({length:12},(_,i)=>{const v=String(i+1).padStart(2,'0'),label=new Date(2026,i,1).toLocaleDateString('th-TH',{month:'long'});return '<option value="'+v+'" '+(v===mv?'selected':'')+'>'+label+'</option>'}).join('')
}
function renderSummary(){
 setupSummaryFilters()
 const year=$('summaryYear').value,month=$('summaryMonth').value
 const base=transactions.filter(x=>x.status!=='cancelled'&&String(x.transaction_date).slice(0,4)===year)
 const rows=month==='all'?base:base.filter(x=>String(x.transaction_date).slice(5,7)===month)
 const inc=rows.filter(x=>x.type==='income').reduce((s,x)=>s+Number(x.amount),0),exp=rows.filter(x=>x.type==='expense').reduce((s,x)=>s+Number(x.amount),0)
 $('sumIncome').textContent=money(inc);$('sumExpense').textContent=money(exp);$('sumBalance').textContent=money(inc-exp)
 const grouped=rows.filter(x=>x.type==='expense').reduce((o,x)=>{const g=excelGroup(x);o[g]=(o[g]||0)+Number(x.amount);return o},{})
 $('sumDebtPay').textContent=money(grouped['ชำระบัตร/สินเชื่อ']||0)
 $('sumHomeCar').textContent=money((grouped['ค่าห้อง']||0)+(grouped['ค่างวดรถ']||0)+(grouped['ซ่อม/ประกัน/ภาษีรถ']||0))
 $('sumRecurring').textContent=money(grouped['รายจ่ายประจำ']||0)

 const monthKeys=Array.from({length:12},(_,i)=>year+'-'+String(i+1).padStart(2,'0'))
 const monthLabels=monthKeys.map(k=>new Date(Number(k.slice(0,4)),Number(k.slice(5,7))-1,1).toLocaleDateString('th-TH',{month:'short'}))
 const monthly=monthKeys.map(k=>{const r=base.filter(x=>String(x.transaction_date).slice(0,7)===k);const income=r.filter(x=>x.type==='income').reduce((s,x)=>s+Number(x.amount),0),expense=r.filter(x=>x.type==='expense').reduce((s,x)=>s+Number(x.amount),0);return{income,expense,balance:income-expense,count:r.length}})
 const moneyFmt=v=>new Intl.NumberFormat('th-TH',{maximumFractionDigits:0}).format(v)
 if(trendChart)trendChart.destroy()
 trendChart=new Chart($('monthlyTrendChart'),{data:{labels:monthLabels,datasets:[
  {type:'bar',label:'รายรับ',data:monthly.map(x=>x.income),backgroundColor:'rgba(16,185,129,.72)',borderRadius:7},
  {type:'bar',label:'รายจ่าย',data:monthly.map(x=>x.expense),backgroundColor:'rgba(239,68,68,.70)',borderRadius:7},
  {type:'line',label:'คงเหลือ',data:monthly.map(x=>x.balance),borderColor:'#4f46e5',backgroundColor:'#4f46e5',borderWidth:3,tension:.3,pointRadius:3}
 ]},options:{responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},plugins:{legend:{position:'bottom'},tooltip:{callbacks:{label:c=>c.dataset.label+': '+money(c.raw)}}},scales:{y:{ticks:{callback:v=>'฿'+moneyFmt(v)},grid:{color:'rgba(148,163,184,.15)'}},x:{grid:{display:false}}}}})

 const priority=['ค่าห้อง','ค่างวดรถ','ชำระบัตร/สินเชื่อ','รายจ่ายประจำ','ซ่อม/ประกัน/ภาษีรถ']
 const other=[...new Set(base.filter(x=>x.type==='expense').map(excelGroup).filter(x=>!priority.includes(x)))].sort()
 const cats=[...priority,...other].filter(g=>base.some(x=>x.type==='expense'&&excelGroup(x)===g))
 const monthlyByCat=cats.map(g=>monthKeys.map(k=>base.filter(x=>x.type==='expense'&&String(x.transaction_date).slice(0,7)===k&&excelGroup(x)===g).reduce((s,x)=>s+Number(x.amount),0)))
 if(categoryChart2)categoryChart2.destroy()
 const palette=['#6366f1','#f59e0b','#ef4444','#06b6d4','#8b5cf6','#10b981','#ec4899','#64748b','#84cc16','#f97316','#14b8a6','#a855f7']
 categoryChart2=new Chart($('monthlyCategoryChart'),{type:'bar',data:{labels:monthLabels,datasets:cats.map((g,idx)=>({label:g,data:monthlyByCat[idx],backgroundColor:palette[idx%palette.length],borderRadius:4}))},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom'},tooltip:{callbacks:{label:c=>c.dataset.label+': '+money(c.raw)}}},scales:{x:{stacked:true,grid:{display:false}},y:{stacked:true,ticks:{callback:v=>'฿'+moneyFmt(v)},grid:{color:'rgba(148,163,184,.15)'}}}}})

 const pieCats=Object.entries(grouped).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1])
 if(pieChart)pieChart.destroy()
 pieChart=new Chart($('categoryPieChart'),{type:'doughnut',data:{labels:pieCats.map(x=>x[0]),datasets:[{data:pieCats.map(x=>x[1]),backgroundColor:pieCats.map((_,i)=>palette[i%palette.length]),borderWidth:0}]},options:{responsive:true,maintainAspectRatio:false,cutout:'62%',plugins:{legend:{position:'bottom'},tooltip:{callbacks:{label:c=>c.label+': '+money(c.raw)+' ('+((c.raw/(exp||1))*100).toFixed(1)+'%)'}}}}})

 const visibleMonths=month==='all'?monthKeys:[year+'-'+month]
 const visibleMonthly=visibleMonths.map(k=>{const idx=monthKeys.indexOf(k);return [k,monthly[idx]]})
 $('summaryTable').innerHTML=visibleMonthly.length?'<div class="table-wrap"><table class="table"><thead><tr><th>เดือน</th><th>รายรับ</th><th>รายจ่าย</th><th>คงเหลือ</th><th>รายการ</th></tr></thead><tbody>'+visibleMonthly.map(([k,v])=>{const label=new Date(Number(k.slice(0,4)),Number(k.slice(5,7))-1,1).toLocaleDateString('th-TH',{month:'long',year:'numeric'});return '<tr><td>'+label+'</td><td class="income">'+money(v.income)+'</td><td class="expense">'+money(v.expense)+'</td><td class="balance">'+money(v.balance)+'</td><td>'+v.count+'</td></tr>'}).join('')+'</tbody></table></div>':'<div class="empty">ยังไม่มีข้อมูล</div>'

 const matrixCats=cats.length?cats:['ไม่มีข้อมูล']
 const headers=visibleMonths.map(k=>new Date(Number(k.slice(0,4)),Number(k.slice(5,7))-1,1).toLocaleDateString('th-TH',{month:'short'}))
 $('categoryMonthTable').innerHTML=cats.length?'<div class="table-wrap"><table class="table"><thead><tr><th>หมวด</th>'+headers.map(h=>'<th>'+h+'</th>').join('')+'<th>รวม</th></tr></thead><tbody>'+matrixCats.map(g=>{const vals=visibleMonths.map(k=>base.filter(x=>x.type==='expense'&&String(x.transaction_date).slice(0,7)===k&&excelGroup(x)===g).reduce((s,x)=>s+Number(x.amount),0));return '<tr><td>'+esc(g)+'</td>'+vals.map(v=>'<td>'+money(v)+'</td>').join('')+'<td><b>'+money(vals.reduce((a,b)=>a+b,0))+'</b></td></tr>'}).join('')+'</tbody></table></div>':'<div class="empty">ยังไม่มีข้อมูลรายจ่าย</div>'
}
function renderCardPaymentSuggestions(){
 const box=$('cardPaymentSuggest'),list=$('cardPaymentList'); if(!box||!list)return
 const cat=categories.find(c=>c.id===$('txCategory').value),show=$('txType').value==='expense'&&cat?.name==='หนี้/ผ่อน'
 box.classList.toggle('hidden',!show)
 if(!show)return
 const active=debts.filter(d=>d.is_active&&Number(d.outstanding_amount||0)>0)
 list.innerHTML=active.length?active.map(d=>{
  const due=Number(d.installment_amount||0),balance=Number(d.outstanding_amount||0),suggest=due>0?due:balance
  return '<button type="button" class="payment-pick" data-pay-debt="'+d.id+'"><span class="pay-icon">💳</span><span><b>'+esc(d.name)+'</b><small>ยอดคงเหลือ '+money(balance)+(due>0?' · รอบนี้ '+money(due):'')+'</small></span><strong>'+money(suggest)+'</strong></button>'
 }).join(''):'<div class="empty">ยังไม่มีบัตร/สินเชื่อที่มียอดคงเหลือ</div>'
}
function fillTxSelectors(){
 const currentCat=$('txCategory').value
 $('txCategory').innerHTML=categories.filter(c=>c.type===$('txType').value).map(c=>'<option value="'+c.id+'">'+esc((c.icon||'')+' '+c.name)+'</option>').join('')
 if(currentCat&&[...$('txCategory').options].some(o=>o.value===currentCat))$('txCategory').value=currentCat
 $('txAccount').innerHTML='<option value="">ไม่ระบุบัญชี</option>'+accounts.map(a=>'<option value="'+a.id+'">'+esc(a.name)+'</option>').join('')
 $('txFilterCategory').innerHTML='<option value="">ทุกหมวด</option>'+categories.map(c=>'<option value="'+c.id+'">'+esc((c.icon||'')+' '+c.name)+'</option>').join('')
 renderCardPaymentSuggestions()
}

function showPage(name){document.querySelectorAll('.page').forEach(x=>x.classList.add('hidden'));$(name+'Page').classList.remove('hidden');document.querySelectorAll('.navbtn').forEach(x=>x.classList.toggle('active',x.dataset.page===name))}
document.querySelectorAll('.navbtn[data-page]').forEach(b=>b.onclick=()=>showPage(b.dataset.page));document.addEventListener('click',e=>{const j=e.target.closest('[data-page-jump]');if(j)showPage(j.dataset.pageJump)})
for(const id of ['txFilterType','txFilterCategory','txFilterMonth'])$(id).onchange=renderTransactions;$('txSearch').oninput=renderTransactions;$('txType').onchange=fillTxSelectors;$('txCategory').onchange=renderCardPaymentSuggestions;$('summaryYear').onchange=renderSummary;$('summaryMonth').onchange=renderSummary

window.openTx=(id=null)=>{editing={type:'tx',id};$('txDialog').showModal();$('txDate').value=new Date().toISOString().slice(0,10);$('txType').value='expense';$('txDesc').value='';$('txAmount').value='';$('txNote').value='';fillTxSelectors();renderCardPaymentSuggestions();if(id){const x=transactions.find(v=>v.id===id);if(x){$('txDate').value=x.transaction_date;$('txType').value=x.type;fillTxSelectors();$('txDesc').value=x.description;$('txAmount').value=x.amount;$('txCategory').value=x.category_id||'';$('txAccount').value=x.account_id||'';$('txNote').value=x.note||''}}}
$('txForm').onsubmit=async e=>{e.preventDefault();const row={user_id:user.id,transaction_date:$('txDate').value,type:$('txType').value,category_id:$('txCategory').value||null,account_id:$('txAccount').value||null,description:$('txDesc').value.trim(),amount:Number($('txAmount').value),status:'paid',note:$('txNote').value.trim()||null,source:'web'};let r=editing.id?await supabase.from('transactions').update(row).eq('id',editing.id):await supabase.from('transactions').insert(row);if(r.error)return alert(r.error.message);$('txDialog').close();showAppToast('บันทึกแล้ว ✅');await loadAll()}

window.openEntity=(type,id=null)=>{editing={type,id};const f=$('entityFields'),title=$('entityTitle');let x
 if(type==='category'){x=id?categories.find(v=>v.id===id):null;title.textContent=(id?'แก้ไข':'เพิ่ม')+'หมวดหมู่';f.innerHTML='<div class="field full"><label>ชื่อหมวด</label><input name="name" required value="'+esc(x?.name||'')+'"></div><div class="field"><label>ประเภท</label><select name="type"><option value="expense" '+(x?.type!=='income'?'selected':'')+'>รายจ่าย</option><option value="income" '+(x?.type==='income'?'selected':'')+'>รายรับ</option></select></div><div class="field"><label>ไอคอน Emoji</label><input name="icon" value="'+esc(x?.icon||'🏷️')+'"></div>'}
 if(type==='account'){x=id?accounts.find(v=>v.id===id):null;title.textContent=(id?'แก้ไข':'เพิ่ม')+'บัญชี';f.innerHTML='<div class="field full"><label>ชื่อบัญชี</label><input name="name" required value="'+esc(x?.name||'')+'"></div><div class="field"><label>ประเภท</label><select name="account_type">'+['bank','cash','credit_card','e_wallet','other'].map(v=>'<option value="'+v+'" '+(x?.account_type===v?'selected':'')+'>'+v+'</option>').join('')+'</select></div><div class="field"><label>ยอดตั้งต้น</label><input name="opening_balance" type="number" step="0.01" value="'+(x?.opening_balance||0)+'"></div><div class="field full"><label>หมายเหตุ</label><input name="note" value="'+esc(x?.note||'')+'"></div>'}
 if(type==='bill'){x=id?bills.find(v=>v.id===id):null;title.textContent=(id?'แก้ไข':'เพิ่ม')+'บิล';f.innerHTML='<div class="field full"><label>ชื่อบิล</label><input name="name" required value="'+esc(x?.name||'')+'"></div><div class="field"><label>จำนวนเงิน</label><input name="amount" type="number" step="0.01" min="0" value="'+(x?.amount||0)+'"></div><div class="field"><label>ครบกำหนดวันที่</label><input name="due_day" type="number" min="1" max="31" value="'+(x?.due_day||28)+'"></div><div class="field full"><label>หมวด</label><select name="category_id">'+categories.filter(c=>c.type==='expense').map(c=>'<option value="'+c.id+'" '+(x?.category_id===c.id?'selected':'')+'>'+esc((c.icon||'')+' '+c.name)+'</option>').join('')+'</select></div>'}
 if(type==='budget'){x=id?budgets.find(v=>v.id===id):null;title.textContent=(id?'แก้ไข':'เพิ่ม')+'งบประมาณ';const ex=x?.category_names||[];f.innerHTML='<div class="field full"><label>ชื่องบ</label><input name="name" required value="'+esc(x?.name||'')+'"></div><div class="field full"><label>งบต่อเดือน</label><input name="monthly_limit" type="number" min="0" step="100" required value="'+(x?.monthly_limit||4000)+'"></div><div class="field full"><label>หมวดที่นับรวมในงบ</label><div class="budget-checks">'+categories.filter(c=>c.type==='expense').map(c=>'<label class="check"><input type="checkbox" name="category_names" value="'+esc(c.name)+'" '+(ex.includes(c.name)?'checked':'')+'><span>'+esc((c.icon||'')+' '+c.name)+'</span></label>').join('')+'</div></div>'}
 if(type==='debt'){x=id?debts.find(v=>v.id===id):null;title.textContent=(id?'แก้ไข':'เพิ่ม')+'บัตร/สินเชื่อ';f.innerHTML='<div class="field full"><label>ชื่อบัตร/สินเชื่อ</label><input name="name" required value="'+esc(x?.name||'')+'"></div><div class="field"><label>ประเภท</label><select name="debt_type">'+['credit_card','loan','car','mortgage','other'].map(v=>'<option value="'+v+'" '+(x?.debt_type===v?'selected':'')+'>'+v+'</option>').join('')+'</select></div><div class="field"><label>วงเงิน</label><input name="original_amount" type="number" min="0" step="0.01" value="'+(x?.original_amount||0)+'"></div><div class="field"><label>ยอดคงเหลือบัตร / ยอดใช้ไป</label><input name="outstanding_amount" type="number" min="0" step="0.01" value="'+(x?.outstanding_amount||0)+'"></div><div class="field"><label>ยอดที่ต้องจ่ายรอบนี้</label><input name="installment_amount" type="number" min="0" step="0.01" value="'+(x?.installment_amount||0)+'"></div><div class="field"><label>ครบกำหนดวันที่</label><input name="due_day" type="number" min="1" max="31" value="'+(x?.due_day||28)+'"></div>'}
 $('entityDialog').showModal()}
$('entityForm').onsubmit=async e=>{e.preventDefault();const fd=Object.fromEntries(new FormData(e.currentTarget).entries());let table=editing.type==='category'?'categories':editing.type==='account'?'accounts':editing.type==='bill'?'bills':editing.type==='budget'?'budgets':'debts';fd.user_id=user.id
 if(editing.type==='budget'){fd.monthly_limit=Number(fd.monthly_limit||0);fd.category_names=new FormData(e.currentTarget).getAll('category_names');fd.is_active=true}else for(const k of ['opening_balance','amount','due_day','original_amount','outstanding_amount','installment_amount'])if(k in fd)fd[k]=Number(fd[k]||0)
 if(editing.type==='category')fd.sort_order=0;if(editing.type==='bill'){fd.frequency='monthly';fd.is_active=true}if(editing.type==='debt')fd.is_active=true;if(editing.type==='account')fd.is_active=true
 const r=editing.id?await supabase.from(table).update(fd).eq('id',editing.id):await supabase.from(table).insert(fd);if(r.error)return alert(r.error.message);$('entityDialog').close();await loadAll()}

document.addEventListener('click',async e=>{const pay=e.target.closest('[data-pay-debt]');if(pay){const d=debts.find(x=>x.id===pay.dataset.payDebt);if(d){const cat=categories.find(c=>c.type==='expense'&&c.name==='หนี้/ผ่อน');$('txType').value='expense';fillTxSelectors();if(cat)$('txCategory').value=cat.id;$('txDesc').value='ชำระบัตร '+d.name;$('txAmount').value=Number(d.installment_amount||0)>0?Number(d.installment_amount):Number(d.outstanding_amount||0);$('txNote').value='ยอดคงเหลือก่อนชำระ '+money(d.outstanding_amount||0);renderCardPaymentSuggestions();$('txAmount').focus()}return}const edit=e.target.closest('[data-edit]');if(edit){const t=edit.dataset.edit,id=edit.dataset.id;if(t==='tx'&&transactions.find(x=>x.id===id)?.source==='car_installment'){location.href='./car.html';return}if(t==='tx'&&transactions.find(x=>x.id===id)?.source==='salary'){location.href='./salary.html';return}if(t==='tx')openTx(id);else openEntity(t,id);return}const del=e.target.closest('[data-del]');if(del){if(del.dataset.del==='transactions'&&transactions.find(x=>x.id===del.dataset.id)?.source==='car_installment'){alert('กรุณาจัดการรายการนี้ผ่านหน้าผ่อนรถ');return}if(del.dataset.del==='transactions'&&transactions.find(x=>x.id===del.dataset.id)?.source==='salary'){alert('กรุณาจัดการรายการนี้ผ่านหน้าเงินเดือน');return}if(!confirm('ยืนยันลบรายการนี้?'))return;const {error}=await supabase.from(del.dataset.del).delete().eq('id',del.dataset.id);if(error)alert('ลบไม่ได้: '+error.message);else await loadAll()}})
function subscribe(){if(channel)supabase.removeChannel(channel);channel=supabase.channel('finance-live').on('postgres_changes',{event:'*',schema:'public',table:'transactions',filter:'user_id=eq.'+user.id},loadAll).on('postgres_changes',{event:'*',schema:'public',table:'accounts',filter:'user_id=eq.'+user.id},loadAll).on('postgres_changes',{event:'*',schema:'public',table:'bills',filter:'user_id=eq.'+user.id},loadAll).on('postgres_changes',{event:'*',schema:'public',table:'debts',filter:'user_id=eq.'+user.id},loadAll).on('postgres_changes',{event:'*',schema:'public',table:'budgets',filter:'user_id=eq.'+user.id},loadAll).subscribe()}
window.txDialog=$('txDialog');window.entityDialog=$('entityDialog');
const {data:{session}}=await supabase.auth.getSession();if(session?.user)await boot(session.user)

if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(console.warn))}

