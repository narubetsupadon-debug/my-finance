// Shared date, aggregation and complete-read helpers. No customer data here.
export function bangkokDay(instant = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(instant);
  return ['year','month','day'].map(key=>parts.find(p=>p.type===key).value).join('-');
}
export function bangkokDate(instant = new Date()) { return new Date(bangkokDay(instant)+'T12:00:00'); }
export async function readAll(makeQuery, pageSize = 500) {
  if(!Number.isInteger(pageSize)||pageSize<=0||pageSize>1000)throw new Error('ขนาดหน้าข้อมูลไม่ถูกต้อง');
  const rows=[],seen=new Set();
  for(let from=0;;from+=pageSize){
    const {data,error}=await makeQuery().range(from,from+pageSize-1);
    if(error){recordFinanceError('read',error);throw error;}
    if(!Array.isArray(data))throw new Error('ไม่ได้รับข้อมูลจากเซิร์ฟเวอร์');
    if(data.some(x=>x?.id&&seen.has(x.id)))throw new Error('ได้รับข้อมูลหน้าซ้ำ กรุณาลองโหลดใหม่');
    data.forEach(x=>{if(x?.id)seen.add(x.id)});rows.push(...data);
    if(rows.length>100000)throw new Error('ข้อมูลเกินขอบเขตการโหลด กรุณาตรวจระบบ');
    if(data.length<pageSize)return rows;
  }
}
export function budgetSummary(budgets,transactions,day=bangkokDay()) {
  const active=budgets.filter(b=>b.is_active),names=new Set(active.flatMap(b=>b.category_names||[]));
  const limit=active.reduce((s,b)=>s+Math.round(Number(b.monthly_limit||0)*100),0)/100;
  const spent=transactions.filter(x=>x.type==='expense'&&x.status!=='cancelled'&&x.transaction_date.slice(0,7)===day.slice(0,7)&&names.has(x.categories?.name)).reduce((s,x)=>s+Math.round(Number(x.amount)*100),0)/100;
  const [y,m,d]=day.split('-').map(Number),daysLeft=new Date(y,m,0).getDate()-d+1,remain=Math.max(0,limit-spent);
  return {limit,spent,remain,daily:remain/daysLeft};
}
export function monthlyDue(day,today=bangkokDay()) {
  if(!Number.isInteger(Number(day))||Number(day)<1||Number(day)>31)return null;
  const [y,m,d]=today.split('-').map(Number);
  let due=new Date(y,m-1,Math.min(Number(day),new Date(y,m,0).getDate()));
  if(due<new Date(y,m-1,d))due=new Date(y,m,Math.min(Number(day),new Date(y,m+1,0).getDate()));
  return due;
}
export function billDue(bill, today=bangkokDay()) {
  const next=bill.next_due_date?new Date(bill.next_due_date+'T00:00:00'):null;
  if(next){
    const todayDate=new Date(today+'T00:00:00');
    if(next>=todayDate || bill.frequency!=='monthly')return next;
  }
  return bill.frequency==='monthly'?monthlyDue(bill.due_day,today):null;
}

export function excelDay(value) {
  if(value==null || value==='')return null;
  const pad=n=>String(n).padStart(2,'0');
  const out=(y,m,d)=>{
    y=Number(y);m=Number(m);d=Number(d);
    if(y>2400)y-=543;
    const dt=new Date(Date.UTC(y,m-1,d));
    if(dt.getUTCFullYear()!==y || dt.getUTCMonth()!==m-1 || dt.getUTCDate()!==d)return null;
    return y+'-'+pad(m)+'-'+pad(d);
  };
  if(typeof value==='number' && Number.isFinite(value)){
    const dt=new Date(Date.UTC(1899,11,30)+Math.floor(value*86400000));
    return dt.toISOString().slice(0,10);
  }
  if(value instanceof Date && !Number.isNaN(value.getTime()))return out(value.getFullYear(),value.getMonth()+1,value.getDate());
  const s=String(value).trim();
  let m=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:\D|$)/);
  if(m)return out(m[1],m[2],m[3]);
  m=s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})(?:\D|$)/);
  if(m)return out(m[3],m[2],m[1]);
  const dt=new Date(s);
  if(Number.isNaN(dt.getTime()))return null;
  return out(dt.getFullYear(),dt.getMonth()+1,dt.getDate());
}


// Lock a submitted form until its request settles, preserving prior disabled states.
export function lockFinanceForm(form,dialog=null){
 const controls=[...form.querySelectorAll('input,select,textarea,button')];
 const states=controls.map(el=>el.disabled);
 controls.forEach(el=>el.disabled=true);
 const preventCancel=event=>event.preventDefault();
 dialog?.addEventListener('cancel',preventCancel);
 return ()=>{controls.forEach((el,i)=>el.disabled=states[i]);dialog?.removeEventListener('cancel',preventCancel)};
}

// Load Excel only when exporting, so it cannot delay opening detail pages.
let excelToolsPromise=null;
export function loadExcelTools(){
 if(window.XLSX)return Promise.resolve(window.XLSX);
 if(excelToolsPromise)return excelToolsPromise;
 excelToolsPromise=new Promise((resolve,reject)=>{
  const script=document.createElement('script');script.src='https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js';script.async=true;
  const timer=setTimeout(()=>fail(),20000);
  function fail(){clearTimeout(timer);script.onload=null;script.onerror=null;script.remove();excelToolsPromise=null;reject(new Error('โหลดเครื่องมือ Excel ไม่สำเร็จ ลองส่งออกอีกครั้งได้'));}
  script.onerror=fail;script.onload=()=>{if(!window.XLSX)return fail();clearTimeout(timer);script.onload=null;script.onerror=null;resolve(window.XLSX);};
  document.head.append(script);
 });
 return excelToolsPromise;
}

