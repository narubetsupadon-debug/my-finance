import {bangkokDay,bangkokDate,readAll,budgetSummary,monthlyDue,billDue} from './finance-core.js?v=20261004-stable1';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4'
const url='https://'+'mmvdhopogchcxwlstflk'+'.supabase.co'
const key='sb_'+'publishable_'+'PYkDjHN3ULlFW9BavMvAVQ_'+'d77eZZ5W'
// MINIMAL_DARK_CHART_DEFAULTS
if(typeof Chart!=='undefined'){
 Chart.defaults.color='#9aa6ba';
 Chart.defaults.borderColor='rgba(148,163,184,.12)';
 Chart.defaults.font.family='Inter, "Noto Sans Thai", system-ui, -apple-system, sans-serif';
}
const supabase=createClient(url,key)
const $=id=>document.getElementById(id)
const money=n=>document.body?.classList.contains('privacy-mode')?'฿ ••••':new Intl.NumberFormat('th-TH',{style:'currency',currency:'THB',maximumFractionDigits:2}).format(Number(n||0))
const fmtDate=s=>s?new Intl.DateTimeFormat('th-TH',{day:'numeric',month:'short',year:'2-digit'}).format(new Date(s+'T00:00:00')):''
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
let mode='login',user=null,categories=[],accounts=[],transactions=[],bills=[],debts=[],budgets=[],channel=null,editing={type:null,id:null},trendChart=null,categoryChart2=null,pieChart=null

const UI_SETTINGS_KEY='my-finance-ui-settings-v1';
const PUSH_ENDPOINT='https://mmvdhopogchcxwlstflk.supabase.co/functions/v1/push-reminders';
function b64urlToUint8Array(base64String){
 const padding='='.repeat((4-base64String.length%4)%4);
 const base64=(base64String+padding).replace(/-/g,'+').replace(/_/g,'/');
 const raw=atob(base64);return Uint8Array.from([...raw].map(ch=>ch.charCodeAt(0)));
}
async function pushSession(){
 const {data:{session}}=await supabase.auth.getSession();
 return session||null;
}
async function pushCall(action,payload={}){
 const session=await pushSession();if(!session)throw new Error('กรุณาเข้าสู่ระบบใหม่');
 const r=await fetch(PUSH_ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+session.access_token,'apikey':key},body:JSON.stringify({action,...payload})});
 const data=await r.json().catch(()=>({}));if(!r.ok)throw new Error(data.error||'เรียกบริการแจ้งเตือนไม่สำเร็จ');return data;
}
async function currentPushSubscription(){
 if(!('serviceWorker' in navigator)||!('PushManager' in window))return null;
 const reg=await navigator.serviceWorker.ready;return reg.pushManager.getSubscription();
}
async function refreshPushStatus(){
 const text=$('pushStatusText'),badge=$('pushStatusBadge'),on=$('enablePushBtn'),test=$('testPushBtn'),off=$('disablePushBtn');
 if(!text||!badge)return;
 if(!('Notification' in window)||!('serviceWorker' in navigator)||!('PushManager' in window)){
  text.textContent='อุปกรณ์หรือเบราว์เซอร์นี้ยังไม่รองรับ Web Push';badge.textContent='ไม่รองรับ';
  on?.classList.add('hidden');test?.classList.add('hidden');off?.classList.add('hidden');return;
 }
 const sub=await currentPushSubscription().catch(()=>null);
 if(sub&&Notification.permission==='granted'){
  text.textContent='เปิดอยู่บนอุปกรณ์นี้';badge.textContent='เปิดอยู่';badge.classList.add('income');
  on?.classList.add('hidden');test?.classList.remove('hidden');off?.classList.remove('hidden');
 }else{
  text.textContent=Notification.permission==='denied'?'ถูกบล็อกโดยเบราว์เซอร์ กรุณาเปิดสิทธิ์ Notification ในการตั้งค่า':'ยังไม่ได้อนุญาตการแจ้งเตือนบนอุปกรณ์นี้';
  badge.textContent=Notification.permission==='denied'?'ถูกบล็อก':'ยังไม่เปิด';badge.classList.remove('income');
  on?.classList.toggle('hidden',Notification.permission==='denied');test?.classList.add('hidden');off?.classList.add('hidden');
 }
}
async function enablePush(){
 if(!('Notification' in window)||!('serviceWorker' in navigator)||!('PushManager' in window))throw new Error('อุปกรณ์นี้ยังไม่รองรับ Web Push');
 const permission=await Notification.requestPermission();if(permission!=='granted')throw new Error('ยังไม่ได้อนุญาต Notification');
 const cfg=await pushCall('config');
 const reg=await navigator.serviceWorker.ready;
 let sub=await reg.pushManager.getSubscription();
 if(!sub)sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:b64urlToUint8Array(cfg.publicKey)});
 const j=sub.toJSON();
 await pushCall('subscribe',{subscription:{endpoint:sub.endpoint,keys:j.keys||{}}});
 await refreshPushStatus();showAppToast('เปิดแจ้งเตือนบนอุปกรณ์นี้แล้ว 🔔');
}
async function disablePush(){
 const sub=await currentPushSubscription();if(sub){
  const endpoint=sub.endpoint;await pushCall('unsubscribe',{endpoint});
  await sub.unsubscribe();
 }
 await refreshPushStatus();showAppToast('ปิดแจ้งเตือนบนอุปกรณ์นี้แล้ว');
}
async function testPush(){
 const r=await pushCall('test');showAppToast(r.sent?'ส่งแจ้งเตือนทดสอบแล้ว 🔔':'ยังไม่พบ subscription ของอุปกรณ์นี้');
}

