const {JSDOM}=require('jsdom');
const fs=require('fs'),assert=require('node:assert/strict');
const root=require('node:path').join(__dirname,'../');
const core=fs.readFileSync(root+'finance-core.js','utf8').replaceAll('export ','');
function dbMock(data){
 const state={fail:false,writes:[]};
 const db={auth:{getSession:async()=>({data:{session:{user:{id:'user',email:'test@example.invalid'}}}}),getUser:async()=>({data:{user:{id:'user',email:'test@example.invalid'}}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),signOut:async()=>({error:null})},channel:()=>({on(){return this},subscribe(){return this}}),removeChannel(){}};
 db.from=table=>{
  let rows=[...(data[table]||[])],write=null;
  const q={select(){return q},order(){return q},limit(n){rows=rows.slice(0,n);return q},eq(k,v){rows=rows.filter(r=>r[k]===v);return q},neq(k,v){rows=rows.filter(r=>r[k]!==v);return q},
  insert(row){write=row;state.writes.push({table,row});return q},update(row){write=row;state.writes.push({table,row});return q},
  single:async()=>{if(state.fail)return {error:{message:'offline'}};if(state.failAfterWrite)state.fail=true;return {data:{id:'saved'}}},
  range:async(a,b)=>state.fail?{error:{message:'offline'}}:{data:rows.slice(a,b+1)},
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
 const code=fs.readFileSync(root+js,'utf8').replace(/^import .*$/gm,'');
 const api=await w.eval('(async()=>{'+core+'\n'+code+'\nreturn {'+expose+'};})()');
 return {w,api,state,close:()=>w.close(),el:id=>w.document.getElementById(id)};
}
(async()=>{
 const day=new Date().toISOString().slice(0,10);
 const categories=[{id:'cat',user_id:'user',name:'อาหาร',type:'expense',icon:'<img src=x onerror=alert(1)>'},{id:'coffee',user_id:'user',name:'กาแฟ',type:'expense',icon:'☕'},{id:'inc',user_id:'user',name:'เงินเดือน',type:'income'}];
 const accounts=[{id:'acc',user_id:'user',name:'bank',is_active:true}];
 const transactions=Array.from({length:1201},(_,i)=>({id:'t'+i,user_id:'user',type:'expense',status:'paid',source:'import_r3_v2',transaction_date:day,description:'food',amount:1,category_id:'cat',account_id:'acc',categories:categories[0],accounts:accounts[0]}));
 transactions[0].status='cancelled';
 const p=await page('index.html','app.js',{categories,accounts,transactions},'loadAll,fillTxSelectors');
 assert.equal(p.el('txCount').textContent,'1201 รายการ');assert.ok(p.el('pushDeviceSetting'));
 assert.equal(p.el('txList').querySelector('img'),null);
 assert.equal(p.el('recentList').querySelectorAll('.transaction-row').length,5);
 assert.match(p.el('txList').querySelector('.status-cancelled').textContent,/ยกเลิก/);
 p.el('viewToday').click();assert.equal(p.el('insightDetailDialog').open,true);p.el('insightDetailDialog').close();
 p.el('nextBillCard').click();assert.equal(p.el('billsPage').classList.contains('hidden'),false);
  // accent toast must not appear on ordinary navigation clicks
  p.el('appToast').classList.add('hidden');
  p.w.document.querySelector('[data-page="dashboard"]').click();
  assert.equal(p.el('appToast').classList.contains('hidden'),true);
 p.w.document.body.classList.add('privacy-mode');p.api.loadAll&&await p.api.loadAll();assert.match(p.el('todaySpent').textContent,/••••/);p.w.document.body.classList.remove('privacy-mode');await p.api.loadAll();
 p.el('txForm').scrollTop=120;p.w.openTx();assert.equal(p.el('txForm').scrollTop,0);assert.notEqual(p.w.document.activeElement.id,'txAmount');
 p.w.document.querySelector('[data-tx-type="income"]').click();
  assert.equal(p.el('txType').value,'income');assert.equal(p.el('txCategory').value,'');
 assert.equal(p.w.document.querySelector('[data-tx-type="income"]').getAttribute('aria-pressed'),'true');
 p.w.quickAdd('อาหาร');assert.equal(p.el('txType').value,'expense');assert.equal(p.el('txDesc').value,'อาหาร');assert.equal(p.el('txCategory').value,'cat');
 p.w.quickAdd('กาแฟ');assert.equal(p.el('txCategory').value,'coffee');
 assert.equal(p.el('txAmount').value,'');p.el('txDialog').close();
 p.el('txFilterCategory').value='cat';p.w.openTx('t0');p.el('txAccount').value='acc';await p.api.loadAll();
 assert.equal(p.el('txFilterCategory').value,'cat');assert.equal(p.el('txAccount').value,'acc');
 await p.el('txForm').onsubmit({preventDefault(){},currentTarget:p.el('txForm')});
 assert.equal(p.state.writes.at(-1).row.status,'cancelled');assert.equal(p.state.writes.at(-1).row.source,'import_r3_v2');
 p.w.openEntity('debt');p.el('entityFields').querySelector('[name=name]').value='card';
 await p.el('entityForm').onsubmit({preventDefault(){},currentTarget:p.el('entityForm')});
 assert.equal(p.state.writes.at(-1).table,'debts');assert.equal(p.state.writes.at(-1).row.due_day,null);assert.equal(p.w.alerts.length,0);
 p.state.fail=true;await p.api.loadAll();assert.equal(p.el('dataError').classList.contains('hidden'),false);assert.equal(p.el('txCount').textContent,'1201 รายการ');
 p.close();
 const s=await page('salary.html','salary.js',{categories,accounts,transactions:[]},'reset');
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
 console.log('PASS DOM fixtures: full paginated dashboard, XSS escaping, category/account retention, transaction edit status/source, debt save with blank due date, load failure retains data, salary category/reset/save, empty car schedule and visible modal errors');
})().catch(e=>{console.error(e);process.exit(1)});
