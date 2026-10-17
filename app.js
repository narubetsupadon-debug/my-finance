import {createCapacityMonitor} from './app-storage.js?v=20261017-quotes63';
import {serializeFinanceBackup,verifyFinanceBackup} from './finance-backup.js?v=20261017-quotes63';
import {financeSaveFeedback,showFinanceSaveError,createFinanceFetch,bangkokDay,bangkokDate,readAll,budgetSummary,monthlyDue,billDue,recurringBillMonthStatus,lockFinanceForm,createRetrySafeInsert,recordFinanceError} from './finance-core.js?v=20261017-quotes63';
import {fetchFinanceData,createRefreshCoordinator} from './app-data.js?v=20261017-quotes63';
import {createSummaryRenderer} from './app-summary.js?v=20261017-quotes63';
import {createDashboardRenderer} from './app-dashboard.js?v=20261017-quotes63';
import {createTransactionRenderer} from './app-transactions.js?v=20261017-quotes63';
import {createPlanningRenderer,debtLogoBrands,debtLogoOptions,bindDebtLogoPicker} from './app-planning.js?v=20261017-quotes63';
import {findDuplicateCandidates,runDataHealthCheck} from './app-safety.js?v=20261017-quotes63';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4'
const retrySafeInsert=createRetrySafeInsert();
const url='https://'+'mmvdhopogchcxwlstflk'+'.supabase.co'
const key='sb_'+'publishable_'+'PYkDjHN3ULlFW9BavMvAVQ_'+'d77eZZ5W'
// MINIMAL_DARK_CHART_DEFAULTS
if(typeof Chart!=='undefined'){
 Chart.defaults.color='#9aa6ba';
 Chart.defaults.borderColor='rgba(148,163,184,.12)';
 Chart.defaults.font.family='Inter, "Noto Sans Thai", system-ui, -apple-system, sans-serif';
}
const supabase=createClient(url,key,{global:{fetch:createFinanceFetch()}})
const $=id=>document.getElementById(id)
const currencyFormatter=new Intl.NumberFormat('th-TH',{style:'currency',currency:'THB',maximumFractionDigits:2});
const dateFormatter=new Intl.DateTimeFormat('th-TH',{day:'numeric',month:'short',year:'2-digit'}),dateLabels=new Map();
const money=n=>document.body?.classList.contains('privacy-mode')?'฿ ••••':currencyFormatter.format(Number(n||0));
const fmtDate=s=>{if(!s)return '';if(!dateLabels.has(s)){if(dateLabels.size>=400)dateLabels.clear();dateLabels.set(s,dateFormatter.format(new Date(s+'T00:00:00')));}return dateLabels.get(s);};
const formatAccountNumber=value=>{
 const n=String(value||'').replace(/\D/g,'');if(!n)return '';
 if(n.length===10)return n.slice(0,3)+'-'+n.slice(3,4)+'-'+n.slice(4,9)+'-'+n.slice(9);
 if(n.length===11)return n.slice(0,3)+'-'+n.slice(3,6)+'-'+n.slice(6);
 if(n.length===12)return n.slice(0,3)+'-'+n.slice(3,4)+'-'+n.slice(4,9)+'-'+n.slice(9);
 return n;
};
function accountLabel(a){return String(a?.name||'')+(a?.account_number?' · •••• '+String(a.account_number).replace(/\D/g,'').slice(-4):'')}
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
let mode='login',user=null,categories=[],accounts=[],transactions=[],bills=[],debts=[],budgets=[],channel=null,editing={type:null,id:null},carExpenseTxIds=new Set(),rentRecords=[],duplicateOverride=false,lastSyncAt=null,sessionRevision=0
let summaryPdfUrl=null;
function clearSummaryPdf(){if(summaryPdfUrl)URL.revokeObjectURL(summaryPdfUrl);summaryPdfUrl=null;$('summaryPdfStatus')?.replaceChildren();}

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
 if(uiSettings.privacy)clearSummaryPdf();
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
 transactionRenderer.dispose();
 clearSummaryPdf();
 sessionRevision++;user=null;refreshCoordinator.dispose();capacityMonitor.clear();
 if(channel){supabase.removeChannel(channel);channel=null}
 categories=[];accounts=[];transactions=[];bills=[];debts=[];budgets=[];carExpenseTxIds=new Set();rentRecords=[];lastSyncAt=null;
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

