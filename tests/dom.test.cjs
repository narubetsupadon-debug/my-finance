const {JSDOM}=require('jsdom');
const fs=require('fs'),assert=require('node:assert/strict');
const root=require('node:path').join(__dirname,'../');
const core=fs.readFileSync(root+'finance-core.js','utf8').replaceAll('export ','');
const appData=fs.readFileSync(root+'app-data.js','utf8').replaceAll('export ','');
const appSummary=fs.readFileSync(root+'app-summary.js','utf8').replaceAll('export ','');
const appDashboard=fs.readFileSync(root+'app-dashboard.js','utf8').replaceAll('export ','');
const appTransactions=fs.readFileSync(root+'app-transactions.js','utf8').replaceAll('export ','');
const appPlanning=fs.readFileSync(root+'app-planning.js','utf8').replaceAll('export ','');
const appSafety=fs.readFileSync(root+'app-safety.js','utf8').replaceAll('export ','');
const payslip=fs.readFileSync(root+'salary-payslip.js','utf8').replaceAll('export ','');
function dbMock(data){
 const state={fail:false,writes:[],rpcs:[]};
 const db={auth:{getSession:async()=>({data:{session:{user:{id:'user',email:'test@example.invalid'}}}}),getUser:async()=>({data:{user:{id:'user',email:'test@example.invalid'}}}),onAuthStateChange:callback=>{state.authChange=callback;return {data:{subscription:{unsubscribe(){}}}}},signOut:async()=>({error:state.signOutError||null})},channel:()=>({on(){return this},subscribe(){return this}}),removeChannel(){}};
 db.rpc=async(name,args)=>{state.rpcs.push({name,args});return state.fail?{error:{message:'offline'}}:{data:'rpc-saved',error:null};};
 db.from=table=>{
  let rows=[...(data[table]||[])],write=null;
  const q={select(){return q},order(){return q},limit(n){rows=rows.slice(0,n);return q},eq(k,v){rows=rows.filter(r=>r[k]===v);return q},neq(k,v){rows=rows.filter(r=>r[k]!==v);return q},not(k,op,v){if(op==='is'&&v===null)rows=rows.filter(r=>r[k]!==null&&r[k]!==undefined);return q},
  insert(row){write=row;state.writes.push({table,row});return q},update(row){write=row;state.writes.push({table,row});return q},
  single:async()=>{if(state.writeGate)await state.writeGate;if(state.fail)return {error:{message:'offline'}};if(state.failAfterWrite)state.fail=true;return {data:{id:'saved'}}},
  range:async(a,b)=>{if(state.readGate)await state.readGate;return state.fail?{error:{message:'offline'}}:{data:rows.slice(a,b+1)}},
  then(resolve,reject){return Promise.resolve(state.fail?{error:{message:'offline'}}:{data:rows}).then(resolve,reject)}
  };return q;
 };
 return {db,state};
}
async function page(html,js,data,expose){
 const dom=new JSDOM(fs.readFileSync(root+html,'utf8'),{url:'https://finance.test/',runScripts:'outside-only'});
 const w=dom.window,{db,state}=dbMock(data);w.createClient=()=>db;w.alerts=[];w.alert=x=>w.alerts.push(x);w.confirm=()=>true;w.scrollTo=()=>{};w.setInterval=()=>0;
 w.HTMLElement.prototype.scrollIntoView=function(){};w.requestAnimationFrame=cb=>{cb();return 1};w.cancelAnimationFrame=()=>{};
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false};
 let code=fs.readFileSync(root+js,'utf8').replace(/^import .*$/gm,'');
 if(js==='salary.js')code=code.replace('document,canRead:', 'document,readPdf:async()=>window.mockPayslipDraft,canRead:');
 const api=await w.eval('(async()=>{'+core+'\n'+appData+'\n'+appSummary+'\n'+appDashboard+'\n'+appTransactions+'\n'+appPlanning+'\n'+appSafety+'\n'+payslip+'\n'+code+'\nreturn {'+expose+'};})()');
 return {w,api,state,close:()=>w.close(),el:id=>w.document.getElementById(id)};
}
(async()=>{
 const day=new Date().toISOString().slice(0,10);
 const categories=[{id:'cat',user_id:'user',name:'อาหาร',type:'expense',icon:'<img src=x onerror=alert(1)>'},{id:'coffee',user_id:'user',name:'กาแฟ',type:'expense',icon:'☕'},{id:'utilities',user_id:'user',name:'บิล/สาธารณูปโภค',type:'expense',icon:'🧾'},{id:'inc',user_id:'user',name:'เงินเดือน',type:'income'}];
 const accounts=[{id:'acc',user_id:'user',name:'bank',is_active:true}];
 const transactions=Array.from({length:1201},(_,i)=>({id:'t'+i,user_id:'user',type:'expense',status:'paid',source:'import_r3_v2',transaction_date:day,description:'food',amount:1,category_id:'cat',account_id:'acc',categories:categories[0],accounts:accounts[0]}));
 transactions[0].status='cancelled';
 const p=await page('index.html','app.js',{categories,accounts,transactions,car_expenses:[{id:'ce1',user_id:'user',transaction_id:'t1'}]},'loadAll,fillTxSelectors,checkDailyRollover,refreshHealthCheck');
 assert.ok(p.el('settingsLogout'));assert.equal(p.el('authSplash').classList.contains('hidden'),true);assert.equal(p.el('authScreen').classList.contains('hidden'),true);assert.equal(p.el('app').classList.contains('hidden'),false);assert.equal(p.el('txCount').textContent,'1201 รายการ');assert.ok(p.el('pushDeviceSetting'));assert.match(p.el('syncStatusText').textContent,/ซิงก์แล้ว/);
 assert.equal(p.el('txList').querySelector('img'),null);
 assert.equal(p.el('recentList').querySelectorAll('.transaction-row').length,5);
 assert.match(p.el('txList').querySelector('.status-cancelled').textContent,/ยกเลิก/);
 p.el('viewToday').click();assert.equal(p.el('insightDetailDialog').open,true);p.el('insightDetailDialog').close();
 p.el('nextBillCard').click();assert.equal(p.el('billsPage').classList.contains('hidden'),false);
  // accent toast must not appear on ordinary navigation clicks
  p.el('appToast').classList.add('hidden');
  p.w.document.querySelector('[data-page="dashboard"]').click();
  assert.equal(p.el('appToast').classList.contains('hidden'),true);
  // same-page navigation should stay stable and keep one visible page
  p.w.document.querySelector('[data-page="dashboard"]').click();
  assert.equal([...p.w.document.querySelectorAll('.page')].filter(x=>!x.classList.contains('hidden')).length,1);
 p.w.document.body.classList.add('privacy-mode');p.api.loadAll&&await p.api.loadAll();assert.match(p.el('todaySpent').textContent,/••••/);p.w.document.body.classList.remove('privacy-mode');await p.api.loadAll();
 p.el('txForm').scrollTop=120;p.w.openTx();assert.equal(p.el('txForm').scrollTop,0);assert.notEqual(p.w.document.activeElement.id,'txAmount');
 p.w.document.querySelector('[data-tx-type="income"]').click();
  assert.equal(p.el('txType').value,'income');assert.equal(p.el('txCategory').value,'');
 assert.equal(p.w.document.querySelector('[data-tx-type="income"]').getAttribute('aria-pressed'),'true');
 p.w.quickAdd('อาหาร');assert.equal(p.el('txType').value,'expense');assert.equal(p.el('txDesc').value,'อาหาร');assert.equal(p.el('txCategory').value,'cat');
 p.w.quickAdd('กาแฟ');assert.equal(p.el('txCategory').value,'coffee');
 // linked car transaction must route to car management instead of opening the generic editor
 const linkedEdit=p.w.document.querySelector('[data-edit="tx"][data-id="t1"]');if(linkedEdit)linkedEdit.click();
 assert.equal(p.el('txAmount').value,'');p.el('txDialog').close();
 p.el('txFilterCategory').value='cat';p.w.openTx('t0');p.el('txAccount').value='acc';await p.api.loadAll();
 assert.equal(p.el('txFilterCategory').value,'cat');assert.equal(p.el('txAccount').value,'acc');
 await p.el('txForm').onsubmit({preventDefault(){},currentTarget:p.el('txForm')});
 assert.equal(p.state.writes.at(-1).row.status,'cancelled');assert.equal(p.state.writes.at(-1).row.source,'import_r3_v2');
 assert.match(p.el('appToast').textContent,/รายการยกเลิก/);p.el('appToast').querySelector('.toast-action').click();assert.equal(p.el('transactionsPage').classList.contains('hidden'),false);assert.equal(p.el('txSearch').value,'food');
 p.state.failAfterWrite=true;p.w.openTx('t0');await p.el('txForm').onsubmit({preventDefault(){},currentTarget:p.el('txForm')});assert.equal(p.el('txDialog').open,false);assert.match(p.el('appToast').textContent,/ไม่ต้องบันทึกซ้ำ/);assert.equal(p.el('appToast').querySelector('.toast-action').textContent,'โหลดใหม่');assert.equal(p.el('txError').classList.contains('hidden'),true);p.state.failAfterWrite=false;p.state.fail=false;p.el('appToast').querySelector('.toast-action').click();await new Promise(r=>setTimeout(r,0));assert.equal(p.el('appToast').querySelector('.toast-action').textContent,'ดูรายการ');
 p.w.openEntity('debt');p.el('entityFields').querySelector('[name=name]').value='card';
 await p.el('entityForm').onsubmit({preventDefault(){},currentTarget:p.el('entityForm')});
 assert.equal(p.state.writes.at(-1).table,'debts');assert.equal(p.state.writes.at(-1).row.due_day,null);assert.equal(p.w.alerts.length,0);
 await p.api.refreshHealthCheck();assert.match(p.el('healthSync').textContent,/ปกติ/);
 p.state.fail=true;await p.api.refreshHealthCheck();assert.match(p.el('healthSync').textContent,/ไม่สำเร็จ/);
 await p.api.loadAll();assert.equal(p.el('dataError').classList.contains('hidden'),false);assert.equal(p.el('txCount').textContent,'1201 รายการ');
 // Opening the app after midnight must refresh date-dependent totals.
 const oldLabel=p.el('todayLabel').textContent,OriginalDate=p.w.Date;
 const tomorrow=Date.now()+86400000;
 p.w.Date=class extends OriginalDate{constructor(...args){super(...(args.length?args:[tomorrow]))}};
 p.api.checkDailyRollover();
 assert.notEqual(p.el('todayLabel').textContent,oldLabel);
 assert.equal(p.el('todayCount').textContent,'0 รายการ');
 // Summary range shortcuts must drive the whole dashboard.
 assert.match(p.el('summaryPeriodText').textContent,/กำลังดู/);assert.equal(p.el('summaryTrendBadge').textContent,'รายวัน');
 p.w.document.querySelector('[data-summary-range="6m"]').click();assert.equal(p.el('summaryTrendBadge').textContent,'รายเดือน');assert.match(p.el('summaryPeriodText').textContent,/6 เดือนล่าสุด/);
 p.w.document.querySelector('[data-summary-range="custom"]').click();assert.equal(p.el('summaryCustomFilters').classList.contains('hidden'),false);
 p.el('summaryYear').value=day.slice(0,4);p.el('summaryMonth').value=day.slice(5,7);p.el('summaryMonth').onchange();assert.equal(p.el('summaryTrendBadge').textContent,'รายวัน');
 p.el('summaryMonth').value='all';p.el('summaryMonth').onchange();assert.equal(p.el('summaryTrendBadge').textContent,'รายเดือน');
 // New bills default to utilities so Summary classifies them as recurring expenses.
 p.w.openEntity('bill');assert.equal(p.el('entityFields').querySelector('[name=category_id]').value,'utilities');p.el('entityDialog').close();
 p.close();

 // One-tap recurring bill payment uses the atomic RPC and can target a credit card.
 const debt={id:'kplus',user_id:'user',name:'K PLUS',debt_type:'credit_card',outstanding_amount:1000,is_active:true};
 const bill={id:'bill1',user_id:'user',name:'ค่าเน็ต',amount:599,due_day:5,category_id:'utilities',account_id:'acc',debt_id:null,is_active:true,categories:{name:'บิล/สาธารณูปโภค'},accounts:{name:'bank'}};
 const billsPage=await page('index.html','app.js',{categories,accounts,transactions:[],bills:[bill],debts:[debt]},'loadAll');
 const payButton=billsPage.el('billList').querySelector('[data-pay-bill="bill1"]');assert.ok(payButton);billsPage.w.confirm=()=>true;payButton.click();
 await new Promise(r=>setTimeout(r,0));
 assert.equal(billsPage.state.rpcs.at(-1).name,'pay_recurring_bill');assert.equal(billsPage.state.rpcs.at(-1).args.p_bill_id,'bill1');
 billsPage.w.openEntity('bill','bill1');assert.equal(billsPage.el('entityFields').querySelector('[name=payment_source]').value,'account:acc');billsPage.el('entityDialog').close();
 const cardBill={...bill,id:'bill2',name:'Spotify',account_id:null,debt_id:'kplus',accounts:null};
 const cardPage=await page('index.html','app.js',{categories,accounts,transactions:[],bills:[cardBill],debts:[debt]},'loadAll');
 assert.match(cardPage.el('billList').textContent,/K PLUS/);cardPage.w.openEntity('bill','bill2');assert.equal(cardPage.el('entityFields').querySelector('[name=payment_source]').value,'debt:kplus');cardPage.el('entityDialog').close();cardPage.close();
 billsPage.close();
 const paidTx={id:'paidbill',user_id:'user',type:'expense',status:'paid',source:'bill_payment:bill1',transaction_date:day,description:'ค่าเน็ต',amount:599,category_id:'utilities',account_id:'acc',categories:categories[2],accounts:accounts[0]};
 const paidBillsPage=await page('index.html','app.js',{categories,accounts,transactions:[paidTx],bills:[bill]},'loadAll');
 assert.match(paidBillsPage.el('billList').textContent,/จ่ายแล้วเดือนนี้/);assert.equal(paidBillsPage.el('billList').querySelector('[data-pay-bill="bill1"]'),null);paidBillsPage.close();
 const s=await page('salary.html','salary.js',{categories,accounts,transactions:[]},'reset');
 s.w.mockPayslipDraft={rows:[{kind:'earning',label:'เงินเดือน',key:'base_salary',cents:200000},{kind:'earning',label:'OT',key:'overtime',cents:10000}],expected:{gross:210000,deductions:0,net:210000},month:'2026-09',paymentDate:'2026-09-30'};
 Object.defineProperty(s.el('payslipFile'),'files',{value:[{name:'mock.pdf'}]});
 await s.el('readPayslip').onclick();assert.equal(s.el('saveSalary').disabled,false);assert.equal(s.state.writes.length,0);
 s.el('applyPayslip').click();assert.equal(s.el('base_salary').value,'2000.00');assert.equal(s.el('overtime').value,'100.00');assert.equal(s.el('salary_month').value,'2026-09');assert.equal(s.state.writes.length,0);s.api.reset();

 assert.equal(s.el('category_id').value,'inc');
 s.el('base_salary').value='1000';s.el('account_id').value='acc';
 await s.el('salaryForm').onsubmit({preventDefault(){}});
 assert.equal(s.state.writes.at(-1).row.base_salary,1000);assert.equal(s.el('category_id').value,'inc');
 s.el('base_salary').value='1000';s.el('account_id').value='acc';s.state.failAfterWrite=true;
 await s.el('salaryForm').onsubmit({preventDefault(){}});assert.match(s.el('salaryMessage').textContent,/บันทึกสำเร็จแล้ว/);assert.equal(s.el('salaryApp').classList.contains('hidden'),true);s.close();
 const c=await page('car.html','car.js',{categories,accounts,car_installments:[]},'open');
 assert.equal(c.el('nextNo').textContent,'ยังไม่มีตารางผ่อน');
 c.api.open({id:'car',installment_no:1,status:'pending'});c.state.fail=true;
 await c.el('carForm').onsubmit({preventDefault(){}});
 assert.match(c.el('carFormMessage').textContent,/offline/);assert.equal(c.el('carDialog').open,true);c.close();
 const expense=await page('car.html','car.js',{categories,accounts,car_installments:[]},'openExpense');
 expense.api.openExpense();expense.el('carExpenseAmount').value='500';expense.state.failAfterWrite=true;
 await expense.el('carExpenseForm').onsubmit({preventDefault(){}});
 assert.equal(expense.state.writes.length,1);
 assert.match(expense.el('carMessage').textContent,/บันทึกสำเร็จแล้ว/);
 assert.equal(expense.el('carApp').classList.contains('hidden'),true);
 assert.equal(expense.el('carExpenseDialog').open,false);expense.close();

 // Freeze form controls until save completes, including Escape/cancel.
 const pending=await page('index.html','app.js',{categories,accounts,transactions:[],budgets:[{id:'zero',user_id:'user',name:'zero',monthly_limit:0,category_names:[],is_active:true}]},'currentPushSubscription');
 pending.w.openEntity('budget','zero');assert.equal(pending.el('entityFields').querySelector('[name=monthly_limit]').value,'0');pending.el('entityDialog').close();
 let finishWrite;pending.state.writeGate=new Promise(r=>finishWrite=r);
 pending.w.openTx();pending.el('txDesc').value='test';pending.el('txAmount').value='1';pending.el('txCategory').value='cat';
 const save=pending.el('txForm').onsubmit({preventDefault(){},currentTarget:pending.el('txForm')});
 assert.equal(pending.el('txDesc').disabled,true);
 const cancel=new pending.w.Event('cancel',{cancelable:true});pending.el('txDialog').dispatchEvent(cancel);assert.equal(cancel.defaultPrevented,true);
 pending.w.quickAdd('กาแฟ');assert.equal(pending.el('txDesc').value,'test');
 finishWrite();await save;assert.equal(pending.el('txDesc').disabled,false);
 pending.state.signOutError={message:'network failed'};await pending.el('logout').onclick();
 assert.equal(pending.el('app').classList.contains('hidden'),false);assert.match(pending.el('appToast').textContent,/ออกจากระบบไม่สำเร็จ/);
 // No service-worker registration must return promptly instead of waiting forever.
 Object.defineProperty(pending.w.navigator,'serviceWorker',{value:{getRegistration:async()=>undefined,ready:new Promise(()=>{})},configurable:true});pending.w.PushManager=function(){};
 assert.equal(await pending.api.currentPushSubscription(),null);pending.close();
 // A request started before an editor opens must not replace its selectors.
 const raceData={categories:[...categories],accounts,transactions};
 const race=await page('index.html','app.js',raceData,'loadAll,clearSessionUI,refreshCoordinator,getTransactionCount:()=>transactions.length');
 let finishRead;race.state.readGate=new Promise(r=>finishRead=r);raceData.categories=[];
 const loading=race.api.loadAll();race.w.openTx();race.el('txCategory').value='cat';finishRead();await loading;
 assert.equal(race.el('txCategory').value,'cat');assert.equal(race.api.refreshCoordinator.pending,true);
 race.el('txDialog').close();race.state.readGate=null;await race.api.loadAll();
 assert.equal(race.el('txCategory').value,'');
 // A sign-out invalidates requests already in flight.
 race.state.readGate=new Promise(r=>finishRead=r);const oldRequest=race.api.loadAll();race.api.clearSessionUI();finishRead();await oldRequest;
 assert.equal(race.api.getTransactionCount(),0);assert.equal(race.el('app').classList.contains('hidden'),true);race.close();
 console.log('PASS deep regressions: save locks, zero budget, logout failure, push readiness and stale request guards');
 console.log('PASS DOM fixtures: full paginated dashboard, XSS escaping, category/account retention, transaction edit status/source, debt save with blank due date, load failure retains data, salary category/reset/save, empty car schedule and visible modal errors');
})().catch(e=>{console.error(e);process.exit(1)});