// Read-only status of this month's explicitly linked recurring bill entries.
export function recurringBillMonthStatus(bill,transactions,today=bangkokDay()){
 const rows=transactions.filter(x=>x.type==='expense'&&x.status!=='cancelled'&&x.source==='bill_payment:'+bill.id&&/^\d{4}-\d{2}-\d{2}$/.test(String(x.transaction_date))&&x.transaction_date.slice(0,7)===today.slice(0,7));
 const paidRows=rows.filter(x=>x.status!=='pending'&&x.transaction_date<=today);
 const state=paidRows.length?'paid':rows.length?'pending':'unrecorded';
 const [y,m]=today.split('-').map(Number),day=Number(bill.due_day),dueDay=Number.isInteger(day)&&day>=1&&day<=31?Math.min(day,new Date(y,m,0).getDate()):null;
 return {state,rows,paidRows,due:dueDay!==null&&dueDay<=Number(today.slice(8,10))};
}

// Diagnostics intentionally exclude messages, URLs, payloads and credentials.
const financeDiagnostics=[];
export function recordFinanceError(area,error){
 const code=/^[A-Z0-9_]{1,24}$/i.test(String(error?.code||''))?String(error.code):'UNCLASSIFIED';
 const entry={at:new Date().toISOString(),area:String(area).replace(/[^a-z0-9_/-]/gi,'').slice(0,40),code};
 financeDiagnostics.push(entry);if(financeDiagnostics.length>20)financeDiagnostics.shift();
 return entry;
}
export function getFinanceDiagnostics(){return financeDiagnostics.map(x=>({...x}));}
export function sumTransactionAmounts(rows,type=null){return rows.filter(x=>!type||x.type===type).reduce((sum,x)=>sum+Math.round(Number(x.amount||0)*100),0)/100;}
// One ID per new-form draft. Retrying an ambiguous response cannot create a
// second row; confirmation is owner-scoped and never overwrites an existing row.
export function createRetrySafeInsert(){
 let draft=null;
 return async function insert(db,table,row){
  const signature=JSON.stringify(row);
  if(draft&&draft.owner!==row.user_id)draft=null;
  if(draft&&draft.signature!==signature)throw new Error('รายการก่อนหน้ายังรอยืนยัน กรุณาลองข้อมูลเดิมหรือรีเฟรชตรวจรายการก่อนเปลี่ยนข้อมูล');
  if(!draft)draft={id:crypto.randomUUID(),owner:row.user_id,signature};
  const id=draft.id;
  try{
   const {data,error}=await db.from(table).insert({...row,id}).select('id').single();
   if(error)throw error;if(!data?.id)throw new Error('ไม่ได้รับผลยืนยันการบันทึก');
   draft=null;return {data,error:null};
  }catch(error){
   recordFinanceError('save/'+table,error);
   try{
    const result=await db.from(table).select('*').eq('id',id).eq('user_id',row.user_id).range(0,0);
    if(result.error)throw result.error;
    const saved=result.data?.[0];
    if(saved&&Object.entries(row).every(([key,value])=>(key==='transaction_id'&&value===null)|| (typeof value==='number'?Number(saved?.[key])===value:saved?.[key]===value))){
     draft=null;return {data:{id:saved.id},error:null,recovered:true};
    }
    // A known SQL validation error is definitive; allow corrections.
    if(!saved&&/^[0-9A-Z]{5}$/.test(String(error.code||'')))draft=null;
   }catch(readError){recordFinanceError('confirm/'+table,readError);}
   if(draft){const uncertain=new Error('ยังยืนยันการบันทึกไม่ได้ ลองบันทึกข้อมูลเดิมอีกครั้ง หรือรีเฟรชตรวจรายการก่อนสร้างใหม่');uncertain.code='SAVE_UNCONFIRMED';throw uncertain;}
   throw error;
  }
 };
}

// Bound Supabase requests, including response-body stalls. Never replay writes here.
export function createFinanceFetch(fetchFn=globalThis.fetch,timeoutMs=20000){
 if(!Number.isFinite(timeoutMs)||timeoutMs<=0)throw new Error('Invalid request timeout');
 return (input,init={})=>{
  const controller=new AbortController();
  const source=init.signal||(typeof input==='object'?input?.signal:null);
  let timer;
  const cleanup=()=>{clearTimeout(timer);source?.removeEventListener('abort',cancel)};
  const cancel=()=>{controller.abort(source.reason);cleanup()};
  if(source?.aborted)controller.abort(source.reason);
  else{
   source?.addEventListener('abort',cancel,{once:true});
   timer=setTimeout(()=>{
    const error=new Error('เชื่อมต่อใช้เวลานานเกินไป กรุณาตรวจอินเทอร์เน็ตแล้วลองใหม่');error.name='TimeoutError';
    controller.abort(error);cleanup();
   },timeoutMs);
  }
  try{
   return Promise.resolve(fetchFn(input,{...init,signal:controller.signal})).then(response=>{
    // Keep the deadline alive for body reads; Node need not stay open just for this timer.
    timer?.unref?.();return response;
   },error=>{cleanup();throw error});
  }catch(error){cleanup();throw error}
 };
}