async function boot(u){if(user?.id!==u.id)sessionRevision++;user=u;$('authSplash')?.classList.add('hidden');$('authScreen').classList.add('hidden');$('app').classList.remove('hidden');$('userEmail').textContent=u.email||'';await loadAll();if(user?.id!==u.id)return;subscribe();handleNavigationRoute()}
async function performLoad(){
 if(!user)return false;
 const loadingUser=user.id,revision=sessionRevision;
 setSyncStatus('syncing');
 try{
  const data=await fetchFinanceData(supabase,loadingUser,readAll);
  if(user?.id!==loadingUser||sessionRevision!==revision)return false;
  if(editorOpen()){scheduleLoad();return false;}
  categories=data.categories;accounts=data.accounts;transactions=data.transactions;
  bills=data.bills;debts=data.debts;budgets=data.budgets;carExpenseTxIds=data.carExpenseTxIds;rentRecords=data.rentRecords;
  $('dataError').classList.add('hidden');setSyncStatus('ok');renderAll();return true;
 }catch(error){
  recordFinanceError('load',error);
  if(user?.id!==loadingUser||sessionRevision!==revision)return false;
  $('dataErrorText').textContent='โหลดข้อมูลล่าสุดไม่ได้ ข้อมูลที่เห็นอาจยังไม่ครบหรือไม่เป็นปัจจุบัน: '+error.message;
  $('dataError').classList.remove('hidden');setSyncStatus('error','ซิงก์ไม่สำเร็จ · '+error.message);return false;
 }
}
function editorOpen(){return !!($('txDialog')?.open||$('entityDialog')?.open)}
const refreshCoordinator=createRefreshCoordinator({
 refresh:performLoad,
 onError:error=>recordFinanceError('refresh',error),
 isBlocked:()=>editorOpen()||document.hidden,
 getDelay:()=>Math.max(180,360-(performance.now()-lastNavigationAt))
});
async function loadAll(){return refreshCoordinator.run()}
function scheduleLoad(){refreshCoordinator.schedule()}
function flushRealtimeAfterEdit(){refreshCoordinator.flush()}
$('txDialog')?.addEventListener('close',flushRealtimeAfterEdit);
$('entityDialog')?.addEventListener('close',flushRealtimeAfterEdit);
$('retryData').onclick=()=>loadAll();
function renderAll(){fillTxSelectors();renderDashboard();renderTransactions();renderCategories();renderAccounts();renderBills();renderDebts();renderBudget();renderSummary();renderSettings();applyUiSettings();void refreshPushStatus()}
function showAppToast(message,action=null,state=''){
 const el=$('appToast');if(!el)return;el.dataset.saveState=state;clearTimeout(window.__toastTimer);el.replaceChildren();
 const text=document.createElement('span');text.textContent=message;el.append(text);el.classList.remove('hidden');
 if(action){
  const view=document.createElement('button');view.type='button';view.className='toast-action';view.textContent=action.label;view.onclick=()=>{el.classList.add('hidden');action.run()};el.append(view);
  const close=document.createElement('button');close.type='button';close.className='toast-close';close.textContent='×';close.setAttribute('aria-label','ปิดข้อความ');close.onclick=()=>el.classList.add('hidden');el.append(close);
 }else window.__toastTimer=setTimeout(()=>el.classList.add('hidden'),4000);
}
function savedNotice(label,refreshed,action){
 showAppToast(label+(refreshed?' · โหลดข้อมูลล่าสุดแล้ว':' · โหลดข้อมูลล่าสุดไม่ได้ กรุณากดโหลดใหม่ ไม่ต้องบันทึกซ้ำ'),refreshed?action:{label:'โหลดใหม่',run:async()=>savedNotice(label,await loadAll(),action)},'success');
}
function viewSavedTransaction(row){
 $('txFilterType').value='all';$('txFilterCategory').value='';$('txFilterAccount').value='';$('txFilterStatus').value='all';$('txFilterMonth').value=row.transaction_date.slice(0,7);$('txSearch').value=row.description;
 renderTransactions();showPage('transactions');
}
function editSavedTransaction(id,row){
 const saved=transactions.find(x=>x.id===id&&x.user_id===user?.id);
 if(!saved){
  viewSavedTransaction(row);
  showAppToast('ยังโหลดรายการนี้ไม่ได้ กรุณาโหลดข้อมูลล่าสุดก่อนแก้ไข',{label:'โหลดใหม่',run:async()=>{if(await loadAll())editSavedTransaction(id,row)}});
  return;
 }
 if(['car_installment','car_expense'].includes(saved.source)||carExpenseTxIds.has(id)){location.href='./car.html';return;}
 if(saved.source==='salary'){location.href='./salary.html';return;}
 if(saved.source==='rent'){location.href='./rent.html';return;}
 if(saved.source?.startsWith('bill_payment:')){showPage('bills');return;}
 showPage('transactions');window.openTx(id);
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

// Original daily quotes; one unique quote per day over a 366-day cycle.
const dailyMessages = [
 "เริ่มเล็กได้ ขอแค่เริ่มในแบบที่ทำต่อไหว 🌱",
 "ความช้าไม่ใช่ความพ่ายแพ้ ถ้าเรายังเดินอยู่ 🚶",
 "วันนี้ทำได้เท่านี้ ก็มีค่าของวันนี้ 🫶",
 "เป้าหมายใหญ่ เริ่มจากเรื่องเล็กที่ทำจริง 🌻",
 "พักให้พอ แล้วค่อยพาตัวเองไปต่อ 🌿",
 "ชีวิตไม่ต้องชนะทุกวัน ถึงจะเป็นชีวิตที่ดี 🫶",
 "สิ่งที่พอดีกับเรา ไม่จำเป็นต้องเหมือนใคร ✨",
 "อย่าใช้วันที่ยาก ตัดสินทั้งชีวิต 🌈",
 "การเริ่มใหม่ไม่ได้ลบความพยายามที่ผ่านมา 🌱",
 "ก้าวสั้นที่เดินจริง ดีกว่าแผนไกลที่ไม่เคยเริ่ม 🌻",
 "ใจที่เหนื่อย ต้องการพื้นที่มากกว่าคำเร่ง 🌿",
 "วันธรรมดาก็มีเรื่องดีให้เก็บไว้ 🫶",
 "อย่ารอให้มั่นใจทั้งหมด จึงยอมลองสักครั้ง 💙",
 "ความผิดพลาดบอกทางแก้ ไม่ได้บอกราคาของเรา 👛",
 "บางเรื่องต้องใช้เวลา ไม่ได้แปลว่าเราไม่เก่ง ⏳",
 "ความสำเร็จของคนอื่น ไม่ใช่เส้นตายของเรา ✨",
 "วันนี้ยังไม่ถึง ไม่ได้แปลว่าจะไปไม่ถึง 🌈",
 "ดูแลตัวเอง เป็นส่วนหนึ่งของการไปให้ไกล 🫶",
 "ไม่ต้องทำทุกอย่าง แค่เลือกสิ่งสำคัญให้เจอ ✨",
 "ความสม่ำเสมอ ไม่จำเป็นต้องหน้าตาเหมือนกันทุกวัน 🌈",
 "เงินเก็บเริ่มจากยอดเล็กที่เราไม่มองข้าม 💰",
 "รู้ว่าเงินไปไหน คือจุดเริ่มของการเลือกได้ 🪙",
 "งบประมาณที่ดี ต้องมีพื้นที่ให้ชีวิตจริง 👛",
 "ความคุ้มค่า วัดจากการใช้ ไม่ใช่แค่ส่วนลด 💰",
 "ของถูกที่ไม่จำเป็น ก็ยังใช้เงินของเรา 🪙",
 "ก่อนซื้อให้ถามว่าอยากใช้ หรือแค่อยากได้ 👛",
 "เงินทุกบาทไม่ต้องเก็บ แต่ควรมีเหตุผลที่จ่าย 💰",
 "การดูแลเงิน คือการเพิ่มทางเลือกให้วันข้างหน้า 🪙",
 "ซื้อความสะดวกได้ ถ้ามันพอดีกับกำลังเรา 👛",
 "อย่าให้ความรีบ ตัดสินเรื่องเงินแทนเรา 💰",
 "ส่วนลดไม่ใช่กำไร หากเดิมเราไม่ได้ต้องการ 🪙",
 "เงินสำรองอาจไม่หวือหวา แต่ช่วยให้ใจเบาลง 👛",
 "จดรายจ่ายเพื่อเข้าใจตัวเอง ไม่ใช่คอยลงโทษ 💰",
 "ความสุขวันนี้ กับความมั่นคงพรุ่งนี้ อยู่ร่วมกันได้ 🌷",
 "แผนการเงินควรปรับตามชีวิต ไม่ใช่ฝืนจนหมดแรง 👛",
 "ยอดน้อยที่เริ่มเก็บ มีความหมายกว่ายอดใหญ่ในความคิด 💰",
 "รู้ข้อจำกัดของกระเป๋า ช่วยให้เลือกได้ชัดขึ้น ✨",
 "อย่าใช้ยอดเงิน เป็นเครื่องวัดคุณค่าของตัวเอง 👛",
 "เก็บเงินเผื่อโอกาส ไม่ใช่แค่เผื่อปัญหา 💰",
 "การจ่ายอย่างตั้งใจ ช่วยให้เสียดายน้อยลง 🪙",
 "ใจดีกับตัวเอง โดยไม่ต้องรอให้ทำอะไรสำเร็จ 💙",
 "เหนื่อยได้ โดยไม่ต้องพิสูจน์ว่าเหนื่อยพอหรือยัง 🍃",
 "คำว่าไม่ไหว เป็นข้อมูลที่ควรรับฟัง ✨",
 "เราไม่จำเป็นต้องเข้มแข็งต่อหน้าทุกเรื่อง 🌈",
 "การพักไม่ได้ทำให้ความตั้งใจหายไป 🌿",
 "อย่าลืมขอบคุณตัวเองที่ผ่านเมื่อวานมา 🌷",
 "ความสงบเล็ก ๆ มีค่ากว่าความวุ่นวายที่ดูยิ่งใหญ่ 👛",
 "วันไหนใจหนัก ลองลดสิ่งที่ต้องแบก 🤍",
 "ขอความช่วยเหลือได้ โดยไม่ต้องรู้สึกผิด 💙",
 "ไม่ต้องอธิบายความเหนื่อย ให้ทุกคนเข้าใจ 🍃",
 "บางวันแค่ดูแลมื้ออาหาร ก็ถือว่าดูแลชีวิตแล้ว 🍜",
 "อย่าพูดกับตัวเองแรงกว่าที่พูดกับคนที่รัก 🤍",
 "ความรู้สึกไม่ใช่คำสั่ง แต่สมควรได้รับการรับฟัง 💙",
 "การยอมรับตัวเอง ไม่ได้แปลว่าหยุดพัฒนา 🌻",
 "เราเปลี่ยนวิธีเดินได้ โดยไม่ต้องทิ้งจุดหมาย 🧭",
 "อย่าขอโทษที่ต้องการเวลาสำหรับตัวเอง 🕰️",
 "ความเงียบที่สบายใจ ก็เป็นความสุขแบบหนึ่ง 💙",
 "บางคำตอบจะชัดขึ้น หลังจากได้นอนเต็มอิ่ม 😴",
 "ชีวิตมีจังหวะหายใจ ไม่ได้มีแต่จังหวะเร่ง 🌿",
 "การรักษาใจ เป็นงานสำคัญที่มองไม่เห็น 🤍",
 "งานที่ดี ไม่ควรกินพื้นที่ทั้งชีวิต ✨",
 "ทำทีละเรื่อง ช่วยให้เห็นสิ่งที่ทำเสร็จ 🌈",
 "การถามให้ชัด ประหยัดแรงแก้ทีหลัง 🫶",
 "ไม่รู้วันนี้ ยังเรียนรู้ให้รู้พรุ่งนี้ได้ 🌻",
 "ความละเอียดมีค่า เมื่อรู้ว่าอะไรสำคัญ 🌈",
 "งานด่วนของคนอื่น ไม่ใช่เหตุให้เราลืมหายใจ 🍃",
 "ความเป็นมืออาชีพ รวมถึงการบอกข้อจำกัด ✨",
 "การวางแผนที่ดี เริ่มจากความจริงที่มี 🌻",
 "อย่าให้รายการงานยาว กลบสิ่งที่ทำสำเร็จแล้ว 🫶",
 "ผลงานหนึ่งชิ้น ไม่ใช่คำตัดสินตัวตนทั้งหมด ✨",
 "ความผิดพลาดที่เจอเร็ว คือโอกาสแก้ที่ยังทัน 🚶",
 "ทำให้เข้าใจก่อน แล้วค่อยทำให้เร็ว 🤍",
 "ทุกทักษะเคยมีวันแรกที่ทำไม่คล่อง 🌱",
 "คนเก่งก็ต้องมีเวลาคิด ไม่ใช่ตอบได้ทันทีทุกเรื่อง 🕰️",
 "ความชัดเจน ช่วยลดทั้งงานซ้ำและความกังวล 🫶",
 "อย่าตั้งมาตรฐานจากวันที่เรามีพลังมากที่สุดเพียงวันเดียว ✨",
 "ความรับผิดชอบ ไม่จำเป็นต้องแปลว่ารับทุกอย่าง 🌈",
 "เก็บแรงไว้ให้งานสำคัญ ไม่ใช่แค่งานที่เสียงดัง 🫶",
 "การทำเสร็จอย่างเหมาะสม มีค่ากว่าการแก้ไม่จบ ✨",
 "ความก้าวหน้าบางครั้ง คือการทำงานเดิมได้เบาใจขึ้น 🚶",
 "เวลาเป็นของมีค่า แม้ไม่มีป้ายราคา 💰",
 "ไม่ต้องใส่ทุกอย่างลงในวันนี้ ✨",
 "สิ่งสำคัญมักต้องการพื้นที่ ไม่ใช่แค่เวลาที่เหลือ ⏳",
 "เลือกพักวันนี้ อาจช่วยให้พรุ่งนี้ไปได้ไกลกว่า 🍃",
 "วันที่ไม่เป็นไปตามแผน ก็ยังมีสิ่งให้เรียนรู้ 🌱",
 "อย่ารีบผ่านช่วงดี ๆ เพียงเพื่อไปถึงอย่างต่อไป 🌈",
 "ความทรงจำดี ไม่จำเป็นต้องเป็นวันพิเศษ 🫶",
 "เวลาที่ใช้กับคนสบายใจ ไม่ใช่เวลาที่เสียไป 🕰️",
 "ช้าลงนิดหนึ่ง อาจทำให้เห็นทางที่เหมาะกว่า 🚶",
 "อย่าผัดการดูแลตัวเอง ไปไว้หลังงานชิ้นสุดท้าย 🫶",
 "ปฏิทินมีช่องว่างได้ ชีวิตก็เช่นกัน ⏳",
 "ความคืบหน้าไม่จำเป็นต้องเกิดทุกชั่วโมง 🕰️",
 "อย่าให้อนาคตที่ยังมาไม่ถึง ยึดวันนี้ไปทั้งหมด 🫶",
 "เวลาพักที่ตั้งใจ มีค่าพอ ๆ กับเวลาทำงาน 🍃",
 "บางเรื่องคุ้มกับการรอ บางเรื่องคุ้มกับการเริ่ม 🌱",
 "อย่าใช้ทั้งวัน เตรียมพร้อมจนไม่ได้ลงมือ 🫶",
 "เราจัดลำดับใหม่ได้ เมื่อชีวิตเปลี่ยนไป ✨",
 "หนึ่งวันที่ผ่านไป ไม่ได้สูญเปล่าเพราะไม่มีผลงานให้โชว์ 🌈",
 "ช่วงเวลาสั้น ๆ ที่มีคุณภาพ ก็เติมใจได้ ⏳",
 "สิ่งที่ทำซ้ำทุกวัน ค่อย ๆ สร้างชีวิตที่เราอยู่ ✨",
 "การเติบโต อาจเริ่มจากการเลิกฝืน 🌱",
 "เปรียบเทียบกับตัวเองเมื่อก่อน ให้บ่อยกว่ากับคนอื่น 🫶",
 "ไม่ต้องเก่งทุกด้าน เพื่อมีสิ่งที่ทำได้ดี ✨",
 "ลองเปลี่ยนคำว่าทำไม่ได้ เป็นยังทำไม่คล่อง 🌈",
 "ความกล้าบางวัน คือการยอมเริ่มใหม่เงียบ ๆ 🌱",
 "สิ่งที่เคยยาก อาจกลายเป็นทักษะในวันหนึ่ง 🌻",
 "เรียนรู้ได้ โดยไม่ต้องรีบเป็นผู้เชี่ยวชาญ 🌱",
 "ความสงสัย เป็นประตูของความเข้าใจ 🤍",
 "การยอมรับว่าไม่รู้ ช่วยให้รู้ได้มากขึ้น ✨",
 "ความก้าวหน้าที่ไม่มีคนเห็น ก็ยังเกิดขึ้นจริง 🚶",
 "อย่าใช้จุดเริ่มต้นของเรา เทียบกับช่วงที่คนอื่นชำนาญแล้ว 🌱",
 "ความสำเร็จที่รักษาตัวเองไว้ได้ ก็น่าภูมิใจ 🤍",
 "การเปลี่ยนใจหลังรู้มากขึ้น ไม่ใช่ความอ่อนแอ 💙",
 "ความพยายามควรมีทิศทาง ไม่ใช่มีแต่ความหนัก 🎯",
 "สิ่งที่ฝึกวันนี้ อาจช่วยเราในวันที่ยังนึกไม่ถึง 🌱",
 "การเข้าใจตัวเองมากขึ้น เป็นผลลัพธ์อย่างหนึ่ง 🤍",
 "อย่ามองข้ามเรื่องที่วันนี้ทำได้ แต่เมื่อก่อนไม่เคยกล้า 🫶",
 "เราเริ่มต้นใหม่ได้ มากกว่าหนึ่งครั้งในชีวิต 🌻",
 "การยอมลดเป้าบางช่วง อาจช่วยรักษาการเดินทางทั้งหมด 🚶",
 "เติบโตในจังหวะที่ยังมีแรงใช้ชีวิตด้วย 🌻",
 "คนที่รักเรา ไม่ควรทำให้ต้องเล็กลงเสมอ 💙",
 "ความสัมพันธ์ที่ดี มีพื้นที่ให้คำว่าไม่ 🌈",
 "การฟังจนจบ คือความใส่ใจที่ไม่ต้องซื้อ 💰",
 "อยู่ใกล้คนที่ทำให้เราเป็นตัวเองได้ง่ายขึ้น ✨",
 "เราให้ความสำคัญกับคนอื่น โดยไม่ทิ้งตัวเองได้ 🌈",
 "ความเข้าใจเริ่มจากการถาม ไม่ใช่การเดา 🌻",
 "ขอบเขตที่ชัด ช่วยรักษาความสัมพันธ์ 💙",
 "อย่าแบกความรู้สึกของทุกคน จนลืมของตัวเอง 🤍",
 "บางระยะห่าง ช่วยให้มองเห็นความต้องการของเรา 🫶",
 "ความรักที่ดี ควรมีความเคารพอยู่ด้วย 🤍",
 "การเป็นเพื่อนกับตัวเอง ช่วยให้วันที่เงียบไม่ว่างเปล่า 🌈",
 "คำพูดอ่อนโยน อาจช่วยให้ใครผ่านวันยากได้ 🤍",
 "ไม่ต้องเห็นตรงกันทุกเรื่อง เพื่อคุยกันด้วยความเคารพ ✨",
 "เราเลือกได้ว่าจะให้เรื่องของใคร อยู่ในใจนานแค่ไหน 🤍",
 "ความสัมพันธ์ไม่ควรเป็นการสอบที่ต้องเดาคำตอบ 🫶",
 "การขอบคุณเรื่องเล็ก ทำให้ความใส่ใจไม่เงียบหาย 🤍",
 "ไม่ต้องพร้อมทุกอย่าง เพื่อสมควรได้รับความเมตตา 💙",
 "การรักษาสัญญากับตัวเอง ก็เป็นความไว้ใจแบบหนึ่ง 🤍",
 "พื้นที่ปลอดภัย เริ่มจากการไม่ต้องระวังตัวตลอดเวลา 🌱",
 "บางวันสิ่งที่ต้องการ คือคนฟังมากกว่าคนแก้ 🌈",
 "อาหารอร่อยหนึ่งมื้อ เป็นความสุขที่ไม่ต้องยิ่งใหญ่ 🍜",
 "มองหาสิ่งดีเล็ก ๆ โดยไม่ปฏิเสธสิ่งยากที่มี ✨",
 "ความสุขไม่จำเป็นต้องซื้อใหม่ทุกครั้ง 👛",
 "ของที่มีอยู่ อาจมีคุณค่ามากกว่าที่เราเคยมอง 🫶",
 "แสงเช้ากับเวลาสงบ อาจเป็นการเริ่มวันที่พอดี 🪙",
 "เราอนุญาตให้ตัวเองมีความสุขระหว่างทางได้ 🚶",
 "ไม่ต้องรอให้ทุกปัญหาจบ จึงยอมยิ้ม 😊",
 "ความเรียบง่าย ช่วยให้ได้ยินความต้องการตัวเองชัดขึ้น ✨",
 "สิ่งเล็กที่ทำแล้วสบายใจ สมควรมีที่ในชีวิต 💙",
 "ความสุขของเรา ไม่ต้องผ่านการอนุมัติจากคนอื่น 🌷",
 "บางวันความสำเร็จ คือได้กลับบ้านอย่างไม่หมดแรง ✨",
 "ความพอใจ ไม่ได้หมายถึงการเลิกมีความฝัน 🤍",
 "ดูแลสิ่งที่มี อาจเติมความสุขได้เท่าการได้สิ่งใหม่ 😊",
 "มื้อธรรมดาที่ได้กินช้า ๆ ก็พิเศษได้ 🍽️",
 "อย่ามองผ่านวันนี้ เพราะมัวรอวันที่ดีกว่า 🌈",
 "ของขวัญให้ตัวเอง อาจเป็นเวลาที่ไม่ต้องรีบ 🕰️",
 "ความสบายใจ เป็นผลตอบแทนที่ตัวเลขไม่ครอบคลุม 💙",
 "ใช้ชีวิตที่ชอบ เริ่มจากรู้ว่าเราชอบอะไรจริง ๆ 🌻",
 "ความงดงามบางอย่าง เห็นได้เมื่อวางโทรศัพท์ลง 🫶",
 "เรื่องดีเล็กน้อย ไม่ได้เล็กสำหรับใจที่กำลังเหนื่อย 🍃",
 "ไม่จำเป็นต้องตอบตกลง เพื่อเป็นคนน่ารัก 💙",
 "การปฏิเสธอย่างสุภาพ ช่วยรักษาแรงสำหรับเรื่องสำคัญ 🤍",
 "สิ่งที่ควบคุมไม่ได้ ไม่จำเป็นต้องรับผิดชอบทั้งหมด ✨",
 "ให้ความเห็นได้ โดยไม่ต้องถือผลลัพธ์ไว้คนเดียว 🌈",
 "สิทธิ์ในการพัก ไม่ต้องแลกด้วยการทำจนล้ม 🌿",
 "เราไม่ต้องว่างให้ทุกคนตลอดเวลา 🕰️",
 "คำว่าเดี๋ยวก่อน ช่วยให้เลือกได้ตั้งใจขึ้น 💙",
 "อย่าให้อีกคนเป็นคนเดียว ที่กำหนดคุณค่าของเรา 🫶",
 "การรักษาพื้นที่ตัวเอง ไม่ใช่ความเห็นแก่ตัวเสมอไป 💙",
 "ไม่ใช่ทุกความคาดหวัง ที่เราจำเป็นต้องทำให้ครบ 🌈",
 "บางเรื่องปล่อยได้ โดยไม่ต้องหาผู้แพ้ 🫶",
 "หยุดอธิบายได้ เมื่อพูดไปแล้วอย่างชัดเจน ✨",
 "การเลือกตัวเองบ้าง ช่วยให้ยังมีแรงดูแลคนอื่น 👛",
 "อย่าตกลงตอนเหนื่อย เพียงเพราะอยากให้บทสนทนาจบ 🍃",
 "ความใจดีที่มีขอบเขต อยู่ได้นานกว่า 💙",
 "เราไม่ต้องแบกงานเพิ่ม เพื่อพิสูจน์ว่าเก่ง 🌈",
 "ความต้องการของเรา สมควรอยู่ในบทสนทนาด้วย 🫶",
 "ไม่ตอบทันทีได้ ถ้ายังต้องการเวลาคิด 🕰️",
 "การถอยจากบางเรื่อง อาจเป็นการเดินเข้าหาตัวเอง 🚶",
 "ความเคารพตัวเอง เริ่มจากรับฟังสิ่งที่เราไม่สบายใจ 🌻",
 "ความกล้าไม่จำเป็นต้องเสียงดัง ✨",
 "เริ่มทั้งที่กลัวได้ โดยเตรียมพื้นที่ให้ตัวเองปลอดภัย 🌻",
 "ลองหนึ่งครั้ง อาจได้ข้อมูลมากกว่าคิดร้อยรอบ 🫶",
 "ความลังเลไม่ใช่ศัตรู บางครั้งแค่บอกให้เตรียมเพิ่ม ✨",
 "เราไม่ต้องรู้ทุกขั้น ก่อนเริ่มก้าวแรก 🌱",
 "ถามสิ่งที่สงสัย ดีกว่าแบกความไม่เข้าใจกลับบ้าน 🤍",
 "การยอมลอง เป็นความคืบหน้าก่อนเห็นผล ✨",
 "สิ่งใหม่อาจไม่ง่าย แต่เราเรียนรู้ระหว่างทำได้ 🌻",
 "ไม่ต้องหายกลัวทั้งหมด เพื่อทำเรื่องสำคัญ 🫶",
 "วันที่กล้าบอกความต้องการ คือวันที่ดูแลตัวเอง ✨",
 "การเริ่มช้า ยังทำให้มีจุดเริ่มต้น 🌱",
 "บางโอกาสเกิดขึ้น เพราะเรายอมส่งคำถามออกไป 🎯",
 "อย่ารอคำชม ถึงจะยอมรับความพยายามตัวเอง ✨",
 "กล้าเปลี่ยนเส้นทาง เมื่อทางเดิมไม่เหมาะแล้ว 🚶",
 "แผนแรกไม่สำเร็จ ยังมีสิทธิ์ทำแผนต่อไป 🫶",
 "คำตอบที่ไม่ใช่ ช่วยให้รู้ว่าอะไรต้องเปลี่ยน ✨",
 "ความกล้าที่ดี ไม่จำเป็นต้องละเลยความระมัดระวัง 🌈",
 "เราเลือกเสี่ยงทีละนิด เพื่อเรียนรู้ทีละอย่างได้ 🌻",
 "การออกจากสิ่งคุ้นเคย เริ่มจากก้าวที่รับไหว 🌱",
 "ให้โอกาสตัวเอง โดยไม่ต้องรับประกันผลลัพธ์ 🚶",
 "ยอดที่บันทึกตรง ช่วยให้ตัดสินใจได้ตรงขึ้น 💰",
 "อย่าดูแค่ราคาที่จ่าย ให้ดูภาระที่ตามมาด้วย 🪙",
 "ก่อนผ่อนของ ลองเผื่อพื้นที่ให้เดือนที่ไม่เป็นใจ 👛",
 "วงเงินที่มี ไม่ใช่เงินที่จำเป็นต้องใช้ 💰",
 "การเหลือเงินไว้ เป็นการเลือกอย่างหนึ่ง 🪙",
 "แยกความอยากออกจากความจำเป็น ด้วยเวลาคิดสักนิด 🕰️",
 "ใช้ของให้คุ้ม ดีกว่าซื้อให้ครบ 💰",
 "การเงินที่ดี ไม่จำเป็นต้องหน้าตาหรูหรา 🪙",
 "กำลังจ่ายของเรา สำคัญกว่าความเห็นของคนขาย 👛",
 "เงินที่ไม่ได้ใช้ อาจเป็นโอกาสที่ยังเปิดอยู่ 💰",
 "การซื้อเพื่อใช้งาน ต่างจากซื้อเพื่อไล่ตามใคร 🪙",
 "บัญชีที่ชัด ช่วยให้ใจไม่ต้องคอยเดา 👛",
 "ประหยัดในสิ่งที่ไม่สำคัญ เพื่อมีพื้นที่ให้สิ่งที่สำคัญ 🫶",
 "ราคาถูกลง ไม่ได้ทำให้ของที่ไม่ใช้มีประโยชน์ขึ้น 🪙",
 "รางวัลให้ตัวเอง ควรทำให้ยิ้มได้ทั้งวันนี้และวันจ่าย 👛",
 "จ่ายให้ความจำเป็น โดยไม่ต้องรู้สึกผิด 💰",
 "เงินก้อนเล็กก็วางแผนได้ ในแบบที่เหมาะกับมัน 🪙",
 "อย่าให้ภาพชีวิตคนอื่น กำหนดรายจ่ายของเรา 👛",
 "ความมั่นคงสร้างจากหลายก้าว ไม่ใช่การตัดสินใจครั้งเดียว 🎯",
 "แผนที่ทำต่อได้ มีค่ากว่าแผนที่สวยแต่ใช้จริงไม่ได้ ✨",
 "วันที่ดีอาจเริ่มจากการไม่เร่งตัวเองเกินไป 🌱",
 "ตื่นมาได้อีกวัน ก็มีโอกาสเลือกใหม่ 🎯",
 "เริ่มเช้าด้วยสิ่งจำเป็น ไม่ใช่สิ่งที่ทำให้กังวลที่สุด 🌱",
 "ให้ใจได้ตั้งหลัก ก่อนรับเสียงของทั้งโลก 🤍",
 "เช้าวันใหม่ ไม่จำเป็นต้องมีเราในเวอร์ชันสมบูรณ์แบบ ☀️",
 "ตั้งเป้าให้วันนี้พอดีกับแรงที่มี ✨",
 "ความตั้งใจเล็ก ๆ ช่วยให้วันธรรมดามีทิศทาง 🚶",
 "อย่าเริ่มวันด้วยการดุตัวเอง เรื่องเมื่อวานแก้ได้ทีละส่วน 🌻",
 "ทำเรื่องที่สำคัญสักอย่าง ก่อนเพิ่มเรื่องใหม่ ✨",
 "วันใหม่ไม่ได้ต้องการคำสัญญาใหญ่ แค่การดูแลที่ทำจริง 🌤️",
 "เรื่องที่ยังค้าง ไม่ได้ลบเรื่องที่ทำเสร็จ 🫶",
 "ปิดวันได้ แม้งานทั้งโลกยังไม่จบ 😴",
 "ให้ร่างกายได้พัก ก่อนใจจะต้องขอแรงกว่าเดิม 🌿",
 "คืนนี้วางสิ่งที่ยังแก้ไม่ได้ ลงชั่วคราวได้ 😴",
 "ทบทวนวันนี้ด้วยความยุติธรรมต่อตัวเอง ✨",
 "มีบางเรื่องที่วันนี้ทำดีที่สุดแล้ว แม้ผลยังไม่ดี 🌈",
 "อย่านับแต่สิ่งที่พลาด จนนึกไม่ออกว่าได้ทำอะไรบ้าง 🫶",
 "จบวันด้วยการรับรู้ ไม่จำเป็นต้องตัดสิน 😴",
 "พรุ่งนี้มีพื้นที่ให้ลองใหม่ วันนี้มีสิทธิ์พัก 🌿",
 "การนอนพอ เป็นการเตรียมตัวที่ไม่ควรมองข้าม 😴",
 "สิ่งที่เกิดขึ้นแล้ว อาจเปลี่ยนไม่ได้ แต่วิธีดูแลต่อยังเลือกได้ ✨",
 "ความแน่นอนไม่ใช่เงื่อนไขของทุกการเริ่มต้น 😴",
 "ยืดหยุ่นกับวิธี โดยยังซื่อสัตย์กับสิ่งที่สำคัญ 🫶",
 "ชีวิตเปลี่ยนได้ แผนก็เปลี่ยนตามได้ ✨",
 "ไม่ต้องเก็บทุกบทเรียนไว้ในรูปของความเจ็บ 🌈",
 "สิ่งที่จบลง ไม่ได้ทำให้ทุกสิ่งที่ผ่านมาไร้ค่า 🫶",
 "บางการเปลี่ยนแปลง ให้คำตอบทีหลัง ✨",
 "อยู่กับสิ่งที่รู้จริง ก่อนกลัวสิ่งที่ยังเดาอยู่ 🌈",
 "วันนี้มีข้อมูลเท่านี้ ก็เลือกอย่างรอบคอบเท่านี้ได้ 🫶",
 "การปรับตัว ไม่ใช่การยอมแพ้ต่อชีวิต ✨",
 "ไม่ต้องรู้สึกดีทันที เพื่อเริ่มดูแลตัวเอง 🌱",
 "ความเสียใจมีจังหวะของมัน ไม่ต้องเร่งให้หาย 🤍",
 "การยอมรับความจริง ช่วยให้ใช้แรงกับสิ่งที่ยังเปลี่ยนได้ ✨",
 "เราไม่จำเป็นต้องเข้าใจทุกเรื่องในวันเดียว 🤍",
 "บางคำถามอยู่กับเราได้ ระหว่างที่คำตอบยังไม่มา 🫶",
 "เมื่อทางเปลี่ยน ทักษะที่มีอาจยังพาเราไปต่อได้ 🌻",
 "อย่าทำให้ความไม่แน่นอน กลายเป็นความผิดของตัวเอง 🌙",
 "ค่อย ๆ สร้างที่ยืนใหม่ จากสิ่งที่ยังมี 🫶",
 "ความหวังไม่จำเป็นต้องดัง แค่ยังมีที่อยู่ก็พอ ✨",
 "ผ่านวันนี้ด้วยความเมตตา ก็เป็นวิธีเดินต่อ 🚶",
 "ตัวเลขช่วยอธิบายบางเรื่อง แต่ไม่ได้อธิบายทั้งชีวิต 🫶",
 "อย่าให้ยอดหนึ่งวัน กลายเป็นคำตัดสินทั้งเดือน 🪙",
 "บันทึกตามจริง มีประโยชน์กว่าบันทึกให้ดูดี 🌈",
 "เห็นปัญหาชัด อาจไม่สบายใจ แต่ช่วยให้เริ่มแก้ได้ 🌻",
 "รู้สถานะวันนี้ เพื่อเลือกก้าวต่อไปได้เหมาะขึ้น 🧭",
 "ความผิดปกติเล็ก ๆ ที่เห็นเร็ว ช่วยลดงานแก้ก้อนใหญ่ 🌈",
 "ข้อมูลที่ไม่ครบ ควรถามเพิ่มก่อนรีบสรุป 🫶",
 "ความแม่นยำ เริ่มจากยอมตรวจสิ่งที่คิดว่ารู้อยู่แล้ว 🌻",
 "การเช็กซ้ำเรื่องสำคัญ ไม่ได้แปลว่าไม่มั่นใจ 💙",
 "อย่าบวกภาระในใจ ซ้ำกับภาระที่มีจริง 🤍",
 "สิ่งที่วัดไม่ได้ ก็อาจสำคัญกับชีวิตมาก ✨",
 "ตัวเลขอาจตรงแล้ว แต่ยังต้องดูบริบทด้วย 🌈",
 "ความชัดเจนวันนี้ ช่วยลดการนึกย้อนหลังพรุ่งนี้ 🫶",
 "แยกสิ่งที่รู้ ออกจากสิ่งที่คาด แล้วตัดสินใจจะเบาขึ้น 🤍",
 "คำตอบที่ดี เริ่มจากคำถามที่ตรงเรื่อง 🌱",
 "เก็บรายละเอียดเท่าที่ช่วยให้เลือกได้ดีขึ้น 🫶",
 "ไม่ต้องมีข้อมูลทุกอย่าง เพื่อเริ่มจัดการเรื่องเล็กหนึ่งเรื่อง 🌱",
 "ความเป็นระเบียบ มีไว้ช่วยชีวิต ไม่ใช่เพิ่มงานให้ชีวิต 🌈",
 "สรุปให้เข้าใจ สำคัญกว่าสะสมข้อมูลให้มาก 💙",
 "เมื่อรู้ต้นเหตุ เราจะใช้แรงแก้ได้ตรงจุด ✨",
 "คุณค่าในตัวเรา ไม่ได้ขึ้นลงตามความขยันแต่ละวัน 🌈",
 "การได้เป็นตัวเองอย่างสบายใจ เป็นสิ่งที่ควรรักษา 🤍",
 "ไม่ต้องมีคำตอบให้ทุกคน เพื่อเป็นผู้ใหญ่ที่ดี ✨",
 "ยอมรับความธรรมดาของตัวเอง แล้วชีวิตอาจเบาขึ้น 🌈",
 "ความพอดี ไม่ได้หมายถึงความน้อยเสมอไป 🫶",
 "คนที่เราอยากเป็น ควรมีพื้นที่ให้เราได้หายใจ 🍃",
 "ความเรียบร้อยภายนอก ไม่ควรแลกด้วยความวุ่นวายในใจ 💙",
 "เราไม่ต้องดูประสบความสำเร็จ เพื่อมีชีวิตที่มีความหมาย 🫶",
 "การเคารพตัวเอง ไม่จำเป็นต้องลดคุณค่าคนอื่น ✨",
 "ความไม่สมบูรณ์แบบ ไม่ได้ทำให้ความตั้งใจน้อยลง 🤍",
 "เรื่องที่เราทำได้ง่าย อาจเป็นสิ่งที่เคยฝึกมานาน 🌱",
 "อย่าเอาความคุ้นเคย ไปหักคุณค่าของความสามารถตัวเอง ✨",
 "การเห็นข้อดีของตัวเอง ไม่ใช่การอวดเสมอไป 🌈",
 "สิ่งที่เลือกเงียบ ๆ ก็บอกได้ว่าเราให้คุณค่าอะไร 🫶",
 "บางครั้งการดูแลศักดิ์ศรี คือการไม่อยู่ในบทสนทนาที่ทำร้าย ✨",
 "เรามีสิทธิ์ชอบชีวิตแบบที่ไม่เหมือนกระแส 🌈",
 "อย่าให้คำพูดครั้งเดียว กลบสิ่งที่เรารู้จักตัวเองมานาน 🫶",
 "ขอบคุณความอดทนของตัวเอง โดยไม่บังคับให้ทนต่อทุกเรื่อง 🌷",
 "มีชีวิตที่เป็นของเรา สำคัญกว่ามีชีวิตที่ใครมองว่าสมบูรณ์ 🌈",
 "ความภูมิใจเล็ก ๆ ไม่ต้องรอให้ใครมารับรอง 🤍",
 "สุขภาพเป็นส่วนหนึ่งของแผนชีวิต ไม่ใช่สิ่งที่ค่อยดูทีหลัง 🌿",
 "ดื่มน้ำสักแก้ว อาจเป็นการดูแลที่เริ่มได้ทันที 🍃",
 "ร่างกายไม่จำเป็นต้องรอวันหยุด ถึงจะสมควรได้พัก 🌿",
 "ขยับตัวนิดหนึ่ง ช่วยเตือนว่าเรายังอยู่กับปัจจุบัน ✨",
 "อย่าข้ามมื้ออาหาร เพื่อรีบทำทุกอย่างให้ทัน 🍜",
 "ความแข็งแรงไม่ได้วัดจากการฝืนได้นานแค่ไหน 🫶",
 "ฟังสัญญาณร่างกาย ก่อนกลายเป็นเสียงที่ดังขึ้น 🌿",
 "การพักสายตา ไม่ได้ทำให้งานหมดความสำคัญ 🍃",
 "วันนี้ดูแลพื้นฐานให้พอ แล้วค่อยเพิ่มเป้าหมาย 🎯",
 "เราไม่จำเป็นต้องเหนื่อยที่สุด เพื่อสมควรนอนเต็มอิ่ม 😴",
 "การดูแลตัวเองไม่ใช่รางวัล แต่เป็นสิ่งจำเป็น 🌈",
 "ค่อย ๆ สร้างนิสัยที่เข้ากับชีวิตจริง 🫶",
 "สิ่งที่ทำได้ต่อเนื่อง มักเริ่มจากขนาดที่ไม่หนักเกินไป 🌱",
 "ความมีวินัย รวมถึงการรู้ว่าเมื่อไรควรหยุด 🌈",
 "ไม่ต้องเปลี่ยนทั้งชีวิต เพื่อดูแลตัวเองให้ดีขึ้นหนึ่งอย่าง 🫶",
 "ลดความยุ่งยากให้สิ่งที่อยากทำบ่อยขึ้น ✨",
 "จัดพื้นที่เล็กน้อย อาจช่วยให้ใจมีที่วาง 💙",
 "นิสัยใหม่ควรช่วยเรา ไม่ใช่เป็นเหตุให้ดุตัวเองเพิ่ม 🫶",
 "ร่างกายกับใจ อยู่ในแผนเดียวกันได้ 🌿",
 "เก็บแรงไว้ใช้ชีวิต ไม่ใช่แค่ใช้ทำงาน 🌈",
 "ยิ้มให้ตัวเองได้ แม้วันนี้ไม่มีเรื่องใหญ่ให้ฉลอง 😊",
 "วันยากไม่จำเป็นต้องผ่านไปอย่างสวยงาม แค่ผ่านไปอย่างดูแลตัวเอง ✨",
 "เราไม่ต้องได้สิ่งที่อยากได้ทั้งหมด เพื่อเห็นค่าของสิ่งที่มี 🌈",
 "ความกังวลอาจดัง แต่ความต้องการของเราก็ควรมีเสียง 🫶",
 "เริ่มจากสิ่งใกล้มือ แล้วค่อยขยับสิ่งไกลตัว 🌱",
 "บางเป้าหมายควรเก็บไว้ บางเป้าหมายควรปรับให้เป็นของเรา 🚶",
 "ไม่ต้องแข่งขันทุกสนาม เพื่อหาที่ที่เหมาะกับตัวเอง 🫶",
 "เมื่อทำเต็มกำลังแล้ว ให้เวลาผลลัพธ์ได้ทำงานบ้าง 🕰️",
 "ความอดทนควรพาไปข้างหน้า ไม่ใช่ขังเราอยู่ที่เดิม 🌈",
 "ชีวิตที่ดี อาจมีวันธรรมดามากกว่าวันน่าประทับใจ 🤍",
 "อย่าเก็บความเมตตาไว้ให้คนอื่น จนไม่เหลือให้ตัวเอง 💙",
 "วันไหนคิดไม่ออก เริ่มจากดูแลสิ่งที่เห็นตรงหน้า 🌻",
 "การทำสิ่งเล็กให้เสร็จ ช่วยคืนความรู้สึกว่าเรายังเลือกได้ 💙",
 "ความอ่อนโยน ไม่ได้ลดความจริงจังของเป้าหมาย 🧭",
 "คำว่าเพียงพอ บางครั้งเป็นคำที่ต้องฝึกพูด 🌱",
 "ไม่ต้องเปลี่ยนความเหนื่อย ให้เป็นบทเรียนทุกครั้ง 🍃",
 "บางวันแค่ได้ใช้ชีวิตช้าลง ก็คุ้มแล้ว ✨",
 "อย่าลืมคนที่คอยอยู่กับเราทุกวัน นั่นคือตัวเราเอง 🌈",
 "เลือกสิ่งที่พาเราใกล้ชีวิตที่อยากอยู่ ไม่ใช่แค่ภาพที่อยากมี 🫶",
 "สิ่งที่ไม่สำเร็จ ยังอาจทิ้งทักษะไว้ให้เรา 🌻",
 "การมองเห็นทางออก มักเริ่มจากยอมรับว่าตอนนี้ติดอยู่ 🌱",
 "ไม่ต้องเข้มงวดกับตัวเอง เพื่อพิสูจน์ว่าเอาจริง 🫶",
 "ทุกครั้งที่เลือกอย่างตั้งใจ เรากำลังฝึกความไว้ใจตัวเอง 🌱",
 "ความคิดที่ดี ควรได้โอกาสทดลองในขนาดที่รับไหว 🚶",
 "ลดสิ่งรบกวนสักอย่าง อาจได้พื้นที่คืนมามากกว่าที่คิด 🫶",
 "บางคำตอบไม่ต้องรีบ แค่ไม่หลบมันตลอดไป ✨",
 "เราไม่จำเป็นต้องเก็บทุกอย่างไว้ เพื่อยืนยันว่าเคยมีความหมาย 🌈",
 "ความเบาใจอาจเริ่มจากการตัดสิ่งที่ไม่จำเป็น 🌻",
 "อย่าลืมเผื่อพื้นที่ให้เรื่องดีที่ยังนึกไม่ถึง ✨",
 "ก้าวต่อไปไม่ต้องยิ่งใหญ่ แค่เป็นก้าวที่เราเลือกเอง 🚶",
 "ความตั้งใจที่ยืดหยุ่น อาจอยู่กับเราได้นานกว่า 💙",
 "สิ่งที่ทำให้ใจสงบ สมควรมีเวลาในตาราง 🪙",
 "อย่าทำให้การพัฒนาตัวเอง กลายเป็นการไม่ชอบตัวเอง 🌱",
 "บางวันเราโตขึ้น ด้วยการเลือกไม่เถียงกับทุกเรื่อง 🫶",
 "ความรู้สึกขอบคุณ อยู่ร่วมกับความต้องการเปลี่ยนแปลงได้ 💙",
 "การไม่ซื้อบางอย่าง คือการเก็บสิทธิ์เลือกไว้ใช้ทีหลัง 👛",
 "สิ่งที่มีคุณค่า ไม่จำเป็นต้องดูแพง 🫶",
 "อย่าให้ความคาดหวังของวันพรุ่งนี้ ทำให้วันนี้ไม่มีที่พัก 🍃",
 "เราเดินต่อได้ โดยไม่ต้องลืมว่าที่ผ่านมายากแค่ไหน 🚶",
 "บางความสำเร็จไม่มีเสียงปรบมือ มีเพียงใจที่สบายขึ้น 🤍",
 "การทำอะไรให้น้อยลง อาจทำให้ได้ใช้ชีวิตมากขึ้น ✨",
 "ให้โอกาสความธรรมดา ได้เป็นวันที่ดีบ้าง 🚶",
 "ความมั่นใจอาจตามมาทีหลังการลงมือ ไม่ได้มาก่อนเสมอ 💙",
 "ไม่ต้องทำให้ใครประทับใจทุกวัน แค่ไม่ทิ้งสิ่งที่สำคัญกับเรา 🤍",
 "ความก้าวหน้าที่เหมาะสม ควรเหลือแรงให้มองเห็นวิวระหว่างทาง 🚶",
 "ทางที่ใช่ อาจเป็นทางที่ทำให้เราไม่ต้องฝืนตลอดเวลา 🎯"
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
 const elapsed = ordinal - Date.UTC(2026,9,17)/86400000;
 const quoteIndex = ((elapsed*137)%dailyMessages.length+dailyMessages.length)%dailyMessages.length;
 if (heading) heading.textContent = dailyMessages[quoteIndex];
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
 if (!document.hidden){
  checkDailyRollover();
  if(user){if(!lastSyncAt||Date.now()-lastSyncAt.getTime()>60000)scheduleLoad();else refreshCoordinator.flush();}
 }
});

