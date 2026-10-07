// Transaction list filtering/rendering extracted from app.js.
export function createTransactionRenderer({$,money,fmtDate,esc,getTransactions}){
function filteredTx(){const transactions=getTransactions();let a=[...transactions],f=$('txFilterType').value,q=$('txSearch').value.trim().toLowerCase(),cat=$('txFilterCategory').value,mon=$('txFilterMonth').value;if(f!=='all')a=a.filter(x=>x.type===f);if(cat)a=a.filter(x=>x.category_id===cat);if(mon)a=a.filter(x=>String(x.transaction_date).slice(0,7)===mon);if(q)a=a.filter(x=>(x.description+' '+(x.categories?.name||'')+' '+(x.note||'')).toLowerCase().includes(q));return a}
function renderTransactions(){
 const monthSelect=$('txFilterMonth'),selected=monthSelect.value;
 const months=[...new Set([...getTransactions().map(x=>String(x.transaction_date).slice(0,7)),selected].filter(x=>/^\d{4}-\d{2}$/.test(x)))].sort().reverse();
 monthSelect.innerHTML='<option value="">ทุกเดือน</option>'+months.map(m=>'<option value="'+m+'">'+new Date(Number(m.slice(0,4)),Number(m.slice(5,7))-1,1).toLocaleDateString('th-TH',{month:'long',year:'numeric'})+'</option>').join('');monthSelect.value=selected;
 const arr=filteredTx();renderTxList($('txList'),arr);$('txCount').textContent=arr.length+' รายการ';
 const active=Number($('txFilterType').value!=='all')+Number(!!$('txFilterCategory').value)+Number(!!monthSelect.value);
 $('txFilterBadge').textContent=String(active);$('txFilterBadge').hidden=!active;
 $('txResetFilters').hidden=!(active||$('txSearch').value.trim());
 $('txFilterSummary').textContent=monthSelect.value?monthSelect.selectedOptions[0].textContent:active?'เลือกตัวกรอง '+active+' รายการ':'ทุกช่วงเวลา';
 $('txResetFilters').onclick=()=>{$('txSearch').value='';$('txFilterType').value='all';$('txFilterCategory').value='';monthSelect.value='';renderTransactions();};
}
function renderTxList(el,arr,compact=false){
 const row=x=>{
  const status=x.status==='cancelled'?'ยกเลิก':x.status==='pending'?'รอดำเนินการ':x.type==='income'?'รับแล้ว':'จ่ายแล้ว';
  const title=esc(x.description),edit='<button class="btn small soft" data-edit="tx" data-id="'+esc(x.id)+'" aria-label="แก้ไข '+title+'">'+(compact?'ดู':'แก้ไขรายการ')+'</button>';
  const actions=compact?'<div class="actions">'+edit+'</div>':'<details class="tx-row-menu"><summary aria-label="ตัวเลือก '+title+'"><span aria-hidden="true">⋯</span></summary><div class="tx-row-menu-panel">'+edit+'<button class="btn small danger" data-del="transactions" data-id="'+esc(x.id)+'" aria-label="ลบ '+title+'">ลบรายการ</button></div></details>';
  return '<div class="item transaction-row '+(compact?'compact-row ':'ledger-row ')+(x.status==='cancelled'?'is-cancelled':'')+'"><span class="transaction-icon" aria-hidden="true">'+esc(x.categories?.icon||'🧾')+'</span><div class="transaction-detail"><b>'+title+'</b><span class="muted">'+(compact?fmtDate(x.transaction_date)+' · ':'')+esc(x.categories?.name||'ไม่ระบุหมวด')+(x.accounts?.name&&!compact?' · '+esc(x.accounts.name):'')+'</span><span class="tx-status status-'+esc(x.status||'paid')+'">'+status+'</span></div><span class="amount '+(x.type==='income'?'income':'expense')+'">'+(x.type==='income'?'+':'−')+money(x.amount)+'</span>'+actions+'</div>';
 };
 if(!arr.length){const filtered=!compact&&($('txSearch').value.trim()||$('txFilterType').value!=='all'||$('txFilterCategory').value||$('txFilterMonth').value);el.innerHTML=filtered?'<div class="empty tx-empty"><b>ไม่พบรายการที่ตรงกัน</b><p>ลองเปลี่ยนคำค้นหาหรือล้างตัวกรองด้านบน</p></div>':'<div class="empty tx-empty"><b>ยังไม่มีรายการ</b><p>เริ่มจดรายการแรก แล้วกลับมาดูได้ตรงนี้</p><button class="btn soft" onclick="openTx()">＋ บันทึกรายการ</button></div>';return;}
 if(compact){el.innerHTML=arr.map(row).join('');return;}
 const grouped=new Map();[...arr].sort((a,b)=>String(b.transaction_date).localeCompare(String(a.transaction_date))).forEach(x=>{const key=String(x.transaction_date);if(!grouped.has(key))grouped.set(key,[]);grouped.get(key).push(x);});
 el.innerHTML=[...grouped].map(([day,rows])=>'<section class="tx-day-group"><div class="tx-day-header"><h3>'+esc(fmtDate(day))+'</h3><span>'+rows.length+' รายการ</span></div><div class="tx-day-card">'+rows.map(row).join('')+'</div></section>').join('');
 el.querySelectorAll('.tx-row-menu').forEach(menu=>menu.addEventListener('toggle',()=>{if(menu.open)el.querySelectorAll('.tx-row-menu[open]').forEach(other=>{if(other!==menu)other.open=false;});}));
}

 return {filteredTx,renderTransactions,renderTxList};
}
