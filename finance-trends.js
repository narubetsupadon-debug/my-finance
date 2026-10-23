// Read-only trends: paid expenses only, never mutate financial records.
export function compareExpensesByMonth(transactions,currentMonth,previousMonth){
 const totals={[currentMonth]:0,[previousMonth]:0};
 const categories=new Map();
 for(const tx of transactions||[]){
  if(tx?.type!=='expense'||tx.status==='cancelled'||tx.status==='pending')continue;
  const month=String(tx.transaction_date||'').slice(0,7);
  if(!(month in totals))continue;
  const amount=Number(tx.amount);
  if(!Number.isFinite(amount)||amount<=0)continue;
  totals[month]+=amount;
  const label=String(tx.categories?.name||tx.category_name||'ไม่ระบุหมวด').trim()||'ไม่ระบุหมวด';
  const pair=categories.get(label)||{category:label,current:0,previous:0};
  pair[month===currentMonth?'current':'previous']+=amount;
  categories.set(label,pair);
 }
 const current=totals[currentMonth]||0,previous=totals[previousMonth]||0;
 const delta=current-previous;
 return {
  current,previous,delta,
  percentChange:previous>0?Math.round(delta/previous*1000)/10:null,
  byCategory:[...categories.values()].map(x=>({...x,delta:x.current-x.previous}))
   .sort((a,b)=>Math.abs(b.delta)-Math.abs(a.delta))
 };
}