const renderDashboard=createDashboardRenderer({
 getBudgets:()=>budgets,
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
 getTransactions:()=>transactions,getAccounts:()=>accounts
});
function filteredTx(){return transactionRenderer.filteredTx()}
function renderTransactions(){return transactionRenderer.renderTransactions()}
function renderTxList(el,arr,compact=false){return transactionRenderer.renderTxList(el,arr,compact)}
function renderCategories(){const usage=new Map();for(const t of transactions)usage.set(t.category_id,(usage.get(t.category_id)||0)+1);for(const type of ['expense','income']){const el=$(type==='expense'?'expenseCats':'incomeCats'),arr=categories.filter(c=>c.type===type);el.innerHTML=arr.length?arr.map(c=>'<div class="category-card"><div class="left"><span class="icon">'+esc(c.icon||'🏷️')+'</span><span class="name">'+esc(c.name)+'<small class="muted category-usage">ใช้ใน '+(usage.get(c.id)||0)+' รายการ</small></span></div><div class="actions"><button class="btn small soft" data-edit="category" data-id="'+c.id+'">แก้</button><button class="btn small danger" data-del="categories" data-id="'+c.id+'">ลบ</button></div></div>').join(''):'<div class="empty">ยังไม่มีหมวด</div>'}}
function renderAccounts(){const active=accounts.filter(a=>a.is_active!==false);$('accountList').innerHTML=active.length?active.map(a=>'<div class="item"><div><b>🏦 '+esc(a.name)+'</b><span class="muted">'+(a.account_number?'เลขที่บัญชี '+esc('•••• '+String(a.account_number).replace(/\s/g,'').slice(-4))+' · ':'')+esc(a.account_type)+(a.note?' · '+esc(a.note):'')+'</span></div><span class="amount"><small class="muted">ยอดตั้งต้น</small> '+money(a.opening_balance)+'</span><div class="actions"><button class="btn small soft" data-edit="account" data-id="'+a.id+'">แก้ไข</button><button class="btn small danger" data-del="accounts" data-id="'+a.id+'">ลบ</button></div></div>').join(''):'<div class="empty">ยังไม่มีบัญชี</div>'}
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
 getRentRecords:()=>rentRecords,
 ChartCtor:typeof Chart==='undefined'?null:Chart
});
$('exportSummaryPdf').onclick=async()=>{
 const button=$('exportSummaryPdf'),status=$('summaryPdfStatus');
 if(button.disabled)return;
 if(!user||!lastSyncAt||!$('dataError').classList.contains('hidden')){status.textContent='กรุณาโหลดข้อมูลให้สำเร็จก่อนดาวน์โหลด PDF';return;}
 if(document.body.classList.contains('privacy-mode')){status.textContent='ปิดซ่อนยอดเงินในตั้งค่าก่อนดาวน์โหลด PDF ที่มีข้อมูลการเงินจริง';return;}
 const report=renderSummary.getReport();if(!report){status.textContent='กรุณาเลือกช่วงเวลาใหม่ก่อนดาวน์โหลด';return;}
 const revision=sessionRevision,owner=user.id;
 const cancelled=()=>sessionRevision!==revision||user?.id!==owner||document.body.classList.contains('privacy-mode');
 clearSummaryPdf();button.disabled=true;button.setAttribute('aria-busy','true');button.textContent='กำลังสร้าง PDF…';status.textContent='กำลังเตรียมรายงานตามช่วงเวลาและสถานะที่เลือก…';
 try{
  const {createSummaryPdf}=await import('./summary-pdf.js?v=20261017-quotes63');
  if(cancelled())return;
  const result=await createSummaryPdf(report,{isCancelled:cancelled,onProgress:(page,total)=>{status.textContent=`กำลังสร้าง PDF หน้า ${page}/${total}…`;}});
  if(cancelled())return;
  summaryPdfUrl=URL.createObjectURL(result.blob);
  const link=document.createElement('a');link.href=summaryPdfUrl;link.download=result.filename;link.textContent='แตะดาวน์โหลดไฟล์อีกครั้ง';
  status.replaceChildren(document.createTextNode(`PDF ${result.pageCount} หน้า พร้อมแล้ว · `),link);link.click();
 }catch(error){if(!cancelled())status.textContent=error.message||'สร้าง PDF ไม่สำเร็จ กรุณาลองใหม่';}
 finally{button.disabled=false;button.removeAttribute('aria-busy');button.textContent='↓ ดาวน์โหลด PDF';}
};
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
function changeTxType(type){$('txType').value=type;fillTxSelectors();if(!editing.id)applyRecentTxSelection();renderCardPaymentSuggestions()}
document.querySelectorAll('[data-tx-type]').forEach(b=>b.onclick=()=>changeTxType(b.dataset.txType));
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
 // Show the destination directly; restarting an animation here forces layout.
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
window.addEventListener('hashchange',handleNavigationRoute);
function handleNavigationRoute(){const route=location.hash.slice(1);if(route==='capture-income'||route==='capture-expense'){showPage('transactions');captureTransaction(route.slice(8));}else showPage(route||'dashboard');}
function captureTransaction(type){if(!user||$('txForm').querySelector('button[type=submit]').disabled||$('txDialog').open)return;openTx();changeTxType(type==='income'?'income':'expense');}
window.addEventListener('finance:capture',e=>captureTransaction(e.detail));
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
for(const id of ['txFilterType','txFilterCategory','txFilterMonth','txFilterAccount','txFilterStatus'])$(id).onchange=renderTransactions;$('txSearch').oninput=()=>transactionRenderer.scheduleSearch();$('txType').onchange=()=>changeTxType($('txType').value);$('txCategory').onchange=renderCardPaymentSuggestions;$('summaryYear').onchange=renderSummary;$('summaryMonth').onchange=renderSummary;$('summaryStatus').onchange=renderSummary
document.addEventListener('click',e=>{const range=e.target.closest('[data-summary-range]');if(range){renderSummary.setRange?.(range.dataset.summaryRange)}})


