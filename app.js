import {bangkokDay,bangkokDate,readAll,budgetSummary,monthlyDue,billDue,lockFinanceForm} from './finance-core.js?v=20261007-detail4';
import {fetchFinanceData,createRefreshCoordinator} from './app-data.js?v=20261007-detail4';
import {createSummaryRenderer} from './app-summary.js?v=20261007-detail4';
import {createDashboardRenderer} from './app-dashboard.js?v=20261007-detail4';
import {createTransactionRenderer} from './app-transactions.js?v=20261007-detail4';
import {createPlanningRenderer} from './app-planning.js?v=20261007-detail4';
import {findDuplicateCandidates,runDataHealthCheck} from './app-safety.js?v=20261007-detail4';
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
const formatAccountNumber=value=>{
 const n=String(value||'').replace(/\D/g,'');if(!n)return '';
 if(n.length===10)return n.slice(0,3)+'-'+n.slice(3,4)+'-'+n.slice(4,9)+'-'+n.slice(9);
 if(n.length===11)return n.slice(0,3)+'-'+n.slice(3,6)+'-'+n.slice(6);
 if(n.length===12)return n.slice(0,3)+'-'+n.slice(3,4)+'-'+n.slice(4,9)+'-'+n.slice(9);
 return n;
};
function accountLabel(a){return String(a?.name||'')+(a?.account_number?' · '+formatAccountNumber(a.account_number):'')}
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
let mode='login',user=null,categories=[],accounts=[],transactions=[],bills=[],debts=[],budgets=[],channel=null,editing={type:null,id:null},carExpenseTxIds=new Set(),duplicateOverride=false,lastSyncAt=null,sessionRevision=0

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
 const reg=await navigator.serviceWorker.getRegistration();return reg?reg.pushManager.getSubscription():null;
}
async function refreshPushStatus(){
 const text=$('pushStatusText'),badge=$('pushStatusBadge'),on=$('enablePushBtn'),test=$('testPushBtn'),off=$('disablePushBtn'),toggle=$('pushDeviceSetting');
 if(!text||!badge)return;
 if(!('Notification' in window)||!('serviceWorker' in navigator)||!('PushManager' in window)){
  text.textContent='อุปกรณ์หรือเบราว์เซอร์นี้ยังไม่รองรับ';badge.textContent='ไม่รองรับ';if(toggle){toggle.checked=false;toggle.disabled=true;}
  on?.classList.add('hidden');test?.classList.add('hidden');off?.classList.add('hidden');return;
 }
 const sub=await currentPushSubscription().catch(()=>null);
 if(sub&&Notification.permission==='granted'){
  text.textContent='เปิดอยู่บนอุปกรณ์นี้';badge.textContent='เปิดอยู่';badge.classList.add('income');if(toggle){toggle.checked=true;toggle.disabled=false;}
  on?.classList.add('hidden');test?.classList.remove('hidden');off?.classList.remove('hidden');
 }else{
  text.textContent=Notification.permission==='denied'?'ถูกบล็อกในตั้งค่าของเบราว์เซอร์':'ปิดอยู่บนอุปกรณ์นี้';
  badge.textContent=Notification.permission==='denied'?'ถูกบล็อก':'ปิดอยู่';badge.classList.remove('income');if(toggle){toggle.checked=false;toggle.disabled=Notification.permission==='denied';}
  on?.classList.add('hidden');test?.classList.add('hidden');off?.classList.add('hidden');
 }
}
async function enablePush(){
 if(!('Notification' in window)||!('serviceWorker' in navigator)||!('PushManager' in window))throw new Error('อุปกรณ์นี้ยังไม่รองรับ Web Push');
 const permission=await Notification.requestPermission();if(permission!=='granted')throw new Error('ยังไม่ได้อนุญาต Notification');
 const cfg=await pushCall('config');
 const reg=await navigator.serviceWorker.getRegistration();
 if(!reg?.active)throw new Error('ระบบแจ้งเตือนยังไม่พร้อม กรุณารีเฟรชแล้วลองใหม่');
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
  account.innerHTML='<option value="">ไม่ระบุบัญชี</option>'+accounts.filter(a=>a.is_active!==false).map(a=>'<option value="'+a.id+'">'+esc(accountLabel(a))+'</option>').join('');
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
async function requestLogout(button){
 if(!button||button.disabled)return;
 if(!confirm('ออกจากระบบ My Finance บนอุปกรณ์นี้หรือไม่?'))return;
 button.disabled=true;
 try{const {error}=await supabase.auth.signOut();if(error)throw error;clearSessionUI();location.reload()}
 catch(error){showAppToast('ออกจากระบบไม่สำเร็จ: '+error.message)}finally{button.disabled=false}
}
$('logout').onclick=()=>requestLogout($('logout'));
$('settingsLogout')?.addEventListener('click',()=>void requestLogout($('settingsLogout')));
function clearSessionUI(){
 sessionRevision++;user=null;refreshCoordinator.dispose();
 if(channel){supabase.removeChannel(channel);channel=null}
 categories=[];accounts=[];transactions=[];bills=[];debts=[];budgets=[];carExpenseTxIds=new Set();lastSyncAt=null;
 document.querySelectorAll('dialog[open]').forEach(dialog=>dialog.close());
 $('authSplash')?.classList.add('hidden');$('app').classList.add('hidden');$('authScreen').classList.remove('hidden');$('password').value='';
} 

function setSyncStatus(state,message=''){
 const bar=$('syncStatusBar'),dot=$('syncStatusDot'),text=$('syncStatusText'),retry=$('syncRetryBtn');if(!bar||!dot||!text)return;
 bar.dataset.state=state;dot.dataset.state=state;
 if(state==='syncing')text.textContent=message||'กำลังซิงก์…';
 else if(state==='ok'){lastSyncAt=new Date();text.textContent=message||('ซิงก์แล้ว · '+lastSyncAt.toLocaleTimeString('th-TH',{hour:'2-digit',minute:'2-digit'}));}
 else text.textContent=message||'ยังซิงก์ไม่ได้';
 retry?.classList.toggle('hidden',state!=='error');
}
$('syncRetryBtn')?.addEventListener('click',()=>void loadAll());
window.addEventListener('online',()=>{if(!user)return;setSyncStatus('syncing','กลับมาออนไลน์แล้ว · กำลังอัปเดต…');void loadAll()});
window.addEventListener('offline',()=>setSyncStatus('error','ออฟไลน์ · ข้อมูลอาจยังไม่ล่าสุด'));

async function boot(u){if(user?.id!==u.id)sessionRevision++;user=u;$('authSplash')?.classList.add('hidden');$('authScreen').classList.add('hidden');$('app').classList.remove('hidden');$('userEmail').textContent=u.email||'';await loadAll();if(user?.id!==u.id)return;subscribe();showPage(location.hash.slice(1)||'dashboard')}
async function performLoad(){
 if(!user)return false;
 const loadingUser=user.id,revision=sessionRevision;
 setSyncStatus('syncing');
 try{
  const data=await fetchFinanceData(supabase,loadingUser,readAll);
  if(user?.id!==loadingUser||sessionRevision!==revision)return false;
  if(editorOpen()){scheduleLoad();return false;}
  categories=data.categories;accounts=data.accounts;transactions=data.transactions;
  bills=data.bills;debts=data.debts;budgets=data.budgets;carExpenseTxIds=data.carExpenseTxIds;
  $('dataError').classList.add('hidden');setSyncStatus('ok');renderAll();return true;
 }catch(error){
  if(user?.id!==loadingUser||sessionRevision!==revision)return false;
  $('dataErrorText').textContent='โหลดข้อมูลล่าสุดไม่ได้ ข้อมูลที่เห็นอาจยังไม่ครบหรือไม่เป็นปัจจุบัน: '+error.message;
  $('dataError').classList.remove('hidden');setSyncStatus('error','ซิงก์ไม่สำเร็จ · '+error.message);return false;
 }
}
function editorOpen(){return !!($('txDialog')?.open||$('entityDialog')?.open)}
const refreshCoordinator=createRefreshCoordinator({
 refresh:performLoad,
 isBlocked:editorOpen,
 getDelay:()=>Math.max(180,360-(performance.now()-lastNavigationAt))
});
async function loadAll(){return refreshCoordinator.run()}
function scheduleLoad(){refreshCoordinator.schedule()}
function flushRealtimeAfterEdit(){refreshCoordinator.flush()}
$('txDialog')?.addEventListener('close',flushRealtimeAfterEdit);
$('entityDialog')?.addEventListener('close',flushRealtimeAfterEdit);
$('retryData').onclick=()=>loadAll();
function renderAll(){fillTxSelectors();renderDashboard();renderTransactions();renderCategories();renderAccounts();renderBills();renderDebts();renderBudget();renderSummary();renderSettings();applyUiSettings();void refreshPushStatus()}
function showAppToast(message,action=null){
 const el=$('appToast');if(!el)return;clearTimeout(window.__toastTimer);el.replaceChildren();
 const text=document.createElement('span');text.textContent=message;el.append(text);el.classList.remove('hidden');
 if(action){
  const view=document.createElement('button');view.type='button';view.className='toast-action';view.textContent=action.label;view.onclick=()=>{action.run();el.classList.add('hidden')};el.append(view);
  const close=document.createElement('button');close.type='button';close.className='toast-close';close.textContent='×';close.setAttribute('aria-label','ปิดข้อความ');close.onclick=()=>el.classList.add('hidden');el.append(close);
 }else window.__toastTimer=setTimeout(()=>el.classList.add('hidden'),4000);
}
function savedNotice(label,refreshed,action){
 showAppToast(label+(refreshed?' · โหลดข้อมูลล่าสุดแล้ว':' · โหลดข้อมูลล่าสุดไม่ได้ กรุณากดโหลดใหม่ ไม่ต้องบันทึกซ้ำ'),refreshed?action:{label:'โหลดใหม่',run:async()=>savedNotice(label,await loadAll(),action)});
}
function viewSavedTransaction(row){
 $('txFilterType').value='all';$('txFilterCategory').value='';$('txFilterMonth').value=row.transaction_date.slice(0,7);$('txSearch').value=row.description;
 renderTransactions();showPage('transactions');
}
function quickCategoryMatch(label){
 const aliases={อาหาร:['อาหาร'],กาแฟ:['กาแฟ','อาหาร'],รถ:['รถยนต์','เดินทาง'],ซื้อของ:['ช้อปปิ้ง'],จ่ายบัตร:['หนี้/ผ่อน'],บิล:['บิล/สาธารณูปโภค']}
 const names=aliases[label]||[label]
 for(const name of names){const match=categories.find(c=>c.type==='expense'&&c.name===name);if(match)return match}
 return categories.find(c=>c.type==='expense'&&c.name==='อื่นๆ')||null
}
window.quickAdd=(label,desc='')=>{
 if($('txForm').querySelector('button[type=submit]').disabled)return;
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
let dashboardDay=bangkokDay();
function checkDailyRollover(){
 refreshDailyGreeting();
 const day=bangkokDay();
 if(!user||day===dashboardDay||editorOpen())return;
 renderDashboard();renderBudget();renderSummary();dashboardDay=day;
}
setInterval(checkDailyRollover, 60000);
document.addEventListener('visibilitychange', () => {
 if (!document.hidden) checkDailyRollover();
});

const renderDashboard=createDashboardRenderer({
 $,
 money,
 fmtDate,
 esc,
 bangkokDate,
 bangkokDay,
 billDue,
 nextDueDate,
 getTransactions:()=>transactions,
 getBills:()=>bills,
 getDebts:()=>debts,
 getUiSettings:()=>uiSettings,
 budgetTotals,
 orderedQuickItems,
 showPage,
 renderTxList,
 refreshDailyGreeting
});

const transactionRenderer=createTransactionRenderer({
 $,
 money,
 fmtDate,
 esc,
 getTransactions:()=>transactions
});
function filteredTx(){return transactionRenderer.filteredTx()}
function renderTransactions(){return transactionRenderer.renderTransactions()}
function renderTxList(el,arr,compact=false){return transactionRenderer.renderTxList(el,arr,compact)}
function renderCategories(){for(const type of ['expense','income']){const el=$(type==='expense'?'expenseCats':'incomeCats'),arr=categories.filter(c=>c.type===type);el.innerHTML=arr.length?arr.map(c=>'<div class="category-card"><div class="left"><span class="icon">'+esc(c.icon||'🏷️')+'</span><span class="name">'+esc(c.name)+'</span></div><div class="actions"><button class="btn small soft" data-edit="category" data-id="'+c.id+'">แก้</button><button class="btn small danger" data-del="categories" data-id="'+c.id+'">ลบ</button></div></div>').join(''):'<div class="empty">ยังไม่มีหมวด</div>'}}
function renderAccounts(){const active=accounts.filter(a=>a.is_active!==false);$('accountList').innerHTML=active.length?active.map(a=>'<div class="item"><div><b>🏦 '+esc(a.name)+'</b><span class="muted">'+(a.account_number?'เลขที่บัญชี '+esc(formatAccountNumber(a.account_number))+' · ':'')+esc(a.account_type)+(a.note?' · '+esc(a.note):'')+'</span></div><span class="amount"><small class="muted">ยอดตั้งต้น</small> '+money(a.opening_balance)+'</span><div class="actions"><button class="btn small soft" data-edit="account" data-id="'+a.id+'">แก้ไข</button><button class="btn small danger" data-del="accounts" data-id="'+a.id+'">ลบ</button></div></div>').join(''):'<div class="empty">ยังไม่มีบัญชี</div>'}
const planningRenderer=createPlanningRenderer({
 $,
 money,
 esc,
 bangkokDay,
 budgetSummary,
 getBills:()=>bills,
 getDebts:()=>debts,
 getBudgets:()=>budgets,
 getTransactions:()=>transactions
});
function renderBills(){return planningRenderer.renderBills()}
function renderDebts(){return planningRenderer.renderDebts()}
function renderBudget(){return planningRenderer.renderBudget()}
function budgetTotals(){return planningRenderer.budgetTotals()}
const renderSummary=createSummaryRenderer({
 $,
 money,
 esc,
 bangkokDay,
 getTransactions:()=>transactions,
 ChartCtor:typeof Chart==='undefined'?null:Chart
});
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
 $('txAccount').innerHTML='<option value="">ไม่ระบุบัญชี</option>'+accounts.filter(a=>a.is_active!==false).map(a=>'<option value="'+a.id+'">'+esc(accountLabel(a))+'</option>').join('')
 $('txFilterCategory').innerHTML='<option value="">ทุกหมวด</option>'+categories.map(c=>'<option value="'+c.id+'">'+esc((c.icon||'')+' '+c.name)+'</option>').join('')
 $('txAccount').value=currentAccount; $('txFilterCategory').value=currentFilter;
 renderCardPaymentSuggestions()
}

const pageNodes=[...document.querySelectorAll('.page')];
const pageByName=new Map(pageNodes.map(p=>[p.id.replace(/Page$/,''),p]));
const navNodes=[...document.querySelectorAll('.navbtn[data-page]')];
let activePageName=null;
let lastNavigationAt=0;
function resolvePage(name){
 const clean=pageByName.has(name)?name:'dashboard';
 return [clean,pageByName.get(clean)||$('dashboardPage')];
}
function showPage(name){
 const [nextName,target]=resolvePage(name);if(!target)return;
 if(activePageName===nextName&&!target.classList.contains('hidden'))return;
 const previous=activePageName?pageByName.get(activePageName):pageNodes.find(p=>!p.classList.contains('hidden'));
 if(previous&&previous!==target)previous.classList.add('hidden');
 target.classList.remove('hidden');
 target.classList.remove('page-enter');
 void target.offsetWidth;
 target.classList.add('page-enter');
 activePageName=nextName;
 lastNavigationAt=performance.now();
 for(const x of navNodes){
  const selected=x.dataset.page===nextName;
  if(x.classList.contains('active')!==selected)x.classList.toggle('active',selected);
  if(selected){if(x.getAttribute('aria-current')!=='page')x.setAttribute('aria-current','page');}
  else if(x.hasAttribute('aria-current'))x.removeAttribute('aria-current');
 }
 const nextHash='#'+nextName;
 if(location.hash!==nextHash)history.replaceState(null,'',nextHash);
 window.dispatchEvent(new CustomEvent('finance:page',{detail:nextName}));
 if(window.scrollY!==0)window.scrollTo({top:0,behavior:'auto'});
}
window.addEventListener('finance:navigate',e=>showPage(e.detail));
window.addEventListener('hashchange',()=>showPage(location.hash.slice(1)||'dashboard'));
navNodes.forEach(b=>b.onclick=()=>showPage(b.dataset.page));
document.addEventListener('click',e=>{const j=e.target.closest('[data-page-jump]');if(j)showPage(j.dataset.pageJump)})

$('pushDeviceSetting')?.addEventListener('change',async e=>{
 const toggle=e.currentTarget;toggle.disabled=true;
 try{
  if(toggle.checked)await enablePush();else await disablePush();
 }catch(err){
  await refreshPushStatus();
  showAppToast((toggle.checked?'เปิด':'ปิด')+'แจ้งเตือนไม่ได้: '+err.message);
 }finally{toggle.disabled=false;}
});
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
document.addEventListener('click',e=>{const range=e.target.closest('[data-summary-range]');if(range){renderSummary.setRange?.(range.dataset.summaryRange)}})


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
 if(!user||$('txForm').querySelector('button[type=submit]').disabled)return;
 duplicateOverride=false;$('txDuplicateWarning')?.classList.add('hidden');
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
 if(!editing.id&&!duplicateOverride){
  const duplicates=findDuplicateCandidates(row,transactions);
  if(duplicates.length){
   const first=duplicates[0],warning=$('txDuplicateWarning');
   $('txDuplicateText').textContent='พบ '+duplicates.length+' รายการใกล้เคียง · '+fmtDate(first.transaction_date)+' · '+money(first.amount)+' · '+first.description;
   warning?.classList.remove('hidden');warning?.scrollIntoView({block:'nearest'});return;
  }
 }
 $('txDuplicateWarning')?.classList.add('hidden');
 $('txError').classList.add('hidden');const unlock=lockFinanceForm($('txForm'),$('txDialog'));
 button.disabled=true;button.textContent='กำลังบันทึก…';let committed=false;
 try{
  const q=editing.id?supabase.from('transactions').update(row).eq('id',editing.id).eq('user_id',user.id):supabase.from('transactions').insert(row);
  const r=await q.select('id').single();
  if(r.error)throw r.error;
  committed=true;const favoriteSaved=saveFavorite(row);$('txDialog').close();
  const label='บันทึกรายการแล้ว ✅'+(row.status==='cancelled'?' · รายการยกเลิก ไม่นับรวมยอด':'')+(!favoriteSaved?' · เก็บรายการโปรดในเครื่องนี้ไม่ได้':'');
  savedNotice(label,await loadAll(),{label:'ดูรายการ',run:()=>viewSavedTransaction(row)});
 }catch(error){if(committed)savedNotice('บันทึกรายการสำเร็จแล้ว',false,{label:'ดูรายการ',run:()=>viewSavedTransaction(row)});else txError('บันทึกไม่ได้: '+error.message)}finally{unlock();button.disabled=false;button.textContent='บันทึก'}
}
$('txDuplicateContinue')?.addEventListener('click',()=>{duplicateOverride=true;$('txDuplicateWarning')?.classList.add('hidden');$('txForm').requestSubmit()});
for(const id of ['txAmount','txDesc','txDate','txCategory','txAccount']){
 $(id)?.addEventListener('input',()=>{duplicateOverride=false;$('txDuplicateWarning')?.classList.add('hidden')});
 $(id)?.addEventListener('change',()=>{duplicateOverride=false;$('txDuplicateWarning')?.classList.add('hidden')});
}