const QUICK_DEFAULT=[
 {icon:'🍜',label:'อาหาร',desc:'อาหาร'},
 {icon:'☕',label:'กาแฟ',desc:'กาแฟ'},
 {icon:'🚗',label:'รถ',desc:'รถ'},
 {icon:'🛍️',label:'ซื้อของ',desc:'ซื้อของ'},
 {icon:'💳',label:'จ่ายบัตร',desc:'จ่ายบัตร'},
 {icon:'🧾',label:'บิล',desc:'บิล'}
];
const UI_DEFAULTS={accent:'purple',privacy:false,defaultAccount:'',dueReminder:true,budgetReminder:true,quickOrder:QUICK_DEFAULT.map(x=>x.label),quickHidden:[]};
function readUiSettings(){
 try{
  const raw=JSON.parse(localStorage.getItem(UI_SETTINGS_KEY)||'{}');
  return {...UI_DEFAULTS,...raw,
   quickOrder:Array.isArray(raw.quickOrder)?raw.quickOrder:UI_DEFAULTS.quickOrder,
   quickHidden:Array.isArray(raw.quickHidden)?raw.quickHidden:[]
  };
 }catch{return {...UI_DEFAULTS}}
}
let uiSettings=readUiSettings();
function writeUiSettings(patch){
 uiSettings={...uiSettings,...patch};
 try{localStorage.setItem(UI_SETTINGS_KEY,JSON.stringify(uiSettings))}catch{}
 applyUiSettings();
}
function applyUiSettings(){
 const palettes={
  purple:['#7c3aed','#a78bfa'],
  blue:['#2563eb','#60a5fa'],
  green:['#059669','#34d399'],
  pink:['#db2777','#f472b6']
 };
 const accent=palettes[uiSettings.accent]||palettes.purple;
 document.documentElement.dataset.accent=uiSettings.accent||'purple';
 document.documentElement.style.setProperty('--primary',accent[0]);
 document.documentElement.style.setProperty('--primary2',accent[1]);
 document.body?.classList.toggle('privacy-mode',!!uiSettings.privacy);
 document.querySelectorAll('[data-accent]').forEach(b=>b.classList.toggle('active',b.dataset.accent===uiSettings.accent));
}
function orderedQuickItems(){
 const byLabel=new Map(QUICK_DEFAULT.map(x=>[x.label,x]));
 const order=[...uiSettings.quickOrder,...QUICK_DEFAULT.map(x=>x.label).filter(x=>!uiSettings.quickOrder.includes(x))];
 return order.map(x=>byLabel.get(x)).filter(Boolean);
}
function renderSettings(){
 const account=$('defaultAccountSetting');
 if(account){
  const selected=uiSettings.defaultAccount||'';
  account.innerHTML='<option value="">ไม่ระบุบัญชี</option>'+accounts.map(a=>'<option value="'+a.id+'">'+esc(a.name)+'</option>').join('');
  if([...account.options].some(o=>o.value===selected))account.value=selected;else account.value='';
 }
 const privacy=$('privacySetting');if(privacy)privacy.checked=!!uiSettings.privacy;
 const due=$('dueReminderSetting');if(due)due.checked=uiSettings.dueReminder!==false;
 const budget=$('budgetReminderSetting');if(budget)budget.checked=uiSettings.budgetReminder!==false;
 document.querySelectorAll('[data-accent]').forEach(b=>b.classList.toggle('active',b.dataset.accent===uiSettings.accent));
 const root=$('quickSettingsList');
 if(root){
  const items=orderedQuickItems();
  root.innerHTML=items.map((item,i)=>{
   const hidden=uiSettings.quickHidden.includes(item.label);
   return '<div class="quick-setting-row" data-quick-label="'+esc(item.label)+'"><label><input type="checkbox" '+(hidden?'':'checked')+' data-quick-visible="'+esc(item.label)+'"><span>'+item.icon+' <b>'+esc(item.label)+'</b></span></label><div class="quick-order-actions"><button type="button" class="btn small ghost" data-quick-up="'+esc(item.label)+'" '+(i===0?'disabled':'')+' aria-label="เลื่อน '+esc(item.label)+' ขึ้น">↑</button><button type="button" class="btn small ghost" data-quick-down="'+esc(item.label)+'" '+(i===items.length-1?'disabled':'')+' aria-label="เลื่อน '+esc(item.label)+' ลง">↓</button></div></div>';
  }).join('');
 }
}
function moveQuick(label,delta){
 const order=orderedQuickItems().map(x=>x.label),i=order.indexOf(label),j=i+delta;
 if(i<0||j<0||j>=order.length)return;
 [order[i],order[j]]=[order[j],order[i]];
 writeUiSettings({quickOrder:order});renderSettings();renderDashboard();
}
applyUiSettings();


function toast(t,type=''){const e=$('authMsg');if(!e)return;e.textContent=t;e.className='notice '+type;e.classList.remove('hidden')}
function setAuthMode(m){mode=m;$('tabLogin').classList.toggle('active',m==='login');$('tabSignup').classList.toggle('active',m==='signup');$('authBtn').textContent=m==='login'?'เข้าสู่ระบบ':'สร้างบัญชี';$('password').autocomplete=m==='login'?'current-password':'new-password';$('authMsg').classList.add('hidden')}
$('tabLogin').onclick=()=>setAuthMode('login');$('tabSignup').onclick=()=>setAuthMode('signup')
$('authBtn').onclick=async()=>{const email=$('email').value.trim(),password=$('password').value;if(!email||password.length<6){toast('กรอกอีเมลและรหัสผ่านอย่างน้อย 6 ตัวอักษร','err');return}
 $('authBtn').disabled=true
 try{if(mode==='signup'){const {data,error}=await supabase.auth.signUp({email,password,options:{data:{display_name:'มิว'}}});if(error)throw error;if(!data.session){toast('สมัครแล้ว ✅ กรุณายืนยันอีเมลก่อน','ok');return}await boot(data.user)}
 else{const {data,error}=await supabase.auth.signInWithPassword({email,password});if(error)throw error;await boot(data.user)}}catch(e){toast(e.message||'เกิดข้อผิดพลาด','err')}finally{$('authBtn').disabled=false}}
$('logout').onclick=async()=>{await supabase.auth.signOut();location.reload()}

