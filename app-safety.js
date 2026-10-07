// Guardrails for duplicate detection and health checks.
const normText=value=>String(value??'').trim().toLowerCase().replace(/\s+/g,' ');

export function findDuplicateCandidates(row,transactions,editingId=null){
  if(!row||!Array.isArray(transactions))return [];
  const desc=normText(row.description),amount=Number(row.amount||0);
  return transactions
    .filter(x=>x.id!==editingId&&x.status!=='cancelled'&&x.type===row.type&&String(x.transaction_date)===String(row.transaction_date)&&Math.abs(Number(x.amount||0)-amount)<0.005)
    .map(x=>{
      const old=normText(x.description);
      let score=0;
      if(old===desc&&desc)score=3;
      else if(desc&&old&&(old.includes(desc)||desc.includes(old)))score=2;
      else if(row.category_id&&x.category_id===row.category_id)score=1;
      return {...x,_duplicateScore:score};
    })
    .filter(x=>x._duplicateScore>0)
    .sort((a,b)=>b._duplicateScore-a._duplicateScore)
    .slice(0,3);
}

// The RPC checks one database snapshot, avoiding mismatched reads during a save.
export async function runDataHealthCheck({db}){
 const {data,error}=await db.rpc('finance_health_check');
 if(error)throw error;
 const counters=['duplicateGroups','orphanCar','orphanSalary','orphanInstallments','orphanRent','mismatchCar','mismatchSalary','mismatchInstallments','mismatchRent','brokenSourceLinks','invalidDimensions','billDuplicateGroups','orphanBills'];
 if(!data||counters.some(k=>!Number.isSafeInteger(data[k])||data[k]<0))throw new Error('ผลตรวจระบบไม่ครบ กรุณาลองใหม่');
 return {...data,ok:counters.every(k=>data[k]===0)};
}