async function refreshHealthCheck(){
 const btn=$('runHealthCheck');if(!btn||!user)return;
 btn.disabled=true;btn.textContent='กำลังตรวจ…';
 try{
  if(!await loadAll())throw new Error('ซิงก์ข้อมูลล่าสุดไม่สำเร็จ กรุณาลองใหม่');
  const result=await runDataHealthCheck({db:supabase,userId:user.id,transactions,readAll});
  const set=(id,ok,bad)=>{const el=$(id);if(!el)return;el.textContent=ok?'ปกติ ✅':bad;el.classList.toggle('health-bad',!ok);};
  set('healthSync',!!lastSyncAt,lastSyncAt?'':'ยังไม่เคยซิงก์สำเร็จ');
  set('healthDuplicates',result.duplicateGroups===0,'พบ '+result.duplicateGroups+' กลุ่ม');
  set('healthSalary',result.orphanSalary===0,'หลุด '+result.orphanSalary+' รายการ');
  set('healthInstallments',result.orphanInstallments===0,'หลุด '+result.orphanInstallments+' รายการ');
  set('healthCar',result.orphanCar===0,'หลุด '+result.orphanCar+' รายการ');
  const pushSupported='Notification' in window&&'serviceWorker' in navigator&&'PushManager' in window;
  const sub=pushSupported?await currentPushSubscription().catch(()=>null):null;
  const pushOk=!!sub&&Notification.permission==='granted';
  const push=$('healthPush');if(push){push.textContent=!pushSupported?'ไม่รองรับ':pushOk?'พร้อมใช้งาน ✅':'ยังไม่เปิด';push.classList.toggle('health-bad',pushSupported&&!pushOk);}
  $('healthCheckedAt').textContent='ตรวจล่าสุด '+new Date().toLocaleTimeString('th-TH',{hour:'2-digit',minute:'2-digit'});
 }catch(error){
  $('healthSync').textContent='ตรวจข้อมูลล่าสุดไม่สำเร็จ';$('healthSync').classList.add('health-bad');
  $('healthCheckedAt').textContent='ตรวจไม่สำเร็จ: '+error.message;
 }finally{btn.disabled=false;btn.textContent='ตรวจสอบอีกครั้ง'}
}
$('runHealthCheck')?.addEventListener('click',()=>void refreshHealthCheck());