async function boot(u){user=u;$('authScreen').classList.add('hidden');$('app').classList.remove('hidden');$('userEmail').textContent=u.email||'';await loadAll();subscribe();showPage(location.hash.slice(1)||'dashboard')}
let loadGeneration=0;
async function loadAll(){
 const generation=++loadGeneration;
 try{
  const query=(table,select='*')=>supabase.from(table).select(select).eq('user_id',user.id);
  const [c,a,t,b,d,g]=await Promise.all([
   readAll(()=>query('categories').order('sort_order').order('name').order('id')),
   readAll(()=>query('accounts').order('created_at').order('id')),
   readAll(()=>query('transactions','*,categories(name,icon),accounts(name)').order('transaction_date',{ascending:false}).order('created_at',{ascending:false}).order('id')),
   readAll(()=>query('bills','*,categories(name),accounts(name)').order('due_day').order('id')),
   readAll(()=>query('debts').order('created_at').order('id')),
   readAll(()=>query('budgets').order('created_at').order('id'))
  ]);
  if(generation!==loadGeneration)return false;
  categories=c;accounts=a;transactions=t;bills=b;debts=d;budgets=g;
  $('dataError').classList.add('hidden');renderAll();return true;
 }catch(error){
  if(generation!==loadGeneration)return false;
  $('dataErrorText').textContent='โหลดข้อมูลล่าสุดไม่ได้ ข้อมูลที่เห็นอาจยังไม่ครบหรือไม่เป็นปัจจุบัน: '+error.message;
  $('dataError').classList.remove('hidden');return false;
 }
}
$('retryData').onclick=()=>loadAll();
function renderAll(){fillTxSelectors();renderDashboard();renderTransactions();renderCategories();renderAccounts();renderBills();renderDebts();renderBudget();renderSummary();renderSettings();applyUiSettings();void refreshPushStatus()}
function showAppToast(message){
 const el=$('appToast'); if(!el)return; el.textContent=message; el.classList.remove('hidden'); clearTimeout(window.__toastTimer); window.__toastTimer=setTimeout(()=>el.classList.add('hidden'),2200)
}
function quickCategoryMatch(label){
 const aliases={อาหาร:['อาหาร'],กาแฟ:['กาแฟ','อาหาร'],รถ:['รถยนต์','เดินทาง'],ซื้อของ:['ช้อปปิ้ง'],จ่ายบัตร:['หนี้/ผ่อน'],บิล:['บิล/สาธารณูปโภค']}
 const names=aliases[label]||[label]
 for(const name of names){const match=categories.find(c=>c.type==='expense'&&c.name===name);if(match)return match}
 return categories.find(c=>c.type==='expense'&&c.name==='อื่นๆ')||null
}
window.quickAdd=(label,desc='')=>{
 const cat=quickCategoryMatch(label); openTx(); $('txType').value='expense'; fillTxSelectors(); if(cat)$('txCategory').value=cat.id; $('txDesc').value=desc||label; renderCardPaymentSuggestions(); if(label==='จ่ายบัตร'&&debts.some(d=>d.is_active&&Number(d.outstanding_amount||0)>0))$('cardPaymentSuggest')?.scrollIntoView({behavior:'smooth',block:'center'}); else if(window.innerWidth>820)$('txAmount').focus()
}
const nextDueDate=monthlyDue;

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
 const now=bangkokDate(),today=bangkokDay(),y=now.getFullYear(),m=now.getMonth()
 const monthly=transactions.filter(x=>{const d=new Date(x.transaction_date+'T00:00:00');return d.getFullYear()===y&&d.getMonth()===m&&x.status!=='cancelled'})
 const prevDate=new Date(y,m-1,1),py=prevDate.getFullYear(),pm=prevDate.getMonth()
 const previous=transactions.filter(x=>{const d=new Date(x.transaction_date+'T00:00:00');return d.getFullYear()===py&&d.getMonth()===pm&&x.status!=='cancelled'})
 const inc=monthly.filter(x=>x.type==='income').reduce((s,x)=>s+Number(x.amount),0)
 const exp=monthly.filter(x=>x.type==='expense').reduce((s,x)=>s+Number(x.amount),0)
 const prevExp=previous.filter(x=>x.type==='expense').reduce((s,x)=>s+Number(x.amount),0)
 const todayRows=monthly.filter(x=>x.type==='expense'&&x.transaction_date===today),todaySpent=todayRows.reduce((s,x)=>s+Number(x.amount),0)
 const bsum=budgetTotals(),dailyLeft=bsum.daily,pct=bsum.limit?Math.min(100,bsum.spent/bsum.limit*100):0
 $('nextBillCard')?.classList.toggle('hidden',uiSettings.dueReminder===false);
 $('upcomingList')?.closest('details')?.classList.toggle('hidden',uiSettings.dueReminder===false);
 document.querySelector('.budget-panel')?.classList.toggle('budget-panel-warning',uiSettings.budgetReminder!==false&&bsum.limit>0&&bsum.spent/bsum.limit>=.8);
 $('todayLabel').textContent=now.toLocaleDateString('th-TH',{weekday:'long',day:'numeric',month:'long',year:'numeric'})
 $('monthLabel').textContent=now.toLocaleDateString('th-TH',{month:'long',year:'numeric'})
 $('todaySpent').textContent=money(todaySpent);$('todayCount').textContent=todayRows.length+' รายการ'
 $('todayCanSpend').textContent=money(dailyLeft);$('todayCanSpendHint').textContent=bsum.limit?'จากงบเฉลี่ยต่อวันที่เหลือ':'ยังไม่ได้ตั้งงบ'
 $('incomeTotal').textContent=money(inc);$('expenseTotal').textContent=money(exp);$('balanceTotal').textContent=money(inc-exp)
 $('debtTotal').textContent=money(debts.filter(x=>x.is_active).reduce((s,x)=>s+Number(x.outstanding_amount||0),0))
 $('budgetSpentDash').textContent=money(bsum.spent);$('budgetLimitDash').textContent=money(bsum.limit);$('budgetRemainDash').textContent=money(bsum.remain);$('budgetDailyDash').textContent='ใช้ได้เฉลี่ยวันละ '+money(bsum.daily)
 $('homeBudgetStatus').textContent=!bsum.limit?'ยังไม่ได้ตั้งงบ · แตะเพื่อเริ่ม':bsum.spent>bsum.limit?'เกินงบ '+money(bsum.spent-bsum.limit):'เฉลี่ยได้อีกวันละ '+money(bsum.daily);
 $('homeBudgetStatus').classList.toggle('is-over',bsum.spent>bsum.limit);
 $('budgetRemainDash').textContent=bsum.limit?money(bsum.remain):'ยังไม่ตั้งงบ';
 $('viewToday').onclick=()=>openInsightDetails('รายจ่ายวันนี้',[{label:fmtDate(today),rows:todayRows}],'รายการที่บันทึกวันนี้ ไม่รวมรายการยกเลิก');
 $('budgetPctDash').textContent=Math.round(pct)+'%';$('budgetProgressDash').style.width=pct+'%';$('budgetProgressDash').classList.toggle('over',bsum.spent>bsum.limit)

 const quick=orderedQuickItems().filter(x=>!uiSettings.quickHidden.includes(x.label))
 $('quickAdd').innerHTML=quick.map(({icon,label,desc})=>'<button class="quick-btn" onclick="quickAdd(\''+label+'\',\''+desc+'\')"><span>'+icon+'</span><b>'+label+'</b></button>').join('')+'<button class="quick-btn more" onclick="openTx()"><span>＋</span><b>อื่น ๆ</b></button>'

 const sums={};monthly.filter(x=>x.type==='expense').forEach(x=>{const n=x.categories?.name||'อื่นๆ';sums[n]=(sums[n]||0)+Number(x.amount)})
 const sorted=Object.entries(sums).sort((a,b)=>b[1]-a[1]),top=sorted[0]

 const insights=[];
 const cutoff=Math.min(now.getDate(),new Date(y,m,0).getDate());
 const currentComparable=monthly.filter(x=>x.type==='expense'&&Number(x.transaction_date.slice(8,10))<=cutoff);
 const priorComparable=previous.filter(x=>x.type==='expense'&&Number(x.transaction_date.slice(8,10))<=cutoff);
 const currentSum=currentComparable.reduce((s,x)=>s+Number(x.amount),0),priorSum=priorComparable.reduce((s,x)=>s+Number(x.amount),0);
 if(top)insights.push({text:'เดือนนี้ใช้มากสุดที่ '+top[0]+' '+money(top[1]),icon:'✨',open:()=>openInsightDetails('รายจ่ายหมวด '+top[0],[{label:'เดือนนี้ · '+top[0],rows:monthly.filter(x=>x.type==='expense'&&(x.categories?.name||'อื่นๆ')===top[0])}],'ไม่รวมรายการยกเลิก')});
 if(priorSum>0){const diff=(currentSum-priorSum)/priorSum*100;insights.push({text:diff===0?'รายจ่ายเท่ากับเดือนก่อนในช่วงเดียวกัน':('รายจ่าย'+(diff>0?'เพิ่มขึ้น ':'ลดลง ')+Math.abs(diff).toFixed(0)+'% ในช่วงเดียวกัน'),icon:'📊',open:()=>openInsightDetails('เทียบรายจ่ายช่วงวันที่ 1–'+cutoff,[{label:now.toLocaleDateString('th-TH',{month:'long',year:'numeric'}),rows:currentComparable},{label:prevDate.toLocaleDateString('th-TH',{month:'long',year:'numeric'}),rows:priorComparable}],'เทียบช่วงวันที่เท่ากันของสองเดือน จากรายการที่บันทึกไว้ ไม่รวมรายการยกเลิก')});}
 if(bsum.limit)insights.push({text:bsum.spent>bsum.limit?'ใช้เกินงบรวม '+money(bsum.spent-bsum.limit):'งบรวมยังเหลือ '+money(bsum.remain),icon:'🎯',open:()=>showPage('budget')});
 if(inc>0)insights.push({text:'รายรับหักรายจ่ายเดือนนี้ '+money(inc-exp),icon:'💙',open:()=>openInsightDetails('รายรับและรายจ่ายเดือนนี้',[{label:'รายรับ',rows:monthly.filter(x=>x.type==='income')},{label:'รายจ่าย',rows:monthly.filter(x=>x.type==='expense')}],'ผลต่าง '+money(inc-exp)+' จากรายการที่บันทึกในเดือนนี้ ไม่ใช่ยอดเงินคงเหลือทุกบัญชี')});
 const insightRoot=$('insightList');insightRoot.replaceChildren();
 if(!insights.length){const empty=document.createElement('div');empty.className='empty';empty.textContent='เริ่มบันทึกรายการ แล้วนิลินจะสรุปให้ตรงนี้ ✨';insightRoot.append(empty);}
 insights.slice(0,4).forEach(item=>{const b=document.createElement('button');b.type='button';b.className='insight-item insight-link';const icon=document.createElement('span');icon.textContent=item.icon;icon.setAttribute('aria-hidden','true');const text=document.createElement('div');text.textContent=item.text;const hint=document.createElement('small');hint.textContent='ดูรายละเอียด ›';text.append(document.createElement('br'),hint);b.append(icon,text);b.onclick=item.open;insightRoot.append(b);});

 const upcoming=[
  ...bills.filter(x=>x.is_active).map(x=>({kind:'บิล',name:x.name,amount:Number(x.amount||0),due:billDue(x)})),
  ...debts.filter(x=>x.is_active&&Number(x.outstanding_amount||0)>0).map(x=>({kind:'บัตร/สินเชื่อ',name:x.name,amount:Number(x.installment_amount||0)||null,due:nextDueDate(x.due_day)}))
 ].filter(x=>x.due).sort((a,b)=>a.due-b.due).slice(0,5)
 const next=upcoming[0];
 $('nextBillName').textContent=next?next.name:'ยังไม่มีวันครบกำหนด';
 $('nextBillAmount').textContent=next?(next.amount===null?'ยังไม่ระบุยอด':money(next.amount)):'—';
 if(next){const days=Math.round((next.due-new Date(y,m,now.getDate()))/86400000);$('nextBillDate').textContent=(days<0?'เลยกำหนด '+Math.abs(days)+' วัน':days===0?'ครบกำหนดวันนี้':'อีก '+days+' วัน')+' · '+next.due.toLocaleDateString('th-TH',{day:'numeric',month:'short'});$('nextBillDate').classList.toggle('is-over',days<=0);}
 else{$('nextBillDate').textContent='แตะเพื่อจัดการบิลและวันครบกำหนด';$('nextBillDate').classList.remove('is-over');}
 $('nextBillCard').onclick=()=>showPage(next?.kind==='บัตร/สินเชื่อ'?'debts':'bills');
 $('upcomingList').innerHTML=upcoming.length?upcoming.map(x=>{const days=Math.ceil((x.due-new Date(y,m,now.getDate()))/86400000);return '<div class="upcoming-item"><div><b>'+esc(x.name)+'</b><div class="muted">'+x.kind+' · '+(days===0?'วันนี้':days<0?'เลยกำหนด '+Math.abs(days)+' วัน':'อีก '+days+' วัน')+'</div></div><div><b>'+(x.amount===null?'ยังไม่ระบุยอดรอบนี้':money(x.amount))+'</b><div class="muted">'+x.due.toLocaleDateString('th-TH',{day:'numeric',month:'short'})+'</div></div></div>'}).join(''):'<div class="empty">ไม่มีรายการใกล้ครบกำหนด 🎉</div>'

 renderTxList($('recentList'),transactions.slice(0,5),true)
 const max=Math.max(1,...Object.values(sums));$('categoryChart').innerHTML=Object.keys(sums).length?sorted.slice(0,8).map(([n,v])=>'<div class="bar-row"><span>'+esc(n)+'</span><div class="barbg"><div class="barfill" style="width:'+Math.round(v/max*100)+'%"></div></div><b>'+money(v)+'</b></div>').join(''):'<div class="empty">ยังไม่มีรายจ่ายเดือนนี้</div>'
}

