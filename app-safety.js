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

export async function runDataHealthCheck({db,userId,transactions,readAll}){
  const tx=Array.isArray(transactions)?transactions:[];
  const ids=new Set(tx.map(x=>x.id));
  const [carExpenses,salaries,installments]=await Promise.all([
    readAll(()=>db.from('car_expenses').select('id,transaction_id').eq('user_id',userId).order('id')),
    readAll(()=>db.from('salary_records').select('id,transaction_id').eq('user_id',userId).order('id')),
    readAll(()=>db.from('car_installments').select('id,status,my_amount,transaction_id').eq('user_id',userId).order('id'))
  ]);
  const exact=new Map();
  for(const x of tx){
    if(x.status==='cancelled')continue;
    const key=[x.transaction_date,x.type,x.category_id||'',x.account_id||'',normText(x.description),Number(x.amount||0).toFixed(2)].join('|');
    exact.set(key,(exact.get(key)||0)+1);
  }
  const duplicateGroups=[...exact.values()].filter(n=>n>1).length;
  const orphanCar=carExpenses.filter(x=>!x.transaction_id||!ids.has(x.transaction_id)).length;
  const orphanSalary=salaries.filter(x=>!x.transaction_id||!ids.has(x.transaction_id)).length;
  const orphanInstallments=installments.filter(x=>x.status==='paid'&&Number(x.my_amount)>0&&(!x.transaction_id||!ids.has(x.transaction_id))).length;
  return {
    duplicateGroups,
    orphanCar,
    orphanSalary,
    orphanInstallments,
    ok:duplicateGroups===0&&orphanCar===0&&orphanSalary===0&&orphanInstallments===0
  };
}