window.openEntity=(type,id=null)=>{if(!user||$('entityForm').querySelector('button[type=submit]').disabled)return;editing={type,id};const f=$('entityFields'),title=$('entityTitle');let x
 if(type==='category'){x=id?categories.find(v=>v.id===id):null;title.textContent=(id?'แก้ไข':'เพิ่ม')+'หมวดหมู่';f.innerHTML='<div class="field full"><label>ชื่อหมวด</label><input name="name" required value="'+esc(x?.name||'')+'"></div><div class="field"><label>ประเภท</label><select name="type"><option value="expense" '+(x?.type!=='income'?'selected':'')+'>รายจ่าย</option><option value="income" '+(x?.type==='income'?'selected':'')+'>รายรับ</option></select></div><div class="field"><label>ไอคอน Emoji</label><input name="icon" value="'+esc(x?.icon||'🏷️')+'"></div>'}
 if(type==='account'){x=id?accounts.find(v=>v.id===id):null;title.textContent=(id?'แก้ไข':'เพิ่ม')+'บัญชี';f.innerHTML='<div class="field full"><label>ชื่อบัญชี / ชื่อสมุด</label><input name="name" required value="'+esc(x?.name||'')+'"></div><div class="field"><label>ตัวย่อธนาคาร</label><input name="bank_code" maxlength="20" value="'+esc(x?.bank_code||'')+'" placeholder="เช่น KBANK"></div><div class="field"><label>เลขที่บัญชี</label><input name="account_number" inputmode="numeric" value="'+esc(x?.account_number||'')+'" placeholder="กรอกเฉพาะตัวเลข"></div><div class="field"><label>ประเภท</label><select name="account_type">'+['bank','cash','credit_card','e_wallet','other'].map(v=>'<option value="'+v+'" '+(x?.account_type===v?'selected':'')+'>'+v+'</option>').join('')+'</select></div><div class="field"><label>ยอดตั้งต้น</label><input name="opening_balance" type="number" step="0.01" value="'+(x?.opening_balance||0)+'"></div><div class="field full"><label>หมายเหตุ</label><input name="note" value="'+esc(x?.note||'')+'"></div>'}
 if(type==='bill'){x=id?bills.find(v=>v.id===id):null;title.textContent=(id?'แก้ไข':'เพิ่ม')+'บิล';const defaultBillCategory=x?.category_id||categories.find(c=>c.type==='expense'&&c.name==='บิล/สาธารณูปโภค')?.id||'',paymentSource=x?.debt_id?('debt:'+x.debt_id):x?.account_id?('account:'+x.account_id):(uiSettings.defaultAccount?('account:'+uiSettings.defaultAccount):'');f.innerHTML='<div class="field full"><label>ชื่อบิล</label><input name="name" required value="'+esc(x?.name||'')+'"></div><div class="field"><label>จำนวนเงิน</label><input name="amount" type="number" step="0.01" min="0" value="'+(x?.amount||0)+'"></div><div class="field"><label>ครบกำหนดวันที่</label><input name="due_day" type="number" min="1" max="31" value="'+(x?.due_day??'')+'"></div><div class="field full"><label>หมวด</label><select name="category_id">'+categories.filter(c=>c.type==='expense').map(c=>'<option value="'+c.id+'" '+(defaultBillCategory===c.id?'selected':'')+'>'+esc((c.icon||'')+' '+c.name)+'</option>').join('')+'</select></div><div class="field full"><label>ชำระผ่าน</label><select name="payment_source"><option value="">ไม่ระบุ</option><optgroup label="บัญชี / เงินสด">'+accounts.filter(a=>a.is_active!==false).map(a=>'<option value="account:'+a.id+'" '+(paymentSource==='account:'+a.id?'selected':'')+'>🏦 '+esc(a.name)+'</option>').join('')+'</optgroup><optgroup label="บัตรเครดิต / สินเชื่อ">'+debts.filter(d=>d.is_active!==false).map(d=>'<option value="debt:'+d.id+'" '+(paymentSource==='debt:'+d.id?'selected':'')+'>💳 '+esc(d.name)+'</option>').join('')+'</optgroup></select><small class="muted">ถ้าเลือกบัตร ระบบจะเพิ่มยอดคงเหลือบัตรเมื่อกด “จ่ายแล้ว”</small></div>'}
 if(type==='budget'){x=id?budgets.find(v=>v.id===id):null;title.textContent=(id?'แก้ไข':'เพิ่ม')+'งบประมาณ';const ex=x?.category_names||[];f.innerHTML='<div class="field full"><label>ชื่องบ</label><input name="name" required value="'+esc(x?.name||'')+'"></div><div class="field full"><label>งบต่อเดือน</label><input name="monthly_limit" type="number" min="0" step="100" required value="'+(x?.monthly_limit??4000)+'"></div><div class="field full"><label>หมวดที่นับรวมในงบ</label><div class="budget-checks">'+categories.filter(c=>c.type==='expense').map(c=>'<label class="check"><input type="checkbox" name="category_names" value="'+esc(c.name)+'" '+(ex.includes(c.name)?'checked':'')+'><span>'+esc((c.icon||'')+' '+c.name)+'</span></label>').join('')+'</div></div>'}
 if(type==='debt'){x=id?debts.find(v=>v.id===id):null;title.textContent=(id?'แก้ไข':'เพิ่ม')+'บัตร/สินเชื่อ';f.innerHTML='<div class="field full"><label>ชื่อบัตร/สินเชื่อ</label><input name="name" required value="'+esc(x?.name||'')+'"></div><div class="field"><label>ประเภท</label><select name="debt_type">'+['credit_card','loan','car','mortgage','other'].map(v=>'<option value="'+v+'" '+(x?.debt_type===v?'selected':'')+'>'+v+'</option>').join('')+'</select></div><div class="field"><label>วงเงิน</label><input name="original_amount" type="number" min="0" step="0.01" value="'+(x?.original_amount||0)+'"></div><div class="field"><label>ยอดคงเหลือบัตร / ยอดใช้ไป</label><input name="outstanding_amount" type="number" min="0" step="0.01" value="'+(x?.outstanding_amount||0)+'"></div><div class="field"><label>ยอดที่ต้องจ่ายรอบนี้</label><input name="installment_amount" type="number" min="0" step="0.01" value="'+(x?.installment_amount||0)+'"></div><div class="field"><label>ครบกำหนดวันที่</label><input name="due_day" type="number" min="1" max="31" value="'+(x?.due_day??'')+'"></div>'}
 $('entityDialog').showModal()}