function openInsightDetails(title,groups,note){
 $('insightDetailTitle').textContent=title;$('insightDetailNote').textContent=note;
 const root=$('insightDetailBody');root.replaceChildren();
 groups.forEach(group=>{
  const section=document.createElement('section');section.className='insight-detail-group';
  const heading=document.createElement('h4');const sum=group.rows.reduce((s,r)=>s+Number(r.amount),0);
  heading.textContent=group.label+' · '+money(sum)+' · '+group.rows.length+' รายการ';section.append(heading);
  if(!group.rows.length){const p=document.createElement('p');p.className='muted';p.textContent='ไม่มีรายการที่บันทึกในช่วงนี้';section.append(p);}
  group.rows.forEach(r=>{const row=document.createElement('div');row.className='insight-detail-row';const detail=document.createElement('div');const name=document.createElement('b');name.textContent=r.description;const sub=document.createElement('small');sub.textContent=fmtDate(r.transaction_date)+' · '+(r.categories?.name||'ไม่ระบุหมวด')+' · '+(r.accounts?.name||'ไม่ระบุบัญชี');detail.append(name,sub);const amount=document.createElement('strong');amount.textContent=money(r.amount);amount.className=r.type==='income'?'income':'expense';row.append(detail,amount);section.append(row);});
  root.append(section);
 });
 $('insightDetailDialog').showModal();
}

