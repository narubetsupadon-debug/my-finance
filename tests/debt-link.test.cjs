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
 const dom=new JSDOM(fs.readFileSync(root+(html==='index.html'?'preview/debt-link/candidate-index.html':html),'utf8'),{url:'https://finance.test/',runScripts:'outside-only'});
 const w=dom.window,{db,state}=dbMock(data,options);w.createClient=()=>db;w.alerts=[];w.alert=x=>w.alerts.push(x);w.confirm=()=>true;w.scrollTo=()=>{};w.setInterval=()=>0;
 for(const [key,value] of Object.entries(storage))w.localStorage.setItem(key,value);
 w.HTMLElement.prototype.scrollIntoView=function(){};w.requestAnimationFrame=cb=>{cb();return 1};w.cancelAnimationFrame=()=>{};
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false};
 let code=fs.readFileSync(root+(js==='app.js'?'preview/debt-link/candidate-app.js':js),'utf8').replace(/^import .*$/gm,'');
 if(js==='salary.js')code=code.replace('document,canRead:', 'document,readPdf:async()=>window.mockPayslipDraft,canRead:');
 const api=await w.eval('(async()=>{'+core+'\n'+appStorage+'\n'+appData+'\n'+expenseAnalysis+'\n'+totalDetails+'\n'+appSummary+'\n'+appDashboard+'\n'+appTransactions+'\n'+appPlanning+'\n'+appSafety+'\n'+payslip+'\n'+rentCore+'\n'+backupCore+'\n'+code+'\nreturn {'+expose+'};})()');
 return {w,api,state,close:()=>w.close(),el:id=>w.document.getElementById(id)};
}
(async()=>{
 const linkDay=new Date().toISOString().slice(0,10),linkCategory={id:'linkcat',user_id:'user',name:'หนี้/ผ่อน',type:'expense'},otherCategory={id:'othercat',user_id:'user',name:'อาหาร',type:'expense'};
 const linkDebt={id:'link-debt',user_id:'user',name:'Test Card',debt_type:'credit_card',is_active:true,original_amount:10000,outstanding_amount:1000,installment_amount:500};
 const linkData={categories:[linkCategory,otherCategory],accounts:[],debts:[linkDebt],transactions:[]};
 const linkedPage=await page('index.html','app.js',linkData,'loadAll');linkedPage.state.persistWrites=true;
 linkedPage.w.openTx();linkedPage.el('txCategory').value='linkcat';linkedPage.el('txCategory').dispatchEvent(new linkedPage.w.Event('change'));
 linkedPage.el('cardPaymentList').querySelector('[data-pay-debt]').click();assert.equal(linkedPage.el('txDebtLink').value,'link-debt');
 linkedPage.el('txDesc').value='ยอดโอนตามจริง';await linkedPage.el('txForm').onsubmit({preventDefault(){},currentTarget:linkedPage.el('txForm')});
 assert.equal(linkedPage.state.writes.at(-1).row.source,'debt_payment:link-debt');const linkedId=linkData.transactions[0].id;
 assert.equal(linkData.debts[0].outstanding_amount,1000,'Linking must not alter debt balance');
 linkData.debts[0].name='Renamed Card';await linkedPage.api.loadAll();linkedPage.w.openTx(linkedId);assert.equal(linkedPage.el('txDebtLink').value,'link-debt');linkedPage.el('txDesc').value='ชื่อใหม่ของรายการ';await linkedPage.el('txForm').onsubmit({preventDefault(){},currentTarget:linkedPage.el('txForm')});assert.equal(linkedPage.state.writes.at(-1).row.source,'debt_payment:link-debt');
 linkedPage.w.openTx(linkedId);linkedPage.el('txDebtLink').value='';await linkedPage.el('txForm').onsubmit({preventDefault(){},currentTarget:linkedPage.el('txForm')});assert.equal(linkedPage.state.writes.at(-1).row.source,'web','Explicit unlink removes debt source');
 linkedPage.w.openTx();assert.equal(linkedPage.el('txDebtLink').value,'','New form must not retain prior card');linkedPage.el('txCategory').value='linkcat';linkedPage.el('txCategory').dispatchEvent(new linkedPage.w.Event('change'));linkedPage.el('txDebtLink').value='link-debt';linkedPage.el('txCategory').value='othercat';linkedPage.el('txCategory').dispatchEvent(new linkedPage.w.Event('change'));assert.equal(linkedPage.el('txDebtLink').disabled,true);assert.equal(linkedPage.el('txDebtLink').value,'');linkedPage.close();
 console.log('PASS direct debt link: actual save source, rename/edit preservation, explicit unlink, no balance mutation, form reset and category switch');
})().catch(e=>{console.error(e);process.exitCode=1});