$('entityForm').onsubmit=async e=>{
 e.preventDefault();const button=e.currentTarget.querySelector('button[type="submit"]');if(button.disabled)return;
 const form=new FormData(e.currentTarget),fd=Object.fromEntries(form.entries());
 const table={category:'categories',account:'accounts',bill:'bills',budget:'budgets',debt:'debts'}[editing.type];
 fd.user_id=user.id;fd.name=fd.name.trim();if(!fd.name)return alert('กรุณากรอกชื่อ');if(editing.type==='account'){fd.bank_code=String(fd.bank_code||'').trim()||null;fd.account_number=String(fd.account_number||'').replace(/\\D/g,'')||null;}
 if(editing.type==='budget'){fd.monthly_limit=Number(fd.monthly_limit||0);fd.category_names=form.getAll('category_names')}
 else for(const k of ['opening_balance','amount','due_day','original_amount','outstanding_amount','installment_amount'])if(k in fd)fd[k]=k==='due_day'&&fd[k]===''?null:Number(fd[k]||0);
 if('category_id' in fd)fd.category_id=fd.category_id||null;
 if(editing.type==='bill'){
  const paymentSource=String(fd.payment_source||'');delete fd.payment_source;
  fd.account_id=paymentSource.startsWith('account:')?paymentSource.slice(8):null;
  fd.debt_id=paymentSource.startsWith('debt:')?paymentSource.slice(5):null;
 }
 if(!editing.id){if(editing.type==='category')fd.sort_order=0;else fd.is_active=true;if(editing.type==='bill')fd.frequency='monthly'}
 const entityType=editing.type;let committed=false;const unlock=lockFinanceForm($('entityForm'),$('entityDialog'));button.disabled=true;
 try{
  const q=editing.id?supabase.from(table).update(fd).eq('id',editing.id).eq('user_id',user.id):supabase.from(table).insert(fd);
  const {error}=await q.select('id').single();if(error)throw error;
  committed=true;$('entityDialog').close();savedNotice('บันทึก'+({category:'หมวดหมู่',account:'บัญชี',bill:'บิล',budget:'งบประมาณ',debt:'บัตร/สินเชื่อ'}[entityType])+'แล้ว ✅',await loadAll(),{label:'ดูข้อมูล',run:()=>showPage({category:'categories',account:'accounts',bill:'bills',budget:'budget',debt:'debts'}[entityType])});
 }catch(error){if(committed)savedNotice('บันทึกข้อมูลสำเร็จแล้ว',false,{label:'ดูข้อมูล',run:()=>showPage(table==='budgets'?'budget':table)});else alert('บันทึกไม่ได้: '+error.message)}finally{unlock();button.disabled=false}
}

