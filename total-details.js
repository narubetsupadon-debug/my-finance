export function createTotalDetails({$,money,fmtDate}){
function openInsightDetails(title,groups,note){
 $('insightDetailTitle').textContent=title;$('insightDetailNote').textContent=note;
 const root=$('insightDetailBody');root.replaceChildren();
 groups.forEach(group=>{
  const section=document.createElement('section');section.className='insight-detail-group';
  const heading=document.createElement('h4');const sum=group.rows.reduce((s,r)=>s+Number(r.amount),0);
  heading.textContent=group.label+' · '+money(sum)+' · '+group.rows.length+' รายการ';section.append(heading);
  if(!group.rows.length){const p=document.createElement('p');p.className='muted';p.textContent='ไม่มีรายการที่บันทึกในช่วงนี้';section.append(p);}
  group.rows.forEach(r=>{const row=document.createElement('div');row.className='insight-detail-row';const detail=document.createElement('div');const name=document.createElement('b');name.textContent=r.description;const sub=document.createElement('small');sub.textContent=fmtDate(r.transaction_date)+' · '+(r.categories?.name||'ไม่ระบุหมวด')+' · '+(r.accounts?.name||'ไม่ระบุบัญชี')+' · '+(r.status==='pending'?'รอดำเนินการ':'จ่าย/รับแล้ว');detail.append(name,sub);const amount=document.createElement('strong');amount.textContent=money(r.amount);amount.className=r.type==='income'?'income':'expense';row.append(detail,amount);section.append(row);});
  root.append(section);
 });
 $('insightDetailDialog').showModal();
}
return openInsightDetails;
}
export function bindTotal($,id,open){const el=$(id);if(!el)return;el.onclick=event=>{event?.stopPropagation();open();};}