function filteredTx(){let a=[...transactions],f=$('txFilterType').value,q=$('txSearch').value.trim().toLowerCase(),cat=$('txFilterCategory').value,mon=$('txFilterMonth').value;if(f!=='all')a=a.filter(x=>x.type===f);if(cat)a=a.filter(x=>x.category_id===cat);if(mon)a=a.filter(x=>String(x.transaction_date).slice(0,7)===mon);if(q)a=a.filter(x=>(x.description+' '+(x.categories?.name||'')+' '+(x.note||'')).toLowerCase().includes(q));return a}
function renderTransactions(){const arr=filteredTx();renderTxList($('txList'),arr);$('txCount').textContent=arr.length+' รายการ'}
function renderTxList(el,arr,compact=false){
 el.innerHTML=arr.length?arr.map(x=>{
  const status=x.status==='cancelled'?'ยกเลิก':x.status==='pending'?'รอดำเนินการ':x.type==='income'?'รับแล้ว':'จ่ายแล้ว';
  return '<div class="item transaction-row '+(compact?'compact-row ':'')+(x.status==='cancelled'?'is-cancelled':'')+'"><span class="transaction-icon" aria-hidden="true">'+esc(x.categories?.icon||'🧾')+'</span><div class="transaction-detail"><b>'+esc(x.description)+'</b><span class="muted">'+fmtDate(x.transaction_date)+' · '+esc(x.categories?.name||'ไม่ระบุหมวด')+(x.accounts?.name&&!compact?' · '+esc(x.accounts.name):'')+'</span><span class="tx-status status-'+esc(x.status||'paid')+'">'+status+'</span></div><span class="amount '+(x.type==='income'?'income':'expense')+'">'+(x.type==='income'?'+':'−')+money(x.amount)+'</span><div class="actions"><button class="btn small soft" data-edit="tx" data-id="'+x.id+'" aria-label="แก้ไข '+esc(x.description)+'">'+(compact?'ดู':'แก้ไข')+'</button>'+(compact?'':'<button class="btn small danger" data-del="transactions" data-id="'+x.id+'">ลบ</button>')+'</div></div>';
 }).join(''):'<div class="empty"><b>ยังไม่มีรายการ</b><p>เริ่มจดรายการแรก แล้วกลับมาดูได้ตรงนี้</p><button class="btn soft" onclick="openTx()">＋ บันทึกรายการ</button></div>';
}
function renderCategories(){for(const type of ['expense','income']){const el=$(type==='expense'?'expenseCats':'incomeCats'),arr=categories.filter(c=>c.type===type);el.innerHTML=arr.length?arr.map(c=>'<div class="category-card"><div class="left"><span class="icon">'+esc(c.icon||'🏷️')+'</span><span class="name">'+esc(c.name)+'</span></div><div class="actions"><button class="btn small soft" data-edit="category" data-id="'+c.id+'">แก้</button><button class="btn small danger" data-del="categories" data-id="'+c.id+'">ลบ</button></div></div>').join(''):'<div class="empty">ยังไม่มีหมวด</div>'}}
function renderAccounts(){$('accountList').innerHTML=accounts.length?accounts.map(a=>'<div class="item"><div><b>🏦 '+esc(a.name)+'</b><span class="muted">'+esc(a.account_type)+(a.note?' · '+esc(a.note):'')+'</span></div><span class="amount"><small class="muted">ยอดตั้งต้น</small> '+money(a.opening_balance)+'</span><div class="actions"><button class="btn small soft" data-edit="account" data-id="'+a.id+'">แก้ไข</button><button class="btn small danger" data-del="accounts" data-id="'+a.id+'">ลบ</button></div></div>').join(''):'<div class="empty">ยังไม่มีบัญชี</div>'}
function renderBills(){$('billList').innerHTML=bills.length?bills.map(b=>'<div class="item"><div><b>📅 '+esc(b.name)+'</b><span class="muted">ทุกวันที่ '+(b.due_day||'-')+' · '+esc(b.categories?.name||'ไม่ระบุหมวด')+'</span></div><span class="amount expense">'+money(b.amount)+'</span><div class="actions"><button class="btn small soft" data-edit="bill" data-id="'+b.id+'">แก้ไข</button><button class="btn small danger" data-del="bills" data-id="'+b.id+'">ลบ</button></div></div>').join(''):'<div class="empty">ยังไม่มีบิล</div>'}
function renderDebts(){$('debtList').innerHTML=debts.length?debts.map(d=>{const limit=Number(d.original_amount||0),used=Number(d.outstanding_amount||0),available=Math.max(0,limit-used),pct=limit?Math.min(100,used/limit*100):0;return '<div class="card credit-card"><div class="row"><div><b>💳 '+esc(d.name)+'</b><div class="muted">ครบกำหนดวันที่ '+(d.due_day||'-')+(Number(d.installment_amount||0)>0?' · จ่ายรอบนี้ '+money(d.installment_amount):'')+'</div></div><div class="actions"><button class="btn small soft" data-edit="debt" data-id="'+d.id+'">แก้ไข</button><button class="btn small danger" data-del="debts" data-id="'+d.id+'">ลบ</button></div></div><div class="credit-stats"><div><span>ยอดคงเหลือบัตร</span><b class="expense">'+money(used)+'</b></div><div><span>วงเงิน</span><b>'+money(limit)+'</b></div><div><span>วงเงินเหลือใช้</span><b class="income">'+money(available)+'</b></div></div><div class="budget-progress"><div class="credit-used" style="width:'+pct+'%"></div></div><div class="muted" style="margin-top:7px">ใช้วงเงินไป '+pct.toFixed(0)+'%</div></div>'}).join(''):'<div class="empty">ยังไม่มีบัตรหรือสินเชื่อ</div>'}
function budgetSpent(b){
 const ym=bangkokDay().slice(0,7),names=b.category_names||[]
 return transactions.filter(x=>x.type==='expense'&&x.status!=='cancelled'&&String(x.transaction_date).slice(0,7)===ym&&names.includes(x.categories?.name||'')).reduce((s,x)=>s+Number(x.amount||0),0)
}
function budgetTotals(){return budgetSummary(budgets,transactions)}
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
 const years=[...new Set([bangkokDay().slice(0,4),...transactions.map(x=>String(x.transaction_date).slice(0,4)).filter(Boolean)])].sort((a,b)=>b.localeCompare(a))
 const ys=$('summaryYear'),current=ys.value||bangkokDay().slice(0,4)
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
 const moneyFmt=v=>document.body?.classList.contains('privacy-mode')?'••••':new Intl.NumberFormat('th-TH',{maximumFractionDigits:0}).format(v)
 if(trendChart)trendChart.destroy()
 if(typeof Chart!=='undefined')trendChart=new Chart($('monthlyTrendChart'),{data:{labels:monthLabels,datasets:[
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
 if(typeof Chart!=='undefined')categoryChart2=new Chart($('monthlyCategoryChart'),{type:'bar',data:{labels:monthLabels,datasets:cats.map((g,idx)=>({label:g,data:monthlyByCat[idx],backgroundColor:palette[idx%palette.length],borderRadius:4}))},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom'},tooltip:{callbacks:{label:c=>c.dataset.label+': '+money(c.raw)}}},scales:{x:{stacked:true,grid:{display:false}},y:{stacked:true,ticks:{callback:v=>'฿'+moneyFmt(v)},grid:{color:'rgba(148,163,184,.15)'}}}}})

 const pieCats=Object.entries(grouped).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1])
 if(pieChart)pieChart.destroy()
 if(typeof Chart!=='undefined')pieChart=new Chart($('categoryPieChart'),{type:'doughnut',data:{labels:pieCats.map(x=>x[0]),datasets:[{data:pieCats.map(x=>x[1]),backgroundColor:pieCats.map((_,i)=>palette[i%palette.length]),borderWidth:0}]},options:{responsive:true,maintainAspectRatio:false,cutout:'62%',plugins:{legend:{position:'bottom'},tooltip:{callbacks:{label:c=>c.label+': '+money(c.raw)+' ('+((c.raw/(exp||1))*100).toFixed(1)+'%)'}}}}})

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
  const due=Number(d.installment_amount||0),balance=Number(d.outstanding_amount||0),suggest=due>0?money(due):'กรอกยอดที่จ่ายจริง'
  return '<button type="button" class="payment-pick" data-pay-debt="'+d.id+'"><span class="pay-icon">💳</span><span><b>'+esc(d.name)+'</b><small>ยอดคงเหลือ '+money(balance)+(due>0?' · รอบนี้ '+money(due):'')+'</small></span><strong>'+suggest+'</strong></button>'
 }).join(''):'<div class="empty">ยังไม่มีบัตร/สินเชื่อที่มียอดคงเหลือ</div>'
}
function syncTxType(){
 document.querySelectorAll('[data-tx-type]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.txType===$('txType').value)));
 $('txForm').classList.toggle('is-income',$('txType').value==='income');
}
document.querySelectorAll('[data-tx-type]').forEach(b=>b.onclick=()=>{$('txType').value=b.dataset.txType;fillTxSelectors()});
function fillTxSelectors(){
 syncTxType();
 const currentCat=$('txCategory').value,currentAccount=$('txAccount').value,currentFilter=$('txFilterCategory').value
 $('txCategory').innerHTML='<option value="">เลือกหมวด</option>'+categories.filter(c=>c.type===$('txType').value).map(c=>'<option value="'+c.id+'">'+esc((c.icon||'')+' '+c.name)+'</option>').join('')
 if(currentCat&&[...$('txCategory').options].some(o=>o.value===currentCat))$('txCategory').value=currentCat
 $('txAccount').innerHTML='<option value="">ไม่ระบุบัญชี</option>'+accounts.map(a=>'<option value="'+a.id+'">'+esc(a.name)+'</option>').join('')
 $('txFilterCategory').innerHTML='<option value="">ทุกหมวด</option>'+categories.map(c=>'<option value="'+c.id+'">'+esc((c.icon||'')+' '+c.name)+'</option>').join('')
 $('txAccount').value=currentAccount; $('txFilterCategory').value=currentFilter;
 renderCardPaymentSuggestions()
}

function showPage(name){let target=$(name+'Page');if(!target||!target.classList.contains('page')){name='dashboard';target=$('dashboardPage');if(!target)return;}document.querySelectorAll('.page').forEach(x=>x.classList.add('hidden'));target.classList.remove('hidden');document.querySelectorAll('.navbtn[data-page]').forEach(x=>{const selected=x.dataset.page===name;x.classList.toggle('active',selected);if(selected)x.setAttribute('aria-current','page');else x.removeAttribute('aria-current')});history.replaceState(null,'','#'+name);window.dispatchEvent(new CustomEvent('finance:page',{detail:name}));window.scrollTo({top:0,behavior:'auto'})}
window.addEventListener('finance:navigate',e=>showPage(e.detail));
window.addEventListener('hashchange',()=>showPage(location.hash.slice(1)||'dashboard'));
document.querySelectorAll('.navbtn[data-page]').forEach(b=>b.onclick=()=>showPage(b.dataset.page));document.addEventListener('click',e=>{const j=e.target.closest('[data-page-jump]');if(j)showPage(j.dataset.pageJump)})

$('enablePushBtn')?.addEventListener('click',async e=>{const b=e.currentTarget;b.disabled=true;try{await enablePush()}catch(err){showAppToast('เปิดแจ้งเตือนไม่ได้: '+err.message)}finally{b.disabled=false}});
$('disablePushBtn')?.addEventListener('click',async e=>{const b=e.currentTarget;b.disabled=true;try{await disablePush()}catch(err){showAppToast('ปิดแจ้งเตือนไม่ได้: '+err.message)}finally{b.disabled=false}});
$('testPushBtn')?.addEventListener('click',async e=>{const b=e.currentTarget;b.disabled=true;try{await testPush()}catch(err){showAppToast('ทดสอบไม่ได้: '+err.message)}finally{b.disabled=false}});
$('defaultAccountSetting')?.addEventListener('change',e=>{writeUiSettings({defaultAccount:e.target.value});showAppToast('ตั้งบัญชีเริ่มต้นแล้ว ✅')});
$('privacySetting')?.addEventListener('change',e=>{writeUiSettings({privacy:e.target.checked});renderDashboard();renderTransactions();renderAccounts();renderBills();renderDebts();renderBudget();renderSummary();showAppToast(e.target.checked?'ซ่อนยอดเงินแล้ว 👁️':'แสดงยอดเงินแล้ว')});
$('dueReminderSetting')?.addEventListener('change',e=>{writeUiSettings({dueReminder:e.target.checked});renderDashboard()});
$('budgetReminderSetting')?.addEventListener('change',e=>{writeUiSettings({budgetReminder:e.target.checked});renderDashboard()});
document.addEventListener('click',e=>{
 const accent=e.target.closest('#accentPicks button[data-accent]');
 if(accent){writeUiSettings({accent:accent.dataset.accent});showAppToast('เปลี่ยนสี Accent แล้ว ✨');return;}
 const up=e.target.closest('[data-quick-up]');if(up){moveQuick(up.dataset.quickUp,-1);return;}
 const down=e.target.closest('[data-quick-down]');if(down){moveQuick(down.dataset.quickDown,1);return;}
});
document.addEventListener('change',e=>{
 const input=e.target.closest('[data-quick-visible]');if(!input)return;
 const label=input.dataset.quickVisible;
 const hidden=new Set(uiSettings.quickHidden);
 if(input.checked)hidden.delete(label);else hidden.add(label);
 writeUiSettings({quickHidden:[...hidden]});renderSettings();renderDashboard();
});
for(const id of ['txFilterType','txFilterCategory','txFilterMonth'])$(id).onchange=renderTransactions;$('txSearch').oninput=renderTransactions;$('txType').onchange=fillTxSelectors;$('txCategory').onchange=renderCardPaymentSuggestions;$('summaryYear').onchange=renderSummary;$('summaryMonth').onchange=renderSummary


function favoriteKey(){return 'finance-favorites-v1:'+user.id}
function readFavorites(){try{const v=JSON.parse(localStorage.getItem(favoriteKey())||'[]');return Array.isArray(v)?v.filter(x=>x&&typeof x.description==='string'&&['income','expense'].includes(x.type)).slice(0,12):[]}catch{return []}}
function templateKey(x){return JSON.stringify([x.type,x.description.trim(),x.category_id||'',x.account_id||''])}
function repeatChoices(){
 const favorites=readFavorites(),seen=new Set(favorites.map(templateKey)),groups=new Map();
 for(const x of transactions){
  if(x.type!=='expense'||x.status==='cancelled'||['salary','car_installment'].includes(x.source)||/ค่างวดรถ|ชำระบัตร|เงินเดือน/.test(x.description||''))continue;
  const key=templateKey(x);const g=groups.get(key);if(g)g.count++;else groups.set(key,{...x,count:1});
 }
 return [...favorites.map(x=>({...x,favorite:true})),...[...groups.values()].filter(x=>x.count>=2&&!seen.has(templateKey(x))).sort((a,b)=>b.count-a.count)].slice(0,8);
}
function renderRepeatChoices(){
 const root=$('txRepeatList');root.replaceChildren();
 const choices=repeatChoices();$('txRepeatSection').classList.toggle('hidden',!!editing.id);
 if(!choices.length){root.textContent='บันทึกรายการแล้วเลือก “เก็บเป็นรายการโปรด” ครั้งต่อไปแตะใช้ได้เลย';return;}
 choices.forEach(x=>{
  const b=document.createElement('button');b.type='button';b.className='repeat-choice';
  const title=document.createElement('b');title.textContent=(x.favorite?'★ ':'↻ ')+x.description;
  const hint=document.createElement('small');hint.textContent=(categories.find(c=>c.id===x.category_id)?.name||'เลือกหมวดใหม่')+' · '+(accounts.find(a=>a.id===x.account_id)?.name||'ไม่ระบุบัญชี');
  b.append(title,hint);b.onclick=()=>{
   $('txType').value=x.type;fillTxSelectors();$('txDesc').value=x.description;
   $('txCategory').value=categories.some(c=>c.id===x.category_id&&c.type===x.type)?x.category_id:'';
   $('txAccount').value=accounts.some(a=>a.id===x.account_id&&a.is_active)?x.account_id:'';
   $('txAmount').value='';$('txNote').value='';$('txFavorite').checked=!!x.favorite;renderCardPaymentSuggestions();if(window.innerWidth>820){$('txAmount').focus();$('txAmount').scrollIntoView({block:'center',behavior:'smooth'});}
  };root.append(b);
 });
}
function saveFavorite(row){
 const list=readFavorites(),key=templateKey(row),next=list.filter(x=>templateKey(x)!==key);
 if($('txFavorite').checked)next.unshift({type:row.type,description:row.description,category_id:row.category_id,account_id:row.account_id});
 try{localStorage.setItem(favoriteKey(),JSON.stringify(next.slice(0,12)));return true}catch{return false}
}

window.openTx=(id=null)=>{
 editing={type:'tx',id};$('txFavorite').checked=false;$('txError').classList.add('hidden');$('txExtra').open=false;$('txRepeatSection').open=false;
 $('txDialogTitle').textContent=id?'แก้ไขรายการ':'บันทึกรายการ';
 $('txDate').value=bangkokDay();$('txAccount').value='';$('txType').value='expense';$('txDesc').value='';$('txAmount').value='';$('txNote').value='';
 fillTxSelectors();if(!id&&uiSettings.defaultAccount&&[...$('txAccount').options].some(o=>o.value===uiSettings.defaultAccount))$('txAccount').value=uiSettings.defaultAccount;renderRepeatChoices();
 if(id){const x=transactions.find(v=>v.id===id);if(x){$('txDate').value=x.transaction_date;$('txType').value=x.type;fillTxSelectors();$('txDesc').value=x.description;$('txAmount').value=x.amount;$('txCategory').value=x.category_id||'';$('txAccount').value=x.account_id||'';$('txNote').value=x.note||'';$('txFavorite').checked=readFavorites().some(f=>templateKey(f)===templateKey(x));$('txExtra').open=!!x.note;}}
 renderCardPaymentSuggestions();$('txDialog').showModal();requestAnimationFrame(()=>{$('txForm').scrollTop=0;});
}
function txError(message){$('txError').textContent=message;$('txError').classList.remove('hidden');$('txError').scrollIntoView({block:'nearest'})}
$('txForm').onsubmit=async e=>{
 e.preventDefault();const button=e.currentTarget.querySelector('button[type="submit"]');if(button.disabled)return;
 const row={user_id:user.id,transaction_date:$('txDate').value,type:$('txType').value,category_id:$('txCategory').value||null,account_id:$('txAccount').value||null,description:$('txDesc').value.trim(),amount:Number($('txAmount').value),status:transactions.find(x=>x.id===editing.id)?.status||'paid',note:$('txNote').value.trim()||null,source:transactions.find(x=>x.id===editing.id)?.source||'web'};
 if(!row.description||!Number.isFinite(row.amount)||row.amount<=0)return txError('กรอกรายละเอียดและยอดเงินให้ครบ');
 if(!row.category_id)return txError('เลือกหมวดหมู่ก่อนบันทึก');
 $('txError').classList.add('hidden');button.disabled=true;button.textContent='กำลังบันทึก…';
 try{
  const q=editing.id?supabase.from('transactions').update(row).eq('id',editing.id).eq('user_id',user.id):supabase.from('transactions').insert(row);
  const r=await q.select('id').single();
  if(r.error)throw r.error;
  const favoriteSaved=saveFavorite(row);$('txDialog').close();showAppToast(favoriteSaved?'บันทึกแล้ว ✅':'บันทึกรายการแล้ว แต่เก็บรายการโปรดในเครื่องนี้ไม่ได้');await loadAll();
 }catch(error){txError('บันทึกไม่ได้: '+error.message)}finally{button.disabled=false;button.textContent='บันทึก'}
}

window.openEntity=(type,id=null)=>{editing={type,id};const f=$('entityFields'),title=$('entityTitle');let x
 if(type==='category'){x=id?categories.find(v=>v.id===id):null;title.textContent=(id?'แก้ไข':'เพิ่ม')+'หมวดหมู่';f.innerHTML='<div class="field full"><label>ชื่อหมวด</label><input name="name" required value="'+esc(x?.name||'')+'"></div><div class="field"><label>ประเภท</label><select name="type"><option value="expense" '+(x?.type!=='income'?'selected':'')+'>รายจ่าย</option><option value="income" '+(x?.type==='income'?'selected':'')+'>รายรับ</option></select></div><div class="field"><label>ไอคอน Emoji</label><input name="icon" value="'+esc(x?.icon||'🏷️')+'"></div>'}
 if(type==='account'){x=id?accounts.find(v=>v.id===id):null;title.textContent=(id?'แก้ไข':'เพิ่ม')+'บัญชี';f.innerHTML='<div class="field full"><label>ชื่อบัญชี</label><input name="name" required value="'+esc(x?.name||'')+'"></div><div class="field"><label>ประเภท</label><select name="account_type">'+['bank','cash','credit_card','e_wallet','other'].map(v=>'<option value="'+v+'" '+(x?.account_type===v?'selected':'')+'>'+v+'</option>').join('')+'</select></div><div class="field"><label>ยอดตั้งต้น</label><input name="opening_balance" type="number" step="0.01" value="'+(x?.opening_balance||0)+'"></div><div class="field full"><label>หมายเหตุ</label><input name="note" value="'+esc(x?.note||'')+'"></div>'}
 if(type==='bill'){x=id?bills.find(v=>v.id===id):null;title.textContent=(id?'แก้ไข':'เพิ่ม')+'บิล';f.innerHTML='<div class="field full"><label>ชื่อบิล</label><input name="name" required value="'+esc(x?.name||'')+'"></div><div class="field"><label>จำนวนเงิน</label><input name="amount" type="number" step="0.01" min="0" value="'+(x?.amount||0)+'"></div><div class="field"><label>ครบกำหนดวันที่</label><input name="due_day" type="number" min="1" max="31" value="'+(x?.due_day??'')+'"></div><div class="field full"><label>หมวด</label><select name="category_id">'+categories.filter(c=>c.type==='expense').map(c=>'<option value="'+c.id+'" '+(x?.category_id===c.id?'selected':'')+'>'+esc((c.icon||'')+' '+c.name)+'</option>').join('')+'</select></div>'}
 if(type==='budget'){x=id?budgets.find(v=>v.id===id):null;title.textContent=(id?'แก้ไข':'เพิ่ม')+'งบประมาณ';const ex=x?.category_names||[];f.innerHTML='<div class="field full"><label>ชื่องบ</label><input name="name" required value="'+esc(x?.name||'')+'"></div><div class="field full"><label>งบต่อเดือน</label><input name="monthly_limit" type="number" min="0" step="100" required value="'+(x?.monthly_limit||4000)+'"></div><div class="field full"><label>หมวดที่นับรวมในงบ</label><div class="budget-checks">'+categories.filter(c=>c.type==='expense').map(c=>'<label class="check"><input type="checkbox" name="category_names" value="'+esc(c.name)+'" '+(ex.includes(c.name)?'checked':'')+'><span>'+esc((c.icon||'')+' '+c.name)+'</span></label>').join('')+'</div></div>'}
 if(type==='debt'){x=id?debts.find(v=>v.id===id):null;title.textContent=(id?'แก้ไข':'เพิ่ม')+'บัตร/สินเชื่อ';f.innerHTML='<div class="field full"><label>ชื่อบัตร/สินเชื่อ</label><input name="name" required value="'+esc(x?.name||'')+'"></div><div class="field"><label>ประเภท</label><select name="debt_type">'+['credit_card','loan','car','mortgage','other'].map(v=>'<option value="'+v+'" '+(x?.debt_type===v?'selected':'')+'>'+v+'</option>').join('')+'</select></div><div class="field"><label>วงเงิน</label><input name="original_amount" type="number" min="0" step="0.01" value="'+(x?.original_amount||0)+'"></div><div class="field"><label>ยอดคงเหลือบัตร / ยอดใช้ไป</label><input name="outstanding_amount" type="number" min="0" step="0.01" value="'+(x?.outstanding_amount||0)+'"></div><div class="field"><label>ยอดที่ต้องจ่ายรอบนี้</label><input name="installment_amount" type="number" min="0" step="0.01" value="'+(x?.installment_amount||0)+'"></div><div class="field"><label>ครบกำหนดวันที่</label><input name="due_day" type="number" min="1" max="31" value="'+(x?.due_day??'')+'"></div>'}
 $('entityDialog').showModal()}
$('entityForm').onsubmit=async e=>{
 e.preventDefault();const button=e.currentTarget.querySelector('button[type="submit"]');if(button.disabled)return;
 const form=new FormData(e.currentTarget),fd=Object.fromEntries(form.entries());
 const table={category:'categories',account:'accounts',bill:'bills',budget:'budgets',debt:'debts'}[editing.type];
 fd.user_id=user.id;fd.name=fd.name.trim();if(!fd.name)return alert('กรุณากรอกชื่อ');
 if(editing.type==='budget'){fd.monthly_limit=Number(fd.monthly_limit||0);fd.category_names=form.getAll('category_names')}
 else for(const k of ['opening_balance','amount','due_day','original_amount','outstanding_amount','installment_amount'])if(k in fd)fd[k]=k==='due_day'&&fd[k]===''?null:Number(fd[k]||0);
 if('category_id' in fd)fd.category_id=fd.category_id||null;
 if(!editing.id){if(editing.type==='category')fd.sort_order=0;else fd.is_active=true;if(editing.type==='bill')fd.frequency='monthly'}
 button.disabled=true;
 try{
  const q=editing.id?supabase.from(table).update(fd).eq('id',editing.id).eq('user_id',user.id):supabase.from(table).insert(fd);
  const {error}=await q.select('id').single();if(error)throw error;
  $('entityDialog').close();showAppToast('บันทึกแล้ว ✅');await loadAll();
 }catch(error){alert('บันทึกไม่ได้: '+error.message)}finally{button.disabled=false}
}

document.addEventListener('click',async e=>{const pay=e.target.closest('[data-pay-debt]');if(pay){const d=debts.find(x=>x.id===pay.dataset.payDebt);if(d){const cat=categories.find(c=>c.type==='expense'&&c.name==='หนี้/ผ่อน');$('txType').value='expense';fillTxSelectors();if(cat)$('txCategory').value=cat.id;$('txDesc').value='ชำระบัตร '+d.name;$('txAmount').value=Number(d.installment_amount||0)>0?Number(d.installment_amount):'';$('txNote').value='ยอดคงเหลือก่อนชำระ '+money(d.outstanding_amount||0);renderCardPaymentSuggestions();if(window.innerWidth>820)$('txAmount').focus()}return}const edit=e.target.closest('[data-edit]');if(edit){const t=edit.dataset.edit,id=edit.dataset.id;if(t==='tx'&&transactions.find(x=>x.id===id)?.source==='car_installment'){location.href='./car.html';return}if(t==='tx'&&transactions.find(x=>x.id===id)?.source==='salary'){location.href='./salary.html';return}if(t==='tx')openTx(id);else openEntity(t,id);return}const del=e.target.closest('[data-del]');if(del){if(del.dataset.del==='transactions'&&transactions.find(x=>x.id===del.dataset.id)?.source==='car_installment'){alert('กรุณาจัดการรายการนี้ผ่านหน้าผ่อนรถ');return}if(del.dataset.del==='transactions'&&transactions.find(x=>x.id===del.dataset.id)?.source==='salary'){alert('กรุณาจัดการรายการนี้ผ่านหน้าเงินเดือน');return}if(!confirm('ยืนยันลบรายการนี้?'))return;const {error}=await supabase.from(del.dataset.del).delete().eq('id',del.dataset.id).eq('user_id',user.id);if(error)alert('ลบไม่ได้: '+error.message);else await loadAll()}})
let reloadTimer;function scheduleLoad(){clearTimeout(reloadTimer);reloadTimer=setTimeout(()=>loadAll(),200)}
function subscribe(){if(channel)supabase.removeChannel(channel);channel=supabase.channel('finance-live').on('postgres_changes',{event:'*',schema:'public',table:'transactions',filter:'user_id=eq.'+user.id},scheduleLoad).on('postgres_changes',{event:'*',schema:'public',table:'categories',filter:'user_id=eq.'+user.id},scheduleLoad).on('postgres_changes',{event:'*',schema:'public',table:'accounts',filter:'user_id=eq.'+user.id},scheduleLoad).on('postgres_changes',{event:'*',schema:'public',table:'bills',filter:'user_id=eq.'+user.id},scheduleLoad).on('postgres_changes',{event:'*',schema:'public',table:'debts',filter:'user_id=eq.'+user.id},scheduleLoad).on('postgres_changes',{event:'*',schema:'public',table:'budgets',filter:'user_id=eq.'+user.id},scheduleLoad).subscribe()}
window.txDialog=$('txDialog');window.entityDialog=$('entityDialog');
supabase.auth.onAuthStateChange((event,session)=>{
 if(event==='SIGNED_OUT'){
  if(channel){supabase.removeChannel(channel);channel=null}
  user=null;location.reload();return;
 }
 if(event==='TOKEN_REFRESHED'&&session?.user)user=session.user;
 if(event==='USER_UPDATED'&&session?.user){user=session.user;if($('userEmail'))$('userEmail').textContent=session.user.email||'';}
});
const {data:{session}}=await supabase.auth.getSession();if(session?.user)await boot(session.user)

if('serviceWorker' in navigator){window.addEventListener('load',async()=>{try{const reg=await navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'});void reg.update()}catch(e){console.warn(e)}})}



// VisualViewport follows the on-screen keyboard without moving the page navigation.


// Keyboard-safe transaction dialog for iOS / mobile browsers.
function syncKeyboardState(){
 const dlg=$('txDialog'); if(!dlg?.open||!window.visualViewport)return;
 const keyboardOpen=window.innerHeight-window.visualViewport.height>120;
 dlg.classList.toggle('keyboard-open',keyboardOpen);
}
window.visualViewport?.addEventListener('resize',syncKeyboardState);
window.visualViewport?.addEventListener('scroll',syncKeyboardState);
$('txDialog')?.addEventListener('close',()=>{$('txDialog').classList.remove('keyboard-open')});
$('txDialog')?.addEventListener('focusin',e=>{
 if(window.innerWidth>820)return;
 const el=e.target;
 if(!(el instanceof HTMLElement))return;
 setTimeout(()=>el.scrollIntoView({block:'center',inline:'nearest',behavior:'smooth'}),120);
});