async function payRecurringBill(bill,button){
 if(!bill||!user)return;
 const amount=Number(bill.amount||0);
 if(amount<=0){showAppToast('ใส่ยอดบิลก่อน แล้วค่อยกดจ่ายแล้ว');return;}
 const debt=bill.debt_id?debts.find(d=>d.id===bill.debt_id):null;
 const via=debt?'ผ่านบัตร '+debt.name:(bill.accounts?.name?'จาก '+bill.accounts.name:'');
 if(!confirm('ยืนยันว่าจ่าย '+bill.name+' '+money(amount)+(via?' '+via:'')+' แล้ววันนี้?'))return;
 const source='bill_payment:'+bill.id,ym=bangkokDay().slice(0,7);
 const localPaid=transactions.some(x=>x.status!=='cancelled'&&x.source===source&&String(x.transaction_date).slice(0,7)===ym);
 if(localPaid){showAppToast('บิลนี้จ่ายแล้วในเดือนนี้ ✅');renderBills();return;}
 const originalText=button?.textContent||'✓ จ่ายแล้ว';if(button){button.disabled=true;button.textContent='กำลังบันทึก…';}
 try{
  const {error}=await supabase.rpc('pay_recurring_bill',{p_bill_id:bill.id,p_paid_date:bangkokDay()});
  if(error)throw error;
  showAppToast(debt?'บันทึกรายจ่ายและเพิ่มยอดบัตร '+debt.name+' แล้ว ✅':'บันทึก '+bill.name+' เป็นรายจ่ายแล้ว ✅');
  await loadAll();
 }catch(error){showAppToast('บันทึกการจ่ายบิลไม่ได้: '+error.message)}
 finally{if(button?.isConnected){button.disabled=false;button.textContent=originalText;}}
}