function favoriteKey(){return 'finance-favorites-v1:'+user.id}
function recentTxKey(){return 'finance-recent-selection-v1:'+user.id}
function readRecentTxSelections(){try{const value=JSON.parse(localStorage.getItem(recentTxKey())||'{}');return value&&typeof value==='object'&&!Array.isArray(value)?value:{}}catch{return {}}}
function applyRecentTxSelection(){
 const value=readRecentTxSelections()[$('txType').value]||{};
 $('txCategory').value=categories.some(c=>c.id===value.category_id&&c.type===$('txType').value)?value.category_id:'';
 const accountId=Object.hasOwn(value,'account_id')?value.account_id:uiSettings.defaultAccount;
 $('txAccount').value=accounts.some(a=>a.id===accountId&&a.is_active!==false)?accountId:'';
}
function rememberTxSelection(row){
 try{const values=readRecentTxSelections();values[row.type]={category_id:row.category_id,account_id:row.account_id};localStorage.setItem(recentTxKey(),JSON.stringify(values));return true}catch{return false}
}
function readFavorites(){try{const v=JSON.parse(localStorage.getItem(favoriteKey())||'[]');return Array.isArray(v)?v.filter(x=>x&&typeof x.description==='string'&&['income','expense'].includes(x.type)).slice(0,12):[]}catch{return []}}
function templateKey(x){return JSON.stringify([x.type,x.description.trim(),x.category_id||'',x.account_id||''])}
function repeatChoices(){
 const favorites=readFavorites(),seen=new Set(favorites.map(templateKey)),groups=new Map();
 for(const x of transactions){
  if(x.type!=='expense'||x.status==='cancelled'||['salary','car_installment','rent'].includes(x.source)||/ค่างวดรถ|ชำระบัตร|เงินเดือน/.test(x.description||''))continue;
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

let txBaseline='';
function txFingerprint(){return JSON.stringify([...$('txForm').querySelectorAll('input:not([type=file]),select,textarea')].map(el=>[el.id,el.type==='checkbox'?el.checked:el.value]));}
function txDirty(){return $('txDialog').open&&txFingerprint()!==txBaseline;}
window.requestCloseTx=()=>{if($('txForm').querySelector('button[type=submit]').disabled)return;if(!txDirty()||confirm('มีข้อมูลที่ยังไม่ได้บันทึก ต้องการปิดฟอร์มและทิ้งการแก้ไขหรือไม่?'))$('txDialog').close();};
$('txDialog').addEventListener('cancel',event=>{event.preventDefault();window.requestCloseTx();});
window.addEventListener('beforeunload',event=>{if(txDirty()){event.preventDefault();event.returnValue='';}});
window.openTx=(id=null)=>{
 if(!user||$('txForm').querySelector('button[type=submit]').disabled)return;
 $('appToast')?.classList.add('hidden');
 duplicateOverride=false;$('txDuplicateWarning')?.classList.add('hidden');
 editing={type:'tx',id};$('txFavorite').checked=false;$('txError').classList.add('hidden');$('txExtra').open=false;$('txRepeatSection').open=false;
 $('txDialogTitle').textContent=id?'แก้ไขรายการ':'บันทึกรายการ';
 $('txDate').value=bangkokDay();$('txAccount').value='';$('txCategory').value='';$('txType').value='expense';$('txDesc').value='';$('txAmount').value='';$('txNote').value='';
 fillTxSelectors();if(!id)applyRecentTxSelection();renderRepeatChoices();
 if(id){const x=transactions.find(v=>v.id===id);if(x){$('txDate').value=x.transaction_date;$('txType').value=x.type;fillTxSelectors();$('txDesc').value=x.description;$('txAmount').value=x.amount;$('txCategory').value=x.category_id||'';$('txAccount').value=x.account_id||'';$('txNote').value=x.note||'';$('txFavorite').checked=readFavorites().some(f=>templateKey(f)===templateKey(x));$('txExtra').open=!!x.note;}}
 renderCardPaymentSuggestions();txBaseline=txFingerprint();$('txDialog').showModal();requestAnimationFrame(()=>{$('txForm').scrollTop=0;});
}
function txError(message){$('txError').dataset.saveState='failed';$('txError').textContent=message;$('txError').classList.remove('hidden');$('txError').scrollIntoView({block:'nearest'})}
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
 button.disabled=true;button.textContent='กำลังบันทึก…';let committed=false,savedId=editing.id;
 try{
  const r=editing.id?await supabase.from('transactions').update(row).eq('id',editing.id).eq('user_id',user.id).select('id').single():await retrySafeInsert(supabase,'transactions',row);
  if(r.error)throw r.error;
  savedId=savedId||r.data?.id;committed=true;if(!editing.id)rememberTxSelection(row);const favoriteSaved=saveFavorite(row);$('txDialog').close();
  const label='บันทึกรายการสำเร็จแล้ว ✅'+(row.status==='cancelled'?' · รายการยกเลิก ไม่นับรวมยอด':'')+(!favoriteSaved?' · เก็บรายการโปรดในเครื่องนี้ไม่ได้':'');
  savedNotice(label,await loadAll(),{label:'แก้ไขรายการนี้',run:()=>editSavedTransaction(savedId,row)});
 }catch(error){if(committed)savedNotice('บันทึกรายการสำเร็จแล้ว',false,{label:'แก้ไขรายการนี้',run:()=>editSavedTransaction(savedId,row)});else{showFinanceSaveError($('txError'),error);$('txError').scrollIntoView({block:'nearest'})}}finally{unlock();button.disabled=false;button.textContent='บันทึก'}
}
$('txDuplicateContinue')?.addEventListener('click',()=>{duplicateOverride=true;$('txDuplicateWarning')?.classList.add('hidden');$('txForm').requestSubmit()});
for(const id of ['txAmount','txDesc','txDate','txType','txCategory','txAccount','txNote']){
 $(id)?.addEventListener('input',()=>{duplicateOverride=false;$('txDuplicateWarning')?.classList.add('hidden')});
 $(id)?.addEventListener('change',()=>{duplicateOverride=false;$('txDuplicateWarning')?.classList.add('hidden')});
}

const capacityMonitor=createCapacityMonitor({$,rpc:()=>supabase.rpc('finance_capacity'),getUser:()=>user,isVisible:()=>!!user&&!document.hidden&&!$('settingsPage').classList.contains('hidden')});
window.addEventListener('finance:page',()=>void capacityMonitor.sync());
document.addEventListener('visibilitychange',()=>void capacityMonitor.sync());
window.addEventListener('online',()=>void capacityMonitor.sync());
async function refreshHealthCheck(){
 const btn=$('runHealthCheck');if(!btn||!user)return;
 btn.disabled=true;btn.textContent='กำลังตรวจ…';
 try{
  if(!await loadAll())throw new Error('ซิงก์ข้อมูลล่าสุดไม่สำเร็จ กรุณาลองใหม่');
  const result=await runDataHealthCheck({db:supabase,userId:user.id,transactions,readAll});
  const set=(id,ok,bad)=>{const el=$(id);if(!el)return;el.textContent=ok?'ปกติ ✅':bad;el.classList.toggle('health-bad',!ok);};
  set('healthSync',!!lastSyncAt,lastSyncAt?'':'ยังไม่เคยซิงก์สำเร็จ');
  set('healthDuplicates',result.duplicateGroups===0,'พบ '+result.duplicateGroups+' กลุ่ม');
  set('healthSalary',result.orphanSalary+result.mismatchSalary===0,'ต้องตรวจ '+(result.orphanSalary+result.mismatchSalary)+' รายการ');
  set('healthInstallments',result.orphanInstallments+result.mismatchInstallments===0,'ต้องตรวจ '+(result.orphanInstallments+result.mismatchInstallments)+' รายการ');
  set('healthCar',result.orphanCar+result.mismatchCar===0,'ต้องตรวจ '+(result.orphanCar+result.mismatchCar)+' รายการ');
  set('healthRent',result.orphanRent+result.mismatchRent===0,'ต้องตรวจ '+(result.orphanRent+result.mismatchRent)+' รายการ');
  set('healthBills',result.orphanBills+result.billDuplicateGroups===0,'ต้องตรวจ '+(result.orphanBills+result.billDuplicateGroups)+' รายการ');
  set('healthLinks',result.brokenSourceLinks+result.invalidDimensions===0,'ต้องตรวจ '+(result.brokenSourceLinks+result.invalidDimensions)+' รายการ');
  const pushSupported='Notification' in window&&'serviceWorker' in navigator&&'PushManager' in window;
  const sub=pushSupported?await currentPushSubscription().catch(()=>null):null;
  const pushOk=!!sub&&Notification.permission==='granted';
  const push=$('healthPush');if(push){push.textContent=!pushSupported?'ไม่รองรับ':pushOk?'พร้อมใช้งาน ✅':'ยังไม่เปิด';push.classList.toggle('health-bad',pushSupported&&!pushOk);}
  $('healthCheckedAt').textContent=(result.ok?'ตรวจล่าสุด ':'พบจุดที่ต้องตรวจสอบ · ตรวจล่าสุด ')+new Date().toLocaleTimeString('th-TH',{hour:'2-digit',minute:'2-digit'});
 }catch(error){
  $('healthSync').textContent='ตรวจข้อมูลล่าสุดไม่สำเร็จ';$('healthSync').classList.add('health-bad');
  for(const id of ['healthDuplicates','healthSalary','healthInstallments','healthCar','healthRent','healthBills','healthLinks']){const el=$(id);if(el){el.textContent='ยังตรวจไม่ได้';el.classList.remove('health-bad');}}
  $('healthCheckedAt').textContent='ตรวจไม่สำเร็จ: '+error.message;
 }finally{btn.disabled=false;btn.textContent='ตรวจสอบอีกครั้ง'}
}
$('runHealthCheck')?.addEventListener('click',()=>void refreshHealthCheck());

window.openEntity=(type,id=null)=>{if(!user||$('entityForm').querySelector('button[type=submit]').disabled)return;editing={type,id};const f=$('entityFields'),title=$('entityTitle');let x
 if(type==='category'){x=id?categories.find(v=>v.id===id):null;title.textContent=(id?'แก้ไข':'เพิ่ม')+'หมวดหมู่';f.innerHTML='<div class="field full"><label>ชื่อหมวด</label><input name="name" required value="'+esc(x?.name||'')+'"></div><div class="field"><label>ประเภท</label><select name="type"><option value="expense" '+(x?.type!=='income'?'selected':'')+'>รายจ่าย</option><option value="income" '+(x?.type==='income'?'selected':'')+'>รายรับ</option></select></div><div class="field"><label>ไอคอน Emoji</label><input name="icon" value="'+esc(x?.icon||'🏷️')+'"></div>'}
 if(type==='account'){x=id?accounts.find(v=>v.id===id):null;title.textContent=(id?'แก้ไข':'เพิ่ม')+'บัญชี';f.innerHTML='<div class="field full"><label>ชื่อบัญชี / ชื่อสมุด</label><input name="name" required value="'+esc(x?.name||'')+'"></div><div class="field"><label>ตัวย่อธนาคาร</label><input name="bank_code" maxlength="20" value="'+esc(x?.bank_code||'')+'" placeholder="เช่น KBANK"></div><div class="field"><label>เลขที่บัญชี</label><input name="account_number" inputmode="numeric" value="'+esc(x?.account_number||'')+'" placeholder="กรอกเฉพาะตัวเลข"></div><div class="field"><label>ประเภท</label><select name="account_type">'+['bank','cash','credit_card','e_wallet','other'].map(v=>'<option value="'+v+'" '+(x?.account_type===v?'selected':'')+'>'+v+'</option>').join('')+'</select></div><div class="field"><label>ยอดตั้งต้น</label><input name="opening_balance" type="number" step="0.01" value="'+(x?.opening_balance||0)+'"></div><div class="field full"><label>หมายเหตุ</label><input name="note" value="'+esc(x?.note||'')+'"></div>'}
 if(type==='bill'){x=id?bills.find(v=>v.id===id):null;title.textContent=(id?'แก้ไข':'เพิ่ม')+'บิล';const defaultBillCategory=x?.category_id||categories.find(c=>c.type==='expense'&&c.name==='บิล/สาธารณูปโภค')?.id||'',paymentSource=x?.debt_id?('debt:'+x.debt_id):x?.account_id?('account:'+x.account_id):(uiSettings.defaultAccount?('account:'+uiSettings.defaultAccount):'');f.innerHTML='<div class="field full"><label>ชื่อบิล</label><input name="name" required value="'+esc(x?.name||'')+'"></div><div class="field"><label>จำนวนเงิน</label><input name="amount" type="number" step="0.01" min="0" value="'+(x?.amount||0)+'"></div><div class="field"><label>ครบกำหนดวันที่</label><input name="due_day" type="number" min="1" max="31" value="'+(x?.due_day??'')+'"></div><div class="field full"><label>หมวด</label><select name="category_id">'+categories.filter(c=>c.type==='expense').map(c=>'<option value="'+c.id+'" '+(defaultBillCategory===c.id?'selected':'')+'>'+esc((c.icon||'')+' '+c.name)+'</option>').join('')+'</select></div><div class="field full"><label>ชำระผ่าน</label><select name="payment_source"><option value="">ไม่ระบุ</option><optgroup label="บัญชี / เงินสด">'+accounts.filter(a=>a.is_active!==false).map(a=>'<option value="account:'+a.id+'" '+(paymentSource==='account:'+a.id?'selected':'')+'>🏦 '+esc(a.name)+'</option>').join('')+'</optgroup><optgroup label="บัตรเครดิต / สินเชื่อ">'+debts.filter(d=>d.is_active!==false).map(d=>'<option value="debt:'+d.id+'" '+(paymentSource==='debt:'+d.id?'selected':'')+'>💳 '+esc(d.name)+'</option>').join('')+'</optgroup></select><small class="muted">ถ้าเลือกบัตร ระบบจะเพิ่มยอดค้างชำระบัตรเมื่อกด “จ่ายแล้ว”</small></div>'}
 if(type==='budget'){x=id?budgets.find(v=>v.id===id):null;title.textContent=(id?'แก้ไข':'เพิ่ม')+'งบประมาณ';const ex=x?.category_names||[];f.innerHTML='<div class="field full"><label>ชื่องบ</label><input name="name" required value="'+esc(x?.name||'')+'"></div><div class="field full"><label>งบต่อเดือน</label><input name="monthly_limit" type="number" min="0" step="100" required value="'+(x?.monthly_limit??4000)+'"></div><div class="field full"><label>หมวดที่นับรวมในงบ</label><div class="budget-checks">'+categories.filter(c=>c.type==='expense').map(c=>'<label class="check"><input type="checkbox" name="category_names" value="'+esc(c.name)+'" '+(ex.includes(c.name)?'checked':'')+'><span>'+esc((c.icon||'')+' '+c.name)+'</span></label>').join('')+'</div></div>'}
 if(type==='debt'){x=id?debts.find(v=>v.id===id):null;title.textContent=(id?'แก้ไข':'เพิ่ม')+'บัตร/สินเชื่อ';f.innerHTML='<div class="field full"><label>ชื่อบัตร/สินเชื่อ</label><input name="name" required value="'+esc(x?.name||'')+'"></div><div class="field"><label>ประเภท</label><select name="debt_type">'+['credit_card','loan','car','mortgage','other'].map(v=>'<option value="'+v+'" '+(x?.debt_type===v?'selected':'')+'>'+({credit_card:'บัตรเครดิต / PayLater',loan:'สินเชื่อ / บัตรกดเงินสด',car:'สินเชื่อรถ',mortgage:'สินเชื่อที่อยู่อาศัย',other:'อื่น ๆ'}[v])+'</option>').join('')+'</select></div><div class="field"><label>วงเงิน</label><input name="original_amount" type="number" min="0" step="0.01" value="'+(x?.original_amount||0)+'"></div><div class="field"><label>ยอดใช้ไป / ยอดค้างชำระ</label><input name="outstanding_amount" type="number" min="0" step="0.01" value="'+(x?.outstanding_amount||0)+'"></div><div class="field"><label>ยอดที่ต้องจ่ายรอบนี้</label><input name="installment_amount" type="number" min="0" step="0.01" value="'+(x?.installment_amount||0)+'"></div><div class="field"><label>ครบกำหนดวันที่</label><input name="due_day" type="number" min="1" max="31" value="'+(x?.due_day??'')+'"></div>';f.insertAdjacentHTML('beforeend','<div class="field full"><label for="debtLogoKey">โลโก้ผู้ให้บริการ</label><div class="debt-logo-picker"><div data-debt-logo-preview></div><select id="debtLogoKey" name="logo_key">'+debtLogoOptions(x?.logo_key)+'</select></div><small class="muted">จับคู่จากชื่ออัตโนมัติ หรือเลือกโลโก้เองได้</small></div>');bindDebtLogoPicker(f);}
 $('entityDialog').showModal()}
$('entityForm').onsubmit=async e=>{
 e.preventDefault();const button=e.currentTarget.querySelector('button[type="submit"]');if(button.disabled)return;
 const form=new FormData(e.currentTarget),fd=Object.fromEntries(form.entries());
 const table={category:'categories',account:'accounts',bill:'bills',budget:'budgets',debt:'debts'}[editing.type];
 fd.user_id=user.id;fd.name=fd.name.trim();if(!fd.name)return alert('กรุณากรอกชื่อ');if(editing.type==='account'){fd.bank_code=String(fd.bank_code||'').trim()||null;fd.account_number=String(fd.account_number||'').replace(/\D/g,'')||null;}
 if(editing.type==='budget'){fd.monthly_limit=Number(fd.monthly_limit||0);fd.category_names=form.getAll('category_names')}
 else for(const k of ['opening_balance','amount','due_day','original_amount','outstanding_amount','installment_amount'])if(k in fd)fd[k]=k==='due_day'&&fd[k]===''?null:Number(fd[k]||0);
 if(editing.type==='debt'){fd.logo_key=fd.logo_key==='none'||Object.hasOwn(debtLogoBrands,fd.logo_key||'')?fd.logo_key:null;}
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
 }catch(error){if(committed)savedNotice('บันทึกข้อมูลสำเร็จแล้ว',false,{label:'ดูข้อมูล',run:()=>showPage(table==='budgets'?'budget':table)});else alert(financeSaveFeedback(error).message)}finally{unlock();button.disabled=false}
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
 if(localPaid){const status=recurringBillMonthStatus(bill,transactions,bangkokDay());showAppToast(status.state==='paid'?'บิลนี้จ่ายแล้วในเดือนนี้ ✅':'บิลนี้มีรายการรอจ่ายหรือวันที่อนาคตแล้ว กรุณาตรวจรายการก่อน');renderBills();return;}
 const originalText=button?.textContent||'✓ จ่ายแล้ว';if(button){button.disabled=true;button.textContent='กำลังบันทึก…';}
 try{
  const {error}=await supabase.rpc('pay_recurring_bill',{p_bill_id:bill.id,p_paid_date:bangkokDay()});
  if(error)throw error;
  savedNotice(debt?'บันทึกรายจ่ายและเพิ่มยอดบัตร '+debt.name+' สำเร็จแล้ว ✅':'บันทึก '+bill.name+' เป็นรายจ่ายสำเร็จแล้ว ✅',await loadAll(),{label:'ดูบิล',run:()=>showPage('bills')});
 }catch(error){const feedback=financeSaveFeedback(error);showAppToast(feedback.message,{label:'ตรวจรายการ',run:()=>{showPage('transactions');void loadAll()}},feedback.state)}
 finally{if(button?.isConnected){button.disabled=false;button.textContent=originalText;}}
}

