// Shared date, aggregation and complete-read helpers. No customer data here.
export function bangkokDay(instant = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(instant);
  return ['year','month','day'].map(key=>parts.find(p=>p.type===key).value).join('-');
}
export function bangkokDate(instant = new Date()) { return new Date(bangkokDay(instant)+'T12:00:00'); }
export async function readAll(makeQuery, pageSize = 500) {
  const rows=[];
  for(let from=0;;from+=pageSize){
    const {data,error}=await makeQuery().range(from,from+pageSize-1);
    if(error)throw error;
    if(!Array.isArray(data))throw new Error('ไม่ได้รับข้อมูลจากเซิร์ฟเวอร์');
    rows.push(...data);
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
export function billDue(bill) {
  if(bill.next_due_date)return new Date(bill.next_due_date+'T00:00:00');
  return bill.frequency==='monthly'?monthlyDue(bill.due_day):null;
}