document.addEventListener('click',async e=>{const payBill=e.target.closest('[data-pay-bill]');if(payBill){const bill=bills.find(x=>x.id===payBill.dataset.payBill);if(bill)await payRecurringBill(bill,payBill);return;}const pay=e.target.closest('[data-pay-debt]');if(pay){const d=debts.find(x=>x.id===pay.dataset.payDebt);if(d){const cat=categories.find(c=>c.type==='expense'&&c.name==='หนี้/ผ่อน');$('txType').value='expense';fillTxSelectors();if(cat)$('txCategory').value=cat.id;$('txDesc').value='ชำระบัตร '+d.name;$('txAmount').value=Number(d.installment_amount||0)>0?Number(d.installment_amount):'';$('txNote').value='ยอดคงเหลือก่อนชำระ '+money(d.outstanding_amount||0);renderCardPaymentSuggestions();if(window.innerWidth>820)$('txAmount').focus()}return}const edit=e.target.closest('[data-edit]');if(edit){const t=edit.dataset.edit,id=edit.dataset.id;if(t==='tx'&&(transactions.find(x=>x.id===id)?.source==='car_installment'||transactions.find(x=>x.id===id)?.source==='car_expense'||carExpenseTxIds.has(id))){location.href='./car.html';return}if(t==='tx'&&transactions.find(x=>x.id===id)?.source==='salary'){location.href='./salary.html';return}if(t==='tx'&&transactions.find(x=>x.id===id)?.source?.startsWith('bill_payment:')){showPage('bills');showAppToast('รายการนี้มาจากบิลประจำ กรุณาจัดการที่หน้าบิลประจำ');return}if(t==='tx')openTx(id);else openEntity(t,id);return}const del=e.target.closest('[data-del]');if(del){if(del.dataset.del==='transactions'&&(transactions.find(x=>x.id===del.dataset.id)?.source==='car_installment'||transactions.find(x=>x.id===del.dataset.id)?.source==='car_expense'||carExpenseTxIds.has(del.dataset.id))){alert('กรุณาจัดการรายการนี้ผ่านหน้ารถของฉัน');return}if(del.dataset.del==='transactions'&&transactions.find(x=>x.id===del.dataset.id)?.source==='salary'){alert('กรุณาจัดการรายการนี้ผ่านหน้าเงินเดือน');return}if(del.dataset.del==='transactions'&&transactions.find(x=>x.id===del.dataset.id)?.source?.startsWith('bill_payment:')){alert('รายการนี้มาจากบิลประจำ เพื่อให้ยอดบัตรตรงกัน กรุณาจัดการผ่านหน้าบิลประจำ');return}if(!confirm('ยืนยันลบรายการนี้?'))return;const {error}=await supabase.from(del.dataset.del).delete().eq('id',del.dataset.id).eq('user_id',user.id);if(error)alert('ลบไม่ได้: '+error.message);else await loadAll()}})
function subscribe(){if(channel)supabase.removeChannel(channel);channel=supabase.channel('finance-live').on('postgres_changes',{event:'*',schema:'public',table:'transactions',filter:'user_id=eq.'+user.id},scheduleLoad).on('postgres_changes',{event:'*',schema:'public',table:'categories',filter:'user_id=eq.'+user.id},scheduleLoad).on('postgres_changes',{event:'*',schema:'public',table:'accounts',filter:'user_id=eq.'+user.id},scheduleLoad).on('postgres_changes',{event:'*',schema:'public',table:'bills',filter:'user_id=eq.'+user.id},scheduleLoad).on('postgres_changes',{event:'*',schema:'public',table:'debts',filter:'user_id=eq.'+user.id},scheduleLoad).on('postgres_changes',{event:'*',schema:'public',table:'budgets',filter:'user_id=eq.'+user.id},scheduleLoad).subscribe()}
window.txDialog=$('txDialog');window.entityDialog=$('entityDialog');
supabase.auth.onAuthStateChange((event,session)=>{
 if(event==='SIGNED_OUT'){
  clearSessionUI();location.reload();return;
 }
 if(session?.user&&user&&session.user.id!==user.id){clearSessionUI();location.reload();return;}
 if(event==='TOKEN_REFRESHED'&&session?.user)user=session.user;
 if(event==='USER_UPDATED'&&session?.user){user=session.user;if($('userEmail'))$('userEmail').textContent=session.user.email||'';}
});
try{
 const {data:{session},error}=await supabase.auth.getSession();
 if(error)throw error;
 if(session?.user)await boot(session.user);
 else{$('authSplash')?.classList.add('hidden');$('authScreen').classList.remove('hidden');}
}catch(error){
 console.warn('Session restore failed',error);
 $('authSplash')?.classList.add('hidden');$('authScreen').classList.remove('hidden');
 toast('ตรวจสอบการเข้าสู่ระบบไม่สำเร็จ กรุณาเข้าสู่ระบบอีกครั้ง','err');
}

async function registerFinanceWorker(){
 try{const reg=await navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'});void reg.update().catch(e=>console.warn(e))}catch(e){console.warn(e)}
}
if('serviceWorker' in navigator){
 if(document.readyState==='complete')void registerFinanceWorker();
 else window.addEventListener('load',registerFinanceWorker,{once:true});
}



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

