// Shared data loading and refresh coordination for the main app.
export async function fetchFinanceData(db,userId,readAll){
  const query=(table,select='*')=>db.from(table).select(select).eq('user_id',userId);
  const [categories,accounts,transactions,bills,debts,budgets,carExpenses]=await Promise.all([
    readAll(()=>query('categories').order('sort_order').order('name').order('id')),
    readAll(()=>query('accounts').order('created_at').order('id')),
    readAll(()=>query('transactions','*,categories(name,icon),accounts(name)').order('transaction_date',{ascending:false}).order('created_at',{ascending:false}).order('id')),
    readAll(()=>query('bills','*,categories(name),accounts(name)').order('due_day').order('id')),
    readAll(()=>query('debts').order('created_at').order('id')),
    readAll(()=>query('budgets').order('created_at').order('id')),
    readAll(()=>query('car_expenses','transaction_id').not('transaction_id','is',null).order('id'))
  ]);
  return {
    categories,accounts,transactions,bills,debts,budgets,
    carExpenseTxIds:new Set(carExpenses.map(x=>x.transaction_id).filter(Boolean))
  };
}

export function createRefreshCoordinator({refresh,isBlocked=()=>false,getDelay=()=>180}){
  let timer=null,cycle=null,queued=false,pending=false;

  async function run(){
    if(cycle){queued=true;return cycle;}
    cycle=(async()=>{
      let result=false;
      do{
        queued=false;
        result=await refresh();
      }while(queued);
      return result;
    })();
    try{return await cycle}
    finally{cycle=null}
  }

  function schedule(){
    clearTimeout(timer);
    if(isBlocked()){pending=true;return;}
    const delay=Math.max(0,Number(getDelay())||0);
    timer=setTimeout(()=>{
      timer=null;
      if(isBlocked()){pending=true;return;}
      pending=false;void run();
    },delay);
  }

  function flush(){
    if(pending)schedule();
  }

  function dispose(){
    clearTimeout(timer);
    timer=null;
    pending=false;
    queued=false;
  }

  return {run,schedule,flush,dispose,get pending(){return pending}};
}

