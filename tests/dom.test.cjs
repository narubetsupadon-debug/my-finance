const {JSDOM}=require('jsdom');
const fs=require('fs'),assert=require('node:assert/strict');
const root=require('node:path').join(__dirname,'../');
const core=fs.readFileSync(root+'finance-core.js','utf8').replaceAll('export ','').replace(/^import .*$/gm,'');
const appStorage=fs.readFileSync(root+'app-storage.js','utf8').replaceAll('export ','').replace(/^import .*$/gm,'');
const appData=fs.readFileSync(root+'app-data.js','utf8').replaceAll('export ','').replace(/^import .*$/gm,'');
const appSummary=fs.readFileSync(root+'app-summary.js','utf8').replaceAll('export ','').replace(/^import .*$/gm,'');
const expenseAnalysis=fs.readFileSync(root+'expense-analysis.js','utf8').replaceAll('export ','').replace(/^import .*$/gm,'');
const appDashboard=fs.readFileSync(root+'app-dashboard.js','utf8').replaceAll('export ','').replace(/^import .*$/gm,'');
const appTransactions=fs.readFileSync(root+'app-transactions.js','utf8').replaceAll('export ','').replace(/^import .*$/gm,'');
const appPlanning=fs.readFileSync(root+'app-planning.js','utf8').replaceAll('export ','').replace(/^import .*$/gm,'');
const appSafety=fs.readFileSync(root+'app-safety.js','utf8').replaceAll('export ','').replace(/^import .*$/gm,'');
const backupCore=fs.readFileSync(root+'finance-backup.js','utf8').replaceAll('export ','').replace(/^import .*$/gm,'');
const rentCore=fs.readFileSync(root+'rent-core.js','utf8').replaceAll('export ','').replace(/^import .*$/gm,'');
const totalDetails=fs.readFileSync(root+'total-details.js','utf8').replaceAll('export ','');
const payslip=fs.readFileSync(root+'salary-payslip.js','utf8').replaceAll('export ','').replace(/^import .*$/gm,'');
function dbMock(data,options={}){
 const state={fail:!!options.fail,writes:[],rpcs:[]};
 const db={auth:{getSession:async()=>({data:{session:options.signedOut?null:{user:{id:'user',email:'test@example.invalid'}}}}),signInWithPassword:async()=>({data:{user:{id:'user',email:'test@example.invalid'}},error:null}),getUser:async()=>({data:{user:{id:'user',email:'test@example.invalid'}}}),onAuthStateChange:callback=>{state.authChange=callback;return {data:{subscription:{unsubscribe(){}}}}},signOut:async()=>({error:state.signOutError||null})},channel:()=>({on(){return this},subscribe(){return this}}),removeChannel(){}};
 db.rpc=async(name,args)=>{state.rpcs.push({name,args});return state.fail?{error:{message:'offline'}}:{data:name==='export_finance_backup'?state.backupPayload:name==='finance_health_check'?(state.healthCounts||Object.fromEntries(['duplicateGroups','orphanCar','orphanSalary','orphanInstallments','orphanRent','mismatchCar','mismatchSalary','mismatchInstallments','mismatchRent','brokenSourceLinks','invalidDimensions','billDuplicateGroups','orphanBills'].map(k=>[k,0]))):'rpc-saved',error:null};};
 db.from=table=>{
  let rows=[...(data[table]||[])],write=null,writingUpdate=false;
  const q={select(){return q},order(){return q},limit(n){rows=rows.slice(0,n);return q},eq(k,v){rows=rows.filter(r=>r[k]===v);return q},neq(k,v){rows=rows.filter(r=>r[k]!==v);return q},not(k,op,v){if(op==='is'&&v===null)rows=rows.filter(r=>r[k]!==null&&r[k]!==undefined);return q},
  insert(row){writingUpdate=false;write=row;state.writes.push({table,row});return q},update(row){writingUpdate=true;write=row;state.writes.push({table,row});return q},
  single:async()=>{if(state.writeGate)await state.writeGate;if(state.writeError)return {error:state.writeError};if(state.fail)return {error:{message:'offline'}};if(state.failAfterWrite)state.fail=true;if(state.loseResponse){state.loseResponse=false;data[table]=[...(data[table]||[]),{...write,id:write.id||'saved'}];return {error:{message:'response lost'}}}if(state.persistWrites){data[table]??=[];if(writingUpdate){for(const r of rows)Object.assign(r,write);return {data:{id:rows[0]?.id}};}data[table].push({...write});return {data:{id:write.id}};}return {data:{id:'saved'}}},
  range:async(a,b)=>{if(state.readGate)await state.readGate;return state.fail?{error:{message:'offline'}}:{data:rows.slice(a,b+1)}},
  then(resolve,reject){return Promise.resolve(state.fail?{error:{message:'offline'}}:{data:rows}).then(resolve,reject)}
  };return q;
 };
 return {db,state};
}
async function page(html,js,data,expose,storage={},options={}){
 const dom=new JSDOM(fs.readFileSync(root+html,'utf8'),{url:'https://finance.test/',runScripts:'outside-only'});
 const w=dom.window,{db,state}=dbMock(data,options);w.createClient=()=>db;w.alerts=[];w.alert=x=>w.alerts.push(x);w.confirm=()=>true;w.scrollTo=()=>{};w.setInterval=()=>0;
 for(const [key,value] of Object.entries(storage))w.localStorage.setItem(key,value);
 w.HTMLElement.prototype.scrollIntoView=function(){};w.requestAnimationFrame=cb=>{cb();return 1};w.cancelAnimationFrame=()=>{};
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false};
 let code=fs.readFileSync(root+js,'utf8').replace(/^import .*$/gm,'');
 if(js==='salary.js')code=code.replace('document,canRead:', 'document,readPdf:async()=>window.mockPayslipDraft,canRead:');
 const api=await w.eval('(async()=>{'+core+'\n'+appStorage+'\n'+appData+'\n'+expenseAnalysis+'\n+totalDetails+'\n'+appSummary+'\n'+appDashboard+'\n'+appTransactions+'\n'+appPlanning+'\n'+appSafety+'\n'+payslip+'\n'+rentCore+'\n'+backupCore+'\n'+code+'\nreturn {'+expose+'};})()');
 return {w,api,state,close:()=>w.close(),el:id=>w.document.getElementById(id)};
}
(async()=>{

 // Logos persist independently of names, while amounts and existing edit actions remain intact.
 const walletData={categories:[],accounts:[],transactions:[],debts:[
  {id:'logo1',user_id:'user',name:'KBank Credit Card',debt_type:'credit_card',original_amount:10000,outstanding_amount:900,installment_amount:50,due_day:25,is_active:true},
  {id:'logo2',user_id:'user',name:'Shopee SEasyCash',debt_type:'loan',original_amount:30000,outstanding_amount:20000,installment_amount:1500,is_active:true},
  {id:'logo3',user_id:'user',name:'<img src=x onerror=alert(1)>',debt_type:'loan',outstanding_amount:999999,is_active:false}
 ]};
 const walletPage=await page('index.html','app.js',walletData,'loadAll');walletPage.state.persistWrites=true;
 assert.equal(walletPage.el('debtList').querySelectorAll('.wallet-grid>.wallet-card').length,3);
 assert.equal(walletPage.el('debtList').querySelector('.wallet-overview').textContent.includes('999,999'),false);
 assert.equal(walletPage.el('debtList').querySelectorAll('h3 img').length,0);
 assert.equal(walletPage.el('debtList').querySelector('[data-brand=kbank] img').getAttribute('src'),'./preview/logos/kbank.png');
 walletPage.w.openEntity('debt','logo1');
 let logoChoice=walletPage.el('entityFields').querySelector('[name=logo_key]');assert.equal(logoChoice.value,'');
 logoChoice.value='ttb';logoChoice.dispatchEvent(new walletPage.w.Event('change'));
 assert.ok(walletPage.el('entityFields').querySelector('[data-debt-logo-preview] [data-brand=ttb]'));
 await walletPage.el('entityForm').onsubmit({preventDefault(){},currentTarget:walletPage.el('entityForm')});
 assert.equal(walletPage.state.writes.at(-1).row.logo_key,'ttb');assert.equal(walletPage.state.writes.at(-1).row.outstanding_amount,900);
 assert.ok(walletPage.el('debtList').querySelector('[data-brand=ttb]'));
 walletPage.w.openEntity('debt','logo1');logoChoice=walletPage.el('entityFields').querySelector('[name=logo_key]');assert.equal(logoChoice.value,'ttb');
 logoChoice.value='none';logoChoice.dispatchEvent(new walletPage.w.Event('change'));assert.equal(walletPage.el('entityFields').querySelector('[data-debt-logo-preview] img'),null);
 await walletPage.el('entityForm').onsubmit({preventDefault(){},currentTarget:walletPage.el('entityForm')});assert.equal(walletPage.state.writes.at(-1).row.logo_key,'none');
 walletPage.w.openEntity('debt','logo1');logoChoice=walletPage.el('entityFields').querySelector('[name=logo_key]');logoChoice.value='';
 await walletPage.el('entityForm').onsubmit({preventDefault(){},currentTarget:walletPage.el('entityForm')});assert.equal(walletPage.state.writes.at(-1).row.logo_key,null);
 const logoImage=walletPage.el('debtList').querySelector('[data-brand=kbank] img');logoImage.dispatchEvent(new walletPage.w.Event('error'));
 assert.equal(walletPage.el('debtList').querySelector('[data-brand=kbank] img'),null);
 walletPage.w.openEntity('debt');const newName=walletPage.el('entityFields').querySelector('[name=name]');newName.value='Lazada PayLater';newName.dispatchEvent(new walletPage.w.Event('input'));
 assert.ok(walletPage.el('entityFields').querySelector('[data-brand=lazada]'));walletPage.el('entityDialog').close();walletPage.close();
 console.log('PASS wallet: separate balances, inactive exclusion, escaped names, provider override save/reopen, generic and auto choices, name detection and broken image fallback');

 const day=new Date().toISOString().slice(0,10);
 const categories=[{id:'cat',user_id:'user',name:'อาหาร',type:'expense',icon:'<img src=x onerror=alert(1)>'},{id:'coffee',user_id:'user',name:'กาแฟ',type:'expense',icon:'☕'},{id:'utilities',user_id:'user',name:'บิล/สาธารณูปโภค',type:'expense',icon:'🧾'},{id:'inc',user_id:'user',name:'เงินเดือน',type:'income'}];
 const accounts=[{id:'acc',user_id:'user',name:'bank',is_active:true}];
 // Combined filters, scoped totals, linked history and draft cancellation are user-facing behavior.
 const menuData={categories,accounts:[{...accounts[0],account_number:'0012345678'}],transactions:[
  {id:'food-paid',user_id:'user',type:'expense',status:'paid',amount:35,description:'food paid',transaction_date:day,category_id:'cat',account_id:'acc',categories:categories[0]},
  {id:'food-pending',user_id:'user',type:'expense',status:'pending',amount:70,description:'food pending',transaction_date:day,category_id:'cat',account_id:null,categories:categories[0]},
  {id:'food-cancelled',user_id:'user',type:'expense',status:'cancelled',amount:999,description:'food cancelled',transaction_date:day,category_id:'cat',account_id:'acc',categories:categories[0]},
  {id:'bill-paid',user_id:'user',type:'expense',status:'paid',amount:50,description:'bill fixture',transaction_date:day,category_id:'utilities',account_id:'acc',source:'bill_payment:paid-bill',categories:categories[2]}
 ],budgets:[{id:'food-budget',user_id:'user',name:'food fixture',monthly_limit:100,is_active:true,category_names:['อาหาร']}],bills:[
  {id:'paid-bill',user_id:'user',name:'paid fixture',is_active:true,frequency:'monthly',amount:50,due_day:1},
  {id:'due-bill',user_id:'user',name:'due fixture',is_active:true,frequency:'monthly',amount:50,due_day:1}
 ]};
 const menus=await page('index.html','app.js',menuData,'');
 menus.el('txFilterAccount').value='acc';menus.el('txFilterStatus').value='paid';menus.el('txFilterStatus').onchange();assert.equal(menus.el('txCount').textContent,'2 รายการ');assert.doesNotMatch(menus.el('txList').textContent,/food pending|food cancelled/);
 menus.el('txFilterAccount').value='__none__';menus.el('txFilterStatus').value='pending';menus.el('txFilterStatus').onchange();assert.equal(menus.el('txCount').textContent,'1 รายการ');assert.match(menus.el('txList').textContent,/food pending/);menus.el('txResetFilters').click();assert.equal(menus.el('txCount').textContent,'4 รายการ');
 menus.el('summaryStatus').value='paid';menus.el('summaryStatus').onchange();assert.match(menus.el('sumExpense').textContent,/85\.00/);menus.el('sumExpense').click();assert.doesNotMatch(menus.el('insightDetailBody').textContent,/food pending|food cancelled/);menus.el('insightDetailDialog').close();
 menus.el('budgetList').querySelector('[data-budget-history]').click();assert.match(menus.el('insightDetailBody').textContent,/food paid/);assert.match(menus.el('insightDetailBody').textContent,/food pending/);assert.doesNotMatch(menus.el('insightDetailBody').textContent,/food cancelled|bill fixture/);assert.match(menus.el('budgetList').textContent,/เกินงบ/);menus.el('insightDetailDialog').close();
 assert.equal(menus.el('billList').querySelector('[data-bill-history]').dataset.billHistory,'due-bill');menus.el('billList').querySelector('[data-bill-history="paid-bill"]').click();assert.match(menus.el('insightDetailBody').textContent,/bill fixture/);assert.doesNotMatch(menus.el('insightDetailBody').textContent,/food paid/);menus.el('insightDetailDialog').close();
 assert.match(menus.el('expenseCats').textContent,/ใช้ใน 3 รายการ/);assert.doesNotMatch(menus.el('accountList').textContent,/0012345678/);assert.match(menus.el('accountList').textContent,/•••• 5678/);
 let prompts=0;menus.w.confirm=()=>{prompts++;return false;};menus.w.openTx();menus.w.requestCloseTx();assert.equal(menus.el('txDialog').open,false);assert.equal(prompts,0);
 menus.w.openTx();menus.el('txAmount').value='45';menus.el('txDesc').value='keep this draft';menus.w.requestCloseTx();assert.equal(menus.el('txDialog').open,true);assert.equal(menus.el('txDesc').value,'keep this draft');assert.equal(prompts,1);
 const escape=new menus.w.Event('cancel',{cancelable:true});menus.el('txDialog').dispatchEvent(escape);assert.equal(escape.defaultPrevented,true);assert.equal(menus.el('txDialog').open,true);menus.w.confirm=()=>true;menus.w.requestCloseTx();assert.equal(menus.el('txDialog').open,false);assert.equal(menus.state.writes.length,0);menus.close();
 console.log('PASS menu improvements: combined filters, paid-only drilldown, budget and bill identity, due order, masked accounts, category counts and draft-close cancellation');
 // First login must release the auth controls even when the initial data load fails.
 const firstLogin=await page('index.html','app.js',{categories,accounts,transactions:[]},'loadAll',{}, {signedOut:true,fail:true});
 assert.equal(firstLogin.el('authScreen').classList.contains('hidden'),false);
 firstLogin.el('email').value='test@example.invalid';firstLogin.el('password').value='fixture-only';
 await firstLogin.el('authBtn').onclick();
 assert.equal(firstLogin.el('authBtn').disabled,false);
 assert.equal(firstLogin.el('app').classList.contains('hidden'),false);
 assert.equal(firstLogin.el('dataError').classList.contains('hidden'),false);
 firstLogin.w.document.querySelector('[data-page="summary"]').click();
 assert.equal(firstLogin.el('summaryPage').classList.contains('hidden'),false,'Initial load failure must not freeze navigation');
 firstLogin.state.fail=false;await firstLogin.api.loadAll();
 assert.equal(firstLogin.el('dataError').classList.contains('hidden'),true);
 assert.match(firstLogin.el('syncStatusText').textContent,/ซิงก์แล้ว/);
 firstLogin.close();
 console.log('PASS first-login failure recovery: auth controls unlock, navigation remains usable, retry loads data');
 const unclear=await page('index.html','app.js',{categories,accounts,transactions:[]},'');
 unclear.w.openTx();unclear.el('txDesc').value='uncertain fixture';unclear.el('txAmount').value='10';unclear.el('txCategory').value='cat';unclear.state.fail=true;
 await unclear.el('txForm').onsubmit({preventDefault(){},currentTarget:unclear.el('txForm')});
 assert.equal(unclear.el('txError').dataset.saveState,'uncertain');assert.match(unclear.el('txError').textContent,/ยังยืนยันการบันทึกไม่ได้/);
 assert.equal(unclear.el('txDialog').open,true);assert.equal(unclear.el('txAmount').value,'10');assert.equal(unclear.el('txForm').querySelector('[type=submit]').disabled,false);
 unclear.state.fail=false;await unclear.el('txForm').onsubmit({preventDefault(){},currentTarget:unclear.el('txForm')});
 assert.equal(unclear.state.writes[0].row.id,unclear.state.writes[1].row.id,'Retry must keep the same draft identity');
 assert.equal(unclear.el('appToast').dataset.saveState,'success');unclear.w.openTx();assert.equal(unclear.el('appToast').classList.contains('hidden'),true,'Old success must not describe a new draft');unclear.close();
 const rejected=await page('index.html','app.js',{categories,accounts,transactions:[]},'');
 rejected.w.openTx();rejected.el('txDesc').value='rejected fixture';rejected.el('txAmount').value='10';rejected.el('txCategory').value='cat';rejected.state.writeError={code:'23514',message:'invalid amount'};
 await rejected.el('txForm').onsubmit({preventDefault(){},currentTarget:rejected.el('txForm')});
 assert.equal(rejected.el('txError').dataset.saveState,'failed');assert.match(rejected.el('txError').textContent,/บันทึกไม่สำเร็จ/);assert.equal(rejected.el('txDialog').open,true);rejected.close();
 console.log('PASS save states: uncertain drafts remain editable, retry keeps ID, success is distinct and explicit rejection is failed');
 const editData={categories,accounts,transactions:[]};
 const immediateEdit=await page('index.html','app.js',editData,'loadAll');immediateEdit.state.persistWrites=true;
 immediateEdit.w.openTx();immediateEdit.el('txDesc').value='saved fixture';immediateEdit.el('txAmount').value='45';immediateEdit.el('txCategory').value='cat';
 await immediateEdit.el('txForm').onsubmit({preventDefault(){},currentTarget:immediateEdit.el('txForm')});
 const savedId=editData.transactions[0].id;
 assert.equal(immediateEdit.el('appToast').querySelector('.toast-action').textContent,'แก้ไขรายการนี้');
 editData.transactions.push({id:'another-record',user_id:'user',transaction_date:day,type:'expense',status:'paid',description:'another fixture',amount:100,category_id:'cat',source:'web'});await immediateEdit.api.loadAll();
 immediateEdit.el('appToast').querySelector('.toast-action').click();
 assert.equal(immediateEdit.el('txDialog').open,true);assert.equal(immediateEdit.el('txDialogTitle').textContent,'แก้ไขรายการ');assert.equal(immediateEdit.el('txAmount').value,'45');assert.equal(immediateEdit.el('txDesc').value,'saved fixture');
 immediateEdit.el('txAmount').value='55';await immediateEdit.el('txForm').onsubmit({preventDefault(){},currentTarget:immediateEdit.el('txForm')});
 assert.equal(editData.transactions.length,2,'Edit must update the saved row rather than inserting another');assert.equal(editData.transactions.find(x=>x.id===savedId).amount,55);assert.equal(editData.transactions.find(x=>x.id==='another-record').amount,100);
 editData.transactions.splice(0);await immediateEdit.api.loadAll();immediateEdit.el('appToast').querySelector('.toast-action').click();assert.equal(immediateEdit.el('txDialog').open,false);assert.equal(immediateEdit.el('appToast').classList.contains('hidden'),false);assert.match(immediateEdit.el('appToast').textContent,/ยังโหลดรายการนี้ไม่ได้/);immediateEdit.close();
 console.log('PASS immediate edit: exact saved identity, original fields restored, update without duplicate, missing record cannot open a blank draft');



 // Recent selections come only from successful new saves, remain separate by
 // type/owner, survive reload, and never alter an existing transaction.
 const recentKey='finance-recent-selection-v1:user';
 const recentData={categories,accounts:[...accounts,{id:'cash',user_id:'user',name:'cash',is_active:true}],transactions:[]};
 const recent=await page('index.html','app.js',recentData,'loadAll,setOwner:id=>{user={id}}');
 const submitRecent=()=>recent.el('txForm').onsubmit({preventDefault(){},currentTarget:recent.el('txForm')});
 recent.w.openTx();recent.el('txCategory').value='coffee';recent.el('txAccount').value='cash';recent.el('txDialog').close();
 recent.w.openTx();assert.equal(recent.el('txCategory').value,'');assert.equal(recent.w.localStorage.getItem(recentKey),null);
 recent.el('txDesc').value='new coffee';recent.el('txAmount').value='65';recent.el('txCategory').value='coffee';recent.el('txAccount').value='cash';await submitRecent();
 recent.w.openTx();assert.equal(recent.el('txCategory').value,'coffee');assert.equal(recent.el('txAccount').value,'cash');assert.equal(recent.el('txAmount').value,'');assert.equal(recent.el('txDesc').value,'');
 recent.w.document.querySelector('[data-tx-type="income"]').click();assert.equal(recent.el('txCategory').value,'');assert.equal(recent.el('txAccount').value,'');
 recent.el('txCategory').value='inc';recent.el('txAccount').value='acc';recent.el('txDesc').value='income';recent.el('txAmount').value='100';await submitRecent();
 recent.w.openTx();assert.equal(recent.el('txCategory').value,'coffee');recent.w.document.querySelector('[data-tx-type="income"]').click();assert.equal(recent.el('txCategory').value,'inc');assert.equal(recent.el('txAccount').value,'acc');
 recent.w.document.querySelector('[data-tx-type="expense"]').click();recent.el('txCategory').value='cat';recent.el('txDesc').value='failed';recent.el('txAmount').value='10';recent.state.fail=true;await submitRecent();recent.state.fail=false;recent.el('txDialog').close();recent.w.openTx();assert.equal(recent.el('txCategory').value,'coffee');
 recentData.transactions.push({id:'old',user_id:'user',type:'expense',status:'paid',description:'old',amount:5,transaction_date:day,category_id:'cat',account_id:'acc'});recent.el('txDialog').close();await recent.api.loadAll();recent.w.openTx('old');assert.equal(recent.el('txCategory').value,'cat');assert.equal(recent.el('txAccount').value,'acc');await submitRecent();recent.w.openTx();assert.equal(recent.el('txCategory').value,'coffee');
 const savedSelections=recent.w.localStorage.getItem(recentKey);recent.el('txDialog').close();recent.api.setOwner('another-owner');recent.w.openTx();assert.equal(recent.el('txCategory').value,'');assert.equal(recent.el('txAccount').value,'');recent.close();
 const restored=await page('index.html','app.js',recentData,'loadAll',{[recentKey]:savedSelections});restored.w.openTx();assert.equal(restored.el('txCategory').value,'coffee');assert.equal(restored.el('txAccount').value,'cash');restored.el('txDialog').close();
 recentData.accounts[1].is_active=false;recentData.categories=categories.filter(c=>c.id!=='coffee');await restored.api.loadAll();restored.w.openTx();assert.equal(restored.el('txCategory').value,'');assert.equal(restored.el('txAccount').value,'');restored.close();
 const corrupt=await page('index.html','app.js',{categories,accounts,transactions:[]},'',{[recentKey]:'{broken json'});corrupt.w.openTx();assert.equal(corrupt.el('txCategory').value,'');corrupt.w.Storage.prototype.setItem=()=>{throw Error('storage disabled')};corrupt.el('txCategory').value='cat';corrupt.el('txAmount').value='10';corrupt.el('txDesc').value='storage unavailable';await corrupt.el('txForm').onsubmit({preventDefault(){},currentTarget:corrupt.el('txForm')});assert.equal(corrupt.el('txDialog').open,false);assert.equal(corrupt.state.writes.length,1);corrupt.close();
 const lostResponse=await page('index.html','app.js',{categories,accounts,transactions:[]},'');lostResponse.w.openTx();lostResponse.el('txDesc').value='confirmed after lost reply';lostResponse.el('txAmount').value='12';lostResponse.el('txCategory').value='cat';lostResponse.state.loseResponse=true;await lostResponse.el('txForm').onsubmit({preventDefault(){},currentTarget:lostResponse.el('txForm')});assert.equal(lostResponse.el('txDialog').open,false);assert.equal(lostResponse.state.writes.length,1);assert.equal(lostResponse.el('txCount').textContent,'1 รายการ');lostResponse.close();
 console.log('PASS recent selections: successful saves, cancellation/failure, income separation, reload, owner isolation, edits, removed categories/inactive accounts and unavailable storage');
 // Account numbers retain leading zeros and strip pasted separators before saving.
 const accountPage=await page('index.html','app.js',{categories,accounts,transactions:[]},'');
 for(const [input,expected] of [['001-234 567x','001234567'],['0000123456','0000123456'],['',null]]){
  accountPage.w.openEntity('account');
  const form=accountPage.el('entityForm');form.querySelector('[name="name"]').value='Fixture account';
  form.querySelector('[name="account_number"]').value=input;
  await form.onsubmit({preventDefault(){},currentTarget:form});
  assert.equal(accountPage.state.writes.at(-1).row.account_number,expected);
 }
 accountPage.close();
 console.log('PASS account save: pasted separators removed, leading zeros preserved, empty number remains null');
 const deferred=await page('index.html','app.js',{categories,accounts,transactions:[]},'scheduleLoad,get lastSync(){return lastSyncAt}');
 let hidden=true;Object.defineProperty(deferred.w.document,'hidden',{configurable:true,get:()=>hidden});
 const lastSync=deferred.api.lastSync;deferred.api.scheduleLoad();await new Promise(r=>setTimeout(r,400));assert.equal(deferred.api.lastSync,lastSync,'Realtime refresh waits while app is hidden');
 hidden=false;deferred.w.document.dispatchEvent(new deferred.w.Event('visibilitychange'));await new Promise(r=>setTimeout(r,450));assert.notEqual(deferred.api.lastSync,lastSync,'Returning to the app flushes deferred refresh');deferred.close();
 console.log('PASS background efficiency: realtime refresh deferred while hidden and resumed on return');
 const transactions=Array.from({length:1201},(_,i)=>({id:'t'+i,user_id:'user',type:'expense',status:'paid',source:'import_r3_v2',transaction_date:day,description:'food',amount:1,category_id:'cat',account_id:'acc',categories:categories[0],accounts:accounts[0]}));
 transactions[0].status='cancelled';
 const p=await page('index.html','app.js',{categories,accounts,transactions,car_expenses:[{id:'ce1',user_id:'user',transaction_id:'t1'}]},'loadAll,fillTxSelectors,checkDailyRollover,refreshHealthCheck');
 assert.ok(p.el('settingsLogout'));assert.equal(p.el('authSplash').classList.contains('hidden'),true);assert.equal(p.el('authScreen').classList.contains('hidden'),true);assert.equal(p.el('app').classList.contains('hidden'),false);assert.equal(p.el('txCount').textContent,'1201 รายการ');assert.ok(p.el('pushDeviceSetting'));assert.match(p.el('syncStatusText').textContent,/ซิงก์แล้ว/);
 assert.equal(p.el('txList').querySelector('img'),null);
 assert.equal(p.el('recentList').querySelectorAll('.transaction-row').length,5);
 assert.equal(p.el('summaryPage').querySelectorAll('canvas').length,1);
 assert.equal(p.el('summaryMore'),null);
 assert.match(p.el('txList').querySelector('.status-cancelled').textContent,/ยกเลิก/);
 assert.equal(p.el('txFilters').open,false,'secondary filters start collapsed');
 assert.equal(p.el('txFilterMonth').tagName,'SELECT','month selector must not rely on mobile native month inputs');
 assert.equal(p.el('txList').querySelectorAll('.tx-day-group').length,1);
 assert.equal(p.el('txList').querySelectorAll('.tx-row-menu').length,100);
 assert.equal(p.el('txList').querySelector('.tx-row-menu').open,false);
 p.el('txSearch').value='not-a-real-description';p.el('txSearch').oninput();await new Promise(r=>setTimeout(r,180));assert.match(p.el('txList').textContent,/ไม่พบรายการที่ตรงกัน/);assert.equal(p.el('txResetFilters').hidden,false);
 p.el('txResetFilters').click();assert.equal(p.el('txCount').textContent,'1201 รายการ');assert.equal(p.el('txResetFilters').hidden,true);
 p.el('txFilterType').value='income';p.el('txFilterType').onchange();assert.equal(p.el('txFilterBadge').textContent,'1');assert.equal(p.el('txFilterBadge').hidden,false);p.el('txResetFilters').click();
 p.el('txFilterMonth').value=day.slice(0,7);p.el('txFilterMonth').onchange();assert.equal(p.el('txCount').textContent,'1201 รายการ');assert.equal(p.el('txFilterMonth').value,day.slice(0,7));p.el('txResetFilters').click();
 p.el('viewToday').click();assert.equal(p.el('insightDetailDialog').open,true);p.el('insightDetailDialog').close();
 for(const id of ['incomeTotal','expenseTotal','balanceTotal','sumIncome','sumExpense','sumBalance','sumRecurring','sumRent','budgetCard']){p.el(id).click();assert.equal(p.el('insightDetailDialog').open,true,id+' opens contributing records');assert.match(p.el('insightDetailNote').textContent,/รอดำเนินการ/);p.el('insightDetailDialog').close();}
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
 p.w.quickAdd('อาหาร');assert.equal(p.el('txType').value,'expense');assert.equal(p.el('txDesc').value,'','Quick category keeps the description ready for the actual purchase');assert.equal(p.el('txCategory').value,'cat');
 p.w.quickAdd('กาแฟ');assert.equal(p.el('txCategory').value,'coffee');
 // linked car transaction must route to car management instead of opening the generic editor
 const linkedEdit=p.w.document.querySelector('[data-edit="tx"][data-id="t1"]');if(linkedEdit)linkedEdit.click();
 assert.equal(p.el('txAmount').value,'');p.el('txDialog').close();
 p.el('txFilterCategory').value='cat';p.w.openTx('t0');p.el('txAccount').value='acc';await p.api.loadAll();
 assert.equal(p.el('txFilterCategory').value,'cat');assert.equal(p.el('txAccount').value,'acc');
 await p.el('txForm').onsubmit({preventDefault(){},currentTarget:p.el('txForm')});
 assert.equal(p.state.writes.at(-1).row.status,'cancelled');assert.equal(p.state.writes.at(-1).row.source,'import_r3_v2');
 assert.match(p.el('appToast').textContent,/รายการยกเลิก/);p.el('appToast').querySelector('.toast-action').click();assert.equal(p.el('transactionsPage').classList.contains('hidden'),false);assert.equal(p.el('txDialog').open,true);assert.equal(p.el('txDesc').value,'food');p.el('txDialog').close();
 p.state.failAfterWrite=true;p.w.openTx('t0');await p.el('txForm').onsubmit({preventDefault(){},currentTarget:p.el('txForm')});assert.equal(p.el('txDialog').open,false);assert.match(p.el('appToast').textContent,/ไม่ต้องบันทึกซ้ำ/);assert.equal(p.el('appToast').querySelector('.toast-action').textContent,'โหลดใหม่');assert.equal(p.el('txError').classList.contains('hidden'),true);p.state.failAfterWrite=false;p.state.fail=false;p.el('appToast').querySelector('.toast-action').click();await new Promise(r=>setTimeout(r,0));assert.equal(p.el('appToast').querySelector('.toast-action').textContent,'แก้ไขรายการนี้');
 p.w.openEntity('debt');p.el('entityFields').querySelector('[name=name]').value='card';
 await p.el('entityForm').onsubmit({preventDefault(){},currentTarget:p.el('entityForm')});
 assert.equal(p.state.writes.at(-1).table,'debts');assert.equal(p.state.writes.at(-1).row.due_day,null);assert.equal(p.w.alerts.length,0);
 await p.api.refreshHealthCheck();assert.match(p.el('healthSync').textContent,/ปกติ/);assert.match(p.el('healthRent').textContent,/ปกติ/);
 p.state.healthCounts=Object.fromEntries(['duplicateGroups','orphanCar','orphanSalary','orphanInstallments','orphanRent','mismatchCar','mismatchSalary','mismatchInstallments','mismatchRent','brokenSourceLinks','invalidDimensions','billDuplicateGroups','orphanBills'].map(k=>[k,0]));p.state.healthCounts.mismatchRent=1;await p.api.refreshHealthCheck();assert.match(p.el('healthRent').textContent,/ต้องตรวจ 1/);delete p.state.healthCounts;
 p.state.fail=true;await p.api.refreshHealthCheck();assert.match(p.el('healthSync').textContent,/ไม่สำเร็จ/);assert.match(p.el('healthRent').textContent,/ยังตรวจไม่ได้/);
 await p.api.loadAll();assert.equal(p.el('dataError').classList.contains('hidden'),false);assert.equal(p.el('txCount').textContent,'1201 รายการ');
 // Opening the app after midnight must refresh date-dependent totals.
 const oldLabel=p.el('todayLabel').textContent,OriginalDate=p.w.Date;
 const tomorrow=Date.now()+86400000;
 p.w.Date=class extends OriginalDate{constructor(...args){super(...(args.length?args:[tomorrow]))}};
 p.api.checkDailyRollover();
 assert.notEqual(p.el('todayLabel').textContent,oldLabel);
 assert.equal(p.el('todayCount').textContent,'0 รายการ');
 // Summary range shortcuts must drive the whole dashboard.
 assert.match(p.el('summaryPeriodText').textContent,/กำลังดู/);assert.equal(p.el('summaryPage').querySelectorAll('canvas').length,1);
 p.w.document.querySelector('[data-summary-range="6m"]').click();assert.equal(p.el('summaryPage').querySelectorAll('canvas').length,1);assert.match(p.el('summaryPeriodText').textContent,/6 เดือนล่าสุด/);
 p.w.document.querySelector('[data-summary-range="custom"]').click();assert.equal(p.el('summaryCustomFilters').classList.contains('hidden'),false);
 p.el('summaryYear').value=day.slice(0,4);p.el('summaryMonth').value=day.slice(5,7);p.el('summaryMonth').onchange();assert.equal(p.el('summaryPage').querySelectorAll('canvas').length,1);
 p.el('summaryMonth').value='all';p.el('summaryMonth').onchange();assert.equal(p.el('summaryPage').querySelectorAll('canvas').length,1);
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
 const pendingBillsPage=await page('index.html','app.js',{categories,accounts,transactions:[{...paidTx,status:'pending'}],bills:[bill]},'loadAll');assert.match(pendingBillsPage.el('billList').textContent,/รอจ่าย/);assert.equal(pendingBillsPage.el('billList').querySelector('[data-pay-bill]'),null);assert.match(pendingBillsPage.el('homeBillStatus').textContent,/รอจ่าย 1/);assert.equal(pendingBillsPage.el('summaryMore'),null);pendingBillsPage.el('homeBillStatus').click();assert.equal(pendingBillsPage.el('billsPage').classList.contains('hidden'),false);pendingBillsPage.close();
 const s=await page('salary.html','salary.js',{categories,accounts,transactions:[]},'reset');
 assert.equal(s.el('salaryEditor').open,false);s.el('newSalary').click();assert.equal(s.el('salaryEditor').open,true);assert.equal(s.el('salarySavedLink').hidden,true);assert.equal(s.el('salaryOtherDetails').open,false);assert.equal(s.el('salaryDeductionDetails').open,false);
 assert.equal(s.el('bonus').closest('details').id,'salaryOtherDetails');assert.equal(s.el('allowance').closest('details').id,'salaryOtherDetails');assert.notEqual(s.el('bonus'),s.el('allowance'));
 s.el('salaryExpandAll').click();for(const id of ['salaryOtherDetails','salaryDeductionDetails','salaryAdvancedDetails'])assert.equal(s.el(id).open,true);
 s.el('salaryExpandAll').click();assert.equal(s.el('salaryDeductionDetails').open,false);
 s.el('tax').value='';s.el('tax').dispatchEvent(new s.w.Event('invalid',{cancelable:true}));assert.equal(s.el('salaryDeductionDetails').open,true);s.api.reset();
 s.w.mockPayslipDraft={rows:[{kind:'earning',label:'เงินเดือน',key:'base_salary',cents:200000},{kind:'earning',label:'OT',key:'overtime',cents:10000}],expected:{gross:210000,deductions:0,net:210000},month:'2026-09',paymentDate:'2026-09-30'};
 Object.defineProperty(s.el('payslipFile'),'files',{value:[{name:'mock.pdf'}]});
 await s.el('readPayslip').onclick();assert.equal(s.el('saveSalary').disabled,false);assert.equal(s.state.writes.length,0);
 s.el('applyPayslip').click();assert.equal(s.el('salaryOtherDetails').open,true);assert.equal(s.el('salaryDeductionDetails').open,true);assert.equal(s.el('base_salary').value,'2000.00');assert.equal(s.el('overtime').value,'100.00');assert.equal(s.el('salary_month').value,'2026-09');assert.equal(s.state.writes.length,0);s.api.reset();

 assert.equal(s.el('category_id').value,'inc');
 s.el('base_salary').value='1000';s.el('account_id').value='acc';
 await s.el('salaryForm').onsubmit({preventDefault(){}});
 assert.equal(s.state.writes.at(-1).row.base_salary,1000);assert.equal(s.el('category_id').value,'inc');assert.equal(s.el('salarySavedLink').hidden,false);assert.equal(s.el('salaryStep3').getAttribute('aria-current'),'step');s.el('bonus').dispatchEvent(new s.w.Event('input',{bubbles:true}));assert.equal(s.el('salarySavedLink').hidden,true);assert.equal(s.el('salaryStep2').getAttribute('aria-current'),'step');
 s.el('base_salary').value='1000';s.el('account_id').value='acc';s.state.failAfterWrite=true;
 await s.el('salaryForm').onsubmit({preventDefault(){}});assert.match(s.el('salaryMessage').textContent,/บันทึกสำเร็จแล้ว/);assert.equal(s.el('salaryApp').classList.contains('hidden'),true);s.close();
 const carQuick=await page('car.html','car.js',{categories,accounts,car_installments:[{id:'newer',user_id:'user',installment_no:2,status:'paid',due_date:day,payment_date:day,my_amount:200,scheduled_amount:400},{id:'older',user_id:'user',installment_no:1,status:'paid',due_date:'2026-01-01',payment_date:'2026-01-01',my_amount:100,scheduled_amount:200},{id:'pending',user_id:'user',installment_no:3,status:'pending',due_date:'2026-12-01',scheduled_amount:400}],car_expenses:[{id:'exp-old',user_id:'user',expense_date:'2026-01-01',expense_type:'fuel',amount:10},{id:'exp-new',user_id:'user',expense_date:day,expense_type:'fuel',amount:55}]},'');
 carQuick.el('carEditLatestInstallment').click();assert.match(carQuick.el('carTitle').textContent,/งวดที่ 2/);assert.equal(carQuick.el('carMy').value,'200');carQuick.el('carDialog').close();carQuick.el('carExpenseFilter').value='repair';carQuick.el('carExpenseFilter').onchange();carQuick.el('carEditLatestExpense').click();assert.equal(carQuick.el('carExpenseAmount').value,'55');assert.equal(carQuick.state.writes.length,0);carQuick.close();
 console.log('PASS car shortcuts: latest paid installment and exact latest expense, independent of history filters, no write on open');
 const c=await page('car.html','car.js',{categories,accounts,car_installments:[]},'open');
 assert.equal(c.el('nextNo').textContent,'ยังไม่มีตารางผ่อน');assert.equal(c.el('carSavedLink').hidden,true);assert.equal(c.el('carInstallmentDetails').open,false);assert.equal(c.el('carRows').closest('details').id,'carInstallmentDetails');c.el('carInstallmentDetails').open=true;assert.equal(c.el('carRows').isConnected,true);
 c.api.open({id:'car',installment_no:1,status:'pending'});c.state.fail=true;
 await c.el('carForm').onsubmit({preventDefault(){}});
 assert.match(c.el('carFormMessage').textContent,/ยังยืนยันการบันทึกไม่ได้/);assert.equal(c.el('carFormMessage').dataset.saveState,'uncertain');assert.equal(c.el('carDialog').open,true);c.close();
 const expense=await page('car.html','car.js',{categories,accounts,car_installments:[]},'openExpense');
 expense.api.openExpense();expense.el('carExpenseAmount').value='500';expense.state.failAfterWrite=true;
 await expense.el('carExpenseForm').onsubmit({preventDefault(){}});
 assert.equal(expense.state.writes.length,1);
 assert.match(expense.el('carMessage').textContent,/บันทึกสำเร็จแล้ว/);
 assert.equal(expense.el('carApp').classList.contains('hidden'),true);
 assert.equal(expense.el('carExpenseDialog').open,false);expense.close();

 // A confirmed save must not display stale feedback after sign-out during readback.
 const ackRace=await page('index.html','app.js',{categories,accounts,transactions:[]},'clearSessionUI');
 ackRace.w.openTx();ackRace.el('txDesc').value='save then sign out';ackRace.el('txAmount').value='1';ackRace.el('txCategory').value='cat';
 let ackRead;ackRace.state.readGate=new Promise(r=>ackRead=r);
 const ackSave=ackRace.el('txForm').onsubmit({preventDefault(){},currentTarget:ackRace.el('txForm')});
 await new Promise(r=>setTimeout(r,0));ackRace.api.clearSessionUI();ackRead();await ackSave;
 assert.equal(ackRace.el('appToast').classList.contains('hidden'),true);assert.equal(ackRace.el('appToast').textContent,'');ackRace.close();
 // Freeze form controls until save completes, including Escape/cancel.
 const pending=await page('index.html','app.js',{categories,accounts,transactions:[],budgets:[{id:'zero',user_id:'user',name:'zero',monthly_limit:0,category_names:[],is_active:true}]},'currentPushSubscription');
 pending.w.openEntity('budget','zero');assert.equal(pending.el('entityFields').querySelector('[name=monthly_limit]').value,'0');pending.el('entityDialog').close();
 let finishWrite;pending.state.writeGate=new Promise(r=>finishWrite=r);
 pending.w.openTx();pending.el('txDesc').value='test';pending.el('txAmount').value='1';pending.el('txCategory').value='cat';
 const save=pending.el('txForm').onsubmit({preventDefault(){},currentTarget:pending.el('txForm')});
 assert.equal(pending.el('txDesc').disabled,true);
 const cancel=new pending.w.Event('cancel',{cancelable:true});pending.el('txDialog').dispatchEvent(cancel);assert.equal(cancel.defaultPrevented,true);
 pending.w.quickAdd('กาแฟ');assert.equal(pending.el('txDesc').value,'test');
 let finishReadback;pending.state.readGate=new Promise(r=>finishReadback=r);
 finishWrite();await new Promise(r=>setTimeout(r,0));
 assert.equal(pending.el('txDialog').open,false);
 assert.equal(pending.el('appToast').dataset.saveState,'success');
 assert.match(pending.el('appToast').textContent,/สำเร็จ.*กำลังโหลด/,'Confirmed save must be visible before readback completes');
 assert.equal(pending.el('txDesc').disabled,true);
 finishReadback();await save;assert.equal(pending.el('txDesc').disabled,false);
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
 const rentData={categories:[{id:'rentcat',name:'ห้องเช่า',type:'expense',user_id:'user'}],accounts:[{id:'acc',name:'Bank',is_active:true,user_id:'user'}],transactions:[{id:'old',user_id:'user',type:'expense',status:'paid',source:'web',transaction_date:'2026-10-05',amount:2000,category_id:'rentcat',account_id:'acc',categories:{name:'ห้องเช่า'},description:'test'}],rent_records:[]};
 const rent=await page('rent.html','rent.js',rentData,'open');
 rent.el('rentMonth').value='2026-09';rent.el('rentFull').value='2000';rent.el('rentFull').oninput();assert.equal(rent.el('rentMy').value,'1000.00');
 rent.el('rentMy').value='800';rent.el('rentMy').oninput();rent.el('rentFull').value='2200';rent.el('rentFull').oninput();assert.equal(rent.el('rentMy').value,'800');
 rent.el('rentExisting').value='old';rent.el('rentExisting').onchange();assert.equal(rent.el('rentDate').value,'2026-10-05');assert.equal(rent.el('rentFull').value,'2000');assert.equal(rent.el('rentAccount').value,'acc');
 await rent.el('rentForm').onsubmit({preventDefault(){}});const saved=rent.state.writes.at(-1).row;assert.equal(saved.bill_month,'2026-09-01');assert.equal(saved.payment_date,'2026-10-05');assert.equal(saved.full_amount,2000);assert.equal(saved.my_amount,1000);assert.equal(saved.transaction_id,'old');assert.equal(rent.state.writes.length,1,'only bill write; database creates/links payment atomically');
 rent.api.open({id:'bill',bill_month:'2026-09-01',payment_date:'2026-10-05',full_amount:2000,my_amount:800,status:'paid',transaction_id:'old',category_id:'rentcat',account_id:'acc'});assert.equal(rent.el('rentExisting').disabled,true);assert.equal(rent.el('rentMy').value,'800');
 rent.el('rentStatus').value='pending';rent.el('rentStatus').onchange();assert.equal(rent.el('rentDate').required,false);assert.equal(rent.el('rentDate').disabled,true);await rent.el('rentForm').onsubmit({preventDefault(){}});assert.equal(rent.state.writes.at(-1).row.payment_date,null);assert.equal(rent.state.writes.at(-1).row.status,'pending');
 rentData.rent_records.push({id:'existingbill',user_id:'user',bill_month:'2026-09-01',full_amount:2000,my_amount:1000,status:'pending'});rent.close();
 const dupe=await page('rent.html','rent.js',rentData,'open');dupe.el('rentMonth').value='2026-09';dupe.el('rentFull').value='2000';dupe.el('rentMy').value='1000';await dupe.el('rentForm').onsubmit({preventDefault(){}});assert.equal(dupe.state.writes.length,0);assert.match(dupe.el('rentError').textContent,/เดือนนี้มีบิลแล้ว/);dupe.close();
 console.log('PASS rent DOM: half default, editable share, existing payment, bill month vs payment date, pending status, linked edit and duplicate-month guard');
 const menu=await page('index.html','app.js',{categories,accounts,transactions:[]},'handleNavigationRoute');
 menu.w.eval(fs.readFileSync(root+'app-nav.js','utf8'));
 // Repeated page changes must not synchronously measure page layout.
 let navigationLayouts=0;
 for(const el of menu.w.document.querySelectorAll('.page'))Object.defineProperty(el,'offsetWidth',{get(){navigationLayouts++;return 390},configurable:true});
 for(const destination of ['summary','settings','transactions','dashboard'])menu.w.document.querySelector('.navbtn[data-page="'+destination+'"]').click();
 assert.equal(navigationLayouts,0,'navigation must not force page layout for animation');
 assert.deepEqual([...menu.w.document.querySelectorAll('.mobile-app-nav button')].map(b=>b.dataset.destination),['dashboard','transactions','capture','summary','more']);
 const allSheets=menu.w.document.querySelectorAll('.app-menu-sheet'),moreSheet=allSheets[0],captureSheet=allSheets[1];
 // Guide shortcuts must open the existing UI, without writing any records.
 const guide=menu.el('appUsageGuide');guide.open=true;
 guide.querySelector('[data-guide-capture]').click();assert.equal(captureSheet.open,true);
 captureSheet.querySelector('[data-destination=expense]').click();assert.equal(menu.el('txDialog').open,true);assert.equal(menu.el('txType').value,'expense');menu.el('txDialog').close();
 for(const destination of ['bills','debts','summary','budget','transactions']){guide.querySelector('[data-page-jump="'+destination+'"]').click();assert.equal(menu.el(destination+'Page').classList.contains('hidden'),false);}
 assert.deepEqual([...guide.querySelectorAll('a')].map(a=>a.getAttribute('href')),['./salary.html','./rent.html','./car.html']);
 for(const button of guide.querySelectorAll('[data-guide-target]')){
  const target=menu.el(button.dataset.guideTarget);let scrolled=false;target.closest('.settings-card').scrollIntoView=()=>{scrolled=true};button.click();assert.equal(scrolled,true);
 }
 assert.equal(menu.state.writes.length,0);
 menu.w.document.querySelector('.navbtn[data-page=dashboard]').click();
 assert.deepEqual([...moreSheet.querySelectorAll('h3')].map(h=>h.textContent),['วางแผนเงิน','บันทึกเฉพาะเรื่อง','จัดการข้อมูล']);
 menu.w.document.querySelector('.mobile-app-nav [data-destination=capture]').click();assert.equal(captureSheet.open,true);
 captureSheet.querySelector('[data-destination=income]').click();assert.equal(captureSheet.open,false);assert.equal(menu.el('txDialog').open,true);assert.equal(menu.el('txType').value,'income');
 menu.el('txDialog').close();menu.w.document.querySelector('[data-open-capture]').click();captureSheet.querySelector('[data-destination=expense]').click();assert.equal(menu.el('txType').value,'expense');menu.el('txDialog').close();
 menu.w.history.replaceState(null,'','#capture-income');menu.api.handleNavigationRoute();assert.equal(menu.el('txDialog').open,true);assert.equal(menu.el('txType').value,'income');assert.equal(menu.w.location.hash,'#transactions');menu.el('txDialog').close();
 menu.w.document.querySelector('.mobile-app-nav [data-destination=more]').click();assert.equal(moreSheet.open,true);moreSheet.querySelector('[data-destination=budget]').click();assert.equal(moreSheet.open,false);assert.equal(menu.el('budgetPage').classList.contains('hidden'),false);assert.equal(menu.w.document.querySelector('.mobile-app-nav [data-destination=more]').classList.contains('is-active'),true);
 assert.deepEqual([...captureSheet.querySelectorAll('a,button[data-destination]')].map(b=>b.dataset.destination),['income','expense','salary','rent','car']);
 const autoNav=menu.w.document.querySelector('.mobile-app-nav');
 Object.defineProperty(menu.w,'innerWidth',{value:390,writable:true});
 Object.defineProperty(menu.w.document.documentElement,'scrollHeight',{value:3000,configurable:true});
 function scrollMenu(y){menu.w.scrollY=y;menu.w.dispatchEvent(new menu.w.Event('scroll'));}
 menu.w.document.activeElement?.blur();scrollMenu(80);assert.equal(autoNav.classList.contains('is-scroll-hidden'),true);
 scrollMenu(76);assert.equal(autoNav.classList.contains('is-scroll-hidden'),true,'minor jitter should not reveal menu');
 scrollMenu(60);assert.equal(autoNav.classList.contains('is-scroll-hidden'),false);
 scrollMenu(120);assert.equal(autoNav.classList.contains('is-scroll-hidden'),true);
 autoNav.querySelector('button').focus();assert.equal(autoNav.classList.contains('is-scroll-hidden'),false,'keyboard focus must reveal menu');
 autoNav.querySelector('button').blur();scrollMenu(180);
 menu.w.dispatchEvent(new menu.w.CustomEvent('finance:page',{detail:'dashboard'}));assert.equal(autoNav.classList.contains('is-scroll-hidden'),false);
 scrollMenu(240);scrollMenu(0);assert.equal(autoNav.classList.contains('is-scroll-hidden'),false);
 moreSheet.showModal();scrollMenu(300);assert.equal(autoNav.classList.contains('is-scroll-hidden'),false,'dialogs must keep navigation available');moreSheet.close();
 menu.w.innerWidth=1200;scrollMenu(400);assert.equal(autoNav.classList.contains('is-scroll-hidden'),false);
 menu.close();
 console.log('PASS menu: primary order, grouped destinations, desktop/mobile capture, income/expense form selection, cross-page capture route and budget navigation');
 const lazy=await page('car.html','car.js',{car_installments:[],car_expenses:[],accounts:[],categories:[]},'loadExcelTools');
 assert.equal(lazy.w.document.querySelector('script[src*=sheetjs]'),null,'Excel must not block opening the page');assert.equal(lazy.el('carMessage').dataset.loading,'false');
 const firstExcel=lazy.api.loadExcelTools(),sameExcel=lazy.api.loadExcelTools();assert.equal(firstExcel,sameExcel);const firstScript=lazy.w.document.querySelector('script[src*=sheetjs]');assert.equal(firstScript.async,true);firstScript.onerror();await assert.rejects(firstExcel,/Excel/);assert.equal(lazy.w.document.querySelector('script[src*=sheetjs]'),null);
 const retryExcel=lazy.api.loadExcelTools();const retryScript=lazy.w.document.querySelector('script[src*=sheetjs]');lazy.w.XLSX={utils:{}};retryScript.onload();assert.equal(await retryExcel,lazy.w.XLSX);lazy.close();
 console.log('PASS detail loading: no blocking Excel script, one shared download, failure cleanup/retry, ready status');
 const backupPage=await page('index.html','app.js',{categories,accounts,transactions:[]},'');backupPage.state.backupPayload={format:'my-finance-backup',version:1,owner_id:'user',exported_at:'2026-10-07T05:00:00Z',data:Object.fromEntries(['categories','accounts','transactions','bills','debts','budgets','salary_records','car_installments','car_expenses','rent_records'].map(t=>[t,[]]))};let downloaded='';backupPage.w.URL.createObjectURL=blob=>{assert.equal(blob.type,'application/json');return 'blob:fixture';};backupPage.w.URL.revokeObjectURL=()=>{};backupPage.w.HTMLAnchorElement.prototype.click=function(){downloaded=this.download;};await backupPage.el('exportFinanceBackup').onclick();assert.match(downloaded,/^My_Finance_Backup_.*\.json$/);assert.equal(backupPage.el('exportFinanceBackup').disabled,false);assert.equal(backupPage.state.rpcs.at(-1).name,'export_finance_backup');backupPage.state.fail=true;await backupPage.el('exportFinanceBackup').onclick();assert.match(backupPage.el('appToast').textContent,/สำรองข้อมูลไม่ได้/);backupPage.close();
 console.log('PASS backup download: owner snapshot RPC, JSON file, no duplicate click and clear network failure');
 console.log('PASS deep regressions: save locks, zero budget, logout failure, push readiness and stale request guards');
 console.log('PASS DOM fixtures: full paginated dashboard, XSS escaping, category/account retention, transaction edit status/source, debt save with blank due date, load failure retains data, salary category/reset/save, empty car schedule and visible modal errors');
})().catch(e=>{console.error(e);process.exit(1)});
