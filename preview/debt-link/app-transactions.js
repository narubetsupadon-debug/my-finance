// Transaction list filtering/rendering extracted from app.js.
function createTransactionRenderer({$,money,fmtDate,esc,getTransactions,getAccounts=()=>[]}){
const PAGE_SIZE=100;
let visibleLimit=PAGE_SIZE,filterSignature='',searchTimer=null,monthMarkup='',accountMarkup='';
const menuRoots=new WeakSet();
const monthFormatter=new Intl.DateTimeFormat('th-TH',{month:'long',year:'numeric'});
function cancelSearch(){clearTimeout(searchTimer);searchTimer=null;}
function scheduleSearch(){cancelSearch();searchTimer=setTimeout(()=>{searchTimer=null;renderTransactions();},140);}
function filteredTx(){const transactions=getTransactions();let a=[...transactions],f=$('txFilterType').value,q=$('txSearch').value.trim().toLowerCase(),cat=$('txFilterCategory').value,mon=$('txFilterMonth').value;if(f!=='all')a=a.filter(x=>x.type===f);if(cat)a=a.filter(x=>x.category_id===cat);if(mon)a=a.filter(x=>String(x.transaction_date).slice(0,7)===mon);const account=$('txFilterAccount')?.value||'',status=$('txFilterStatus')?.value||'all';if(account)a=a.filter(x=>account==='__none__'?!x.account_id:x.account_id===account);if(status!=='all')a=a.filter(x=>(x.status||'paid')===status);if(q)a=a.filter(x=>(x.description+' '+(x.categories?.name||'')+' '+(x.note||'')).toLowerCase().includes(q));return a}
function renderTransactions(){
 cancelSearch();
 const signature=JSON.stringify(['txFilterType','txSearch','txFilterCategory','txFilterMonth','txFilterAccount','txFilterStatus'].map(id=>$(id)?.value||''));
 if(signature!==filterSignature){visibleLimit=PAGE_SIZE;filterSignature=signature;}
 const monthSelect=$('txFilterMonth'),selected=monthSelect.value;
 const months=[...new Set([...getTransactions().map(x=>String(x.transaction_date).slice(0,7)),selected].filter(x=>/^\d{4}-\d{2}$/.test(x)))].sort().reverse();
 const nextMonths='<option value="">ทุกเดือน</option>'+months.map(m=>'<option value="'+m+'">'+monthFormatter.format(new Date(Number(m.slice(0,4)),Number(m.slice(5,7))-1,1))+'</option>').join('');
 if(nextMonths!==monthMarkup){monthSelect.innerHTML=nextMonths;monthMarkup=nextMonths;}monthSelect.value=selected;
 const accountSelect=$('txFilterAccount');if(accountSelect){const selected=accountSelect.value,options=new Map(getAccounts().map(a=>[a.id,a.name]));for(const t of getTransactions())if(t.account_id&&!options.has(t.account_id))options.set(t.account_id,t.accounts?.name||'บัญชีเดิม');const nextAccounts='<option value="">ทุกบัญชี</option><option value="__none__">ไม่ระบุบัญชี</option>'+[...options].map(([id,name])=>'<option value="'+esc(id)+'">'+esc(name)+'</option>').join('');if(nextAccounts!==accountMarkup){accountSelect.innerHTML=nextAccounts;accountMarkup=nextAccounts;}accountSelect.value=options.has(selected)||selected==='__none__'?selected:'';}
 const arr=filteredTx();renderTxList($('txList'),arr,false,visibleLimit);$('txCount').textContent=arr.length+' รายการ';
 const more=$('txList').querySelector('[data-tx-more]');
 if(more)more.onclick=()=>{visibleLimit+=PAGE_SIZE;renderTransactions();$('txList').querySelector('[data-tx-more]')?.focus({preventScroll:true});};
 const active=Number($('txFilterType').value!=='all')+Number(!!$('txFilterCategory').value)+Number(!!monthSelect.value)+Number(!!$('txFilterAccount')?.value)+Number(($('txFilterStatus')?.value||'all')!=='all');
 $('txFilterBadge').textContent=String(active);$('txFilterBadge').hidden=!active;
 $('txResetFilters').hidden=!(active||$('txSearch').value.trim());
 $('txFilterSummary').textContent=monthSelect.value?monthSelect.selectedOptions[0].textContent:active?'เลือกตัวกรอง '+active+' รายการ':'ทุกช่วงเวลา';
 $('txResetFilters').onclick=()=>{$('txSearch').value='';$('txFilterType').value='all';$('txFilterCategory').value='';monthSelect.value='';if($('txFilterAccount'))$('txFilterAccount').value='';if($('txFilterStatus'))$('txFilterStatus').value='all';renderTransactions();};
}
function renderTxList(el,arr,compact=false,limit=Infinity){
 const row=x=>{
  const status=x.status==='cancelled'?'ยกเลิก':x.status==='pending'?'รอดำเนินการ':x.type==='income'?'รับแล้ว':'จ่ายแล้ว';
  const title=esc(x.description),edit='<button class="btn small soft" data-edit="tx" data-id="'+esc(x.id)+'" aria-label="แก้ไข '+title+'">'+(compact?'ดู':'แก้ไขรายการ')+'</button>';
  const actions=compact?'<div class="actions">'+edit+'</div>':'<details class="tx-row-menu"><summary aria-label="ตัวเลือก '+title+'"><span aria-hidden="true">⋯</span></summary><div class="tx-row-menu-panel">'+edit+'<button class="btn small danger" data-del="transactions" data-id="'+esc(x.id)+'" aria-label="ลบ '+title+'">ลบรายการ</button></div></details>';
  return '<div class="item transaction-row '+(compact?'compact-row ':'ledger-row ')+(x.status==='cancelled'?'is-cancelled':'')+'"><span class="transaction-icon" aria-hidden="true">'+esc(x.categories?.icon||'🧾')+'</span><div class="transaction-detail"><b>'+title+'</b><span class="muted">'+(compact?fmtDate(x.transaction_date)+' · ':'')+esc(x.categories?.name||'ไม่ระบุหมวด')+(x.accounts?.name&&!compact?' · '+esc(x.accounts.name):'')+'</span><span class="tx-status status-'+esc(x.status||'paid')+'">'+status+'</span></div><span class="amount '+(x.type==='income'?'income':'expense')+'">'+(x.type==='income'?'+':'−')+money(x.amount)+'</span>'+actions+'</div>';
 };
 if(!arr.length){const filtered=!compact&&($('txSearch').value.trim()||$('txFilterType').value!=='all'||$('txFilterCategory').value||$('txFilterMonth').value||$('txFilterAccount')?.value||($('txFilterStatus')?.value||'all')!=='all');el.innerHTML=filtered?'<div class="empty tx-empty"><b>ไม่พบรายการที่ตรงกัน</b><p>ลองเปลี่ยนคำค้นหาหรือล้างตัวกรองด้านบน</p></div>':'<div class="empty tx-empty"><b>ยังไม่มีรายการ</b><p>เริ่มจดรายการแรก แล้วกลับมาดูได้ตรงนี้</p><button class="btn soft" onclick="openTx()">＋ บันทึกรายการ</button></div>';return;}
 if(compact){el.innerHTML=arr.map(row).join('');return;}
 const ordered=[...arr].sort((a,b)=>String(b.transaction_date).localeCompare(String(a.transaction_date)));
 const visible=ordered.slice(0,limit),grouped=new Map();visible.forEach(x=>{const key=String(x.transaction_date);if(!grouped.has(key))grouped.set(key,[]);grouped.get(key).push(x);});
 el.innerHTML=[...grouped].map(([day,rows])=>'<section class="tx-day-group"><div class="tx-day-header"><h3>'+esc(fmtDate(day))+'</h3><span>'+rows.length+' รายการ</span></div><div class="tx-day-card">'+rows.map(row).join('')+'</div></section>').join('');
 if(visible.length<ordered.length)el.insertAdjacentHTML('beforeend','<div class="tx-load-more"><p class="muted" role="status">แสดง '+visible.length+' จาก '+ordered.length+' รายการ · ค้นหาได้จากทั้งหมด</p><button type="button" class="btn soft" data-tx-more>แสดงอีก '+Math.min(PAGE_SIZE,ordered.length-visible.length)+' รายการ</button></div>');
 if(!menuRoots.has(el)){menuRoots.add(el);el.addEventListener('toggle',event=>{const menu=event.target;if(menu.matches?.('.tx-row-menu')&&menu.open)el.querySelectorAll('.tx-row-menu[open]').forEach(other=>{if(other!==menu)other.open=false;});},true);}
}

 return {filteredTx,renderTransactions,renderTxList,scheduleSearch,dispose:cancelSearch};
}
