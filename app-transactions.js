// Transaction list filtering/rendering extracted from app.js.
export function createTransactionRenderer({$,money,fmtDate,esc,getTransactions}){
function filteredTx(){const transactions=getTransactions();let a=[...transactions],f=$('txFilterType').value,q=$('txSearch').value.trim().toLowerCase(),cat=$('txFilterCategory').value,mon=$('txFilterMonth').value;if(f!=='all')a=a.filter(x=>x.type===f);if(cat)a=a.filter(x=>x.category_id===cat);if(mon)a=a.filter(x=>String(x.transaction_date).slice(0,7)===mon);if(q)a=a.filter(x=>(x.description+' '+(x.categories?.name||'')+' '+(x.note||'')).toLowerCase().includes(q));return a}
function renderTransactions(){const arr=filteredTx();renderTxList($('txList'),arr);$('txCount').textContent=arr.length+' รายการ'}
function renderTxList(el,arr,compact=false){
 el.innerHTML=arr.length?arr.map(x=>{
  const status=x.status==='cancelled'?'ยกเลิก':x.status==='pending'?'รอดำเนินการ':x.type==='income'?'รับแล้ว':'จ่ายแล้ว';
  return '<div class="item transaction-row '+(compact?'compact-row ':'')+(x.status==='cancelled'?'is-cancelled':'')+'"><span class="transaction-icon" aria-hidden="true">'+esc(x.categories?.icon||'🧾')+'</span><div class="transaction-detail"><b>'+esc(x.description)+'</b><span class="muted">'+fmtDate(x.transaction_date)+' · '+esc(x.categories?.name||'ไม่ระบุหมวด')+(x.accounts?.name&&!compact?' · '+esc(x.accounts.name):'')+'</span><span class="tx-status status-'+esc(x.status||'paid')+'">'+status+'</span></div><span class="amount '+(x.type==='income'?'income':'expense')+'">'+(x.type==='income'?'+':'−')+money(x.amount)+'</span><div class="actions"><button class="btn small soft" data-edit="tx" data-id="'+x.id+'" aria-label="แก้ไข '+esc(x.description)+'">'+(compact?'ดู':'แก้ไข')+'</button>'+(compact?'':'<button class="btn small danger" data-del="transactions" data-id="'+x.id+'">ลบ</button>')+'</div></div>';
 }).join(''):'<div class="empty"><b>ยังไม่มีรายการ</b><p>เริ่มจดรายการแรก แล้วกลับมาดูได้ตรงนี้</p><button class="btn soft" onclick="openTx()">＋ บันทึกรายการ</button></div>';
}

 return {filteredTx,renderTransactions,renderTxList};
}