document.addEventListener('click',async e=>{const billHistory=e.target.closest('[data-bill-history]');if(billHistory){planningRenderer.openBillHistory(billHistory.dataset.billHistory);return;}const budgetHistory=e.target.closest('[data-budget-history]');if(budgetHistory){planningRenderer.openBudgetHistory(budgetHistory.dataset.budgetHistory);return;}const payBill=e.target.closest('[data-pay-bill]');if(payBill){const bill=bills.find(x=>x.id===payBill.dataset.payBill);if(bill)await payRecurringBill(bill,payBill);return;}const pay=e.target.closest('[data-pay-debt]');if(pay){const d=debts.find(x=>x.id===pay.dataset.payDebt);if(d){const cat=categories.find(c=>c.type==='expense'&&c.name==='หนี้/ผ่อน');$('txType').value='expense';fillTxSelectors();if(cat)$('txCategory').value=cat.id;$('txDesc').value='ชำระบัตร '+d.name;$('txAmount').value=Number(d.installment_amount||0)>0?Number(d.installment_amount):'';$('txNote').value='ยอดคงเหลือก่อนชำระ '+money(d.outstanding_amount||0);renderCardPaymentSuggestions();if(window.innerWidth>820)$('txAmount').focus()}return}const edit=e.target.closest('[data-edit]');if(edit){const t=edit.dataset.edit,id=edit.dataset.id;if(t==='tx'&&(transactions.find(x=>x.id===id)?.source==='car_installment'||transactions.find(x=>x.id===id)?.source==='car_expense'||carExpenseTxIds.has(id))){location.href='./car.html';return}if(t==='tx'&&transactions.find(x=>x.id===id)?.source==='salary'){location.href='./salary.html';return}if(t==='tx'&&transactions.find(x=>x.id===id)?.source?.startsWith('bill_payment:')){showPage('bills');showAppToast('รายการนี้มาจากบิลประจำ กรุณาจัดการที่หน้าบิลประจำ');return}if(t==='tx'&&transactions.find(x=>x.id===id)?.source==='rent'){location.href='./rent.html';return}if(t==='tx')openTx(id);else openEntity(t,id);return}const del=e.target.closest('[data-del]');if(del){if(del.dataset.del==='transactions'&&(transactions.find(x=>x.id===del.dataset.id)?.source==='car_installment'||transactions.find(x=>x.id===del.dataset.id)?.source==='car_expense'||carExpenseTxIds.has(del.dataset.id))){alert('กรุณาจัดการรายการนี้ผ่านหน้ารถของฉัน');return}if(del.dataset.del==='transactions'&&transactions.find(x=>x.id===del.dataset.id)?.source==='salary'){alert('กรุณาจัดการรายการนี้ผ่านหน้าเงินเดือน');return}if(del.dataset.del==='transactions'&&transactions.find(x=>x.id===del.dataset.id)?.source?.startsWith('bill_payment:')){alert('รายการนี้มาจากบิลประจำ เพื่อให้ยอดบัตรตรงกัน กรุณาจัดการผ่านหน้าบิลประจำ');return}if(del.dataset.del==='transactions'&&transactions.find(x=>x.id===del.dataset.id)?.source==='rent'){alert('กรุณาจัดการรายการนี้ผ่านหน้าค่าห้องเช่า');return}const used=del.dataset.del==='categories'?transactions.filter(t=>t.category_id===del.dataset.id).length:0;if(!confirm(used?'หมวดนี้ใช้ใน '+used+' รายการ การลบอาจทำให้รายการเดิมไม่มีหมวด ยืนยันลบหมวดนี้?':'ยืนยันลบรายการนี้?'))return;const {error}=await supabase.from(del.dataset.del).delete().eq('id',del.dataset.id).eq('user_id',user.id);if(error)alert('ลบไม่ได้: '+error.message);else await loadAll()}})
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


$('exportFinanceBackup').onclick=async()=>{
 const button=$('exportFinanceBackup');if(!user||button.disabled)return;button.disabled=true;button.textContent='กำลังสำรอง…';
 try{const {data,error}=await supabase.rpc('export_finance_backup');if(error)throw error;if(!user)throw new Error('กรุณาเข้าสู่ระบบก่อนสำรองข้อมูล');verifyFinanceBackup(data,user.id);const content=serializeFinanceBackup(data),url=URL.createObjectURL(new Blob([content],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='My_Finance_Backup_'+bangkokDay()+'.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);showAppToast('สร้างไฟล์สำรองข้อมูลการเงินแล้ว กรุณาเก็บไฟล์ไว้ในที่ปลอดภัย');}
 catch(error){showAppToast('สำรองข้อมูลไม่ได้: '+error.message);}
 finally{button.disabled=false;button.textContent='ดาวน์โหลดข้อมูลสำรอง JSON';}
};

window.addEventListener('finance:theme',()=>{if(user)renderSummary();});

document.querySelectorAll('#summaryPage details').forEach(details=>details.addEventListener('toggle',()=>{if(details.open&&typeof Chart!=='undefined')requestAnimationFrame(()=>details.querySelectorAll('canvas').forEach(canvas=>Chart.getChart?.(canvas)?.resize()));}));


