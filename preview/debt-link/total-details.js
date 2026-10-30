function createTotalDetails({$,money,fmtDate}){
function openInsightDetails(title,groups,note){
 $('insightDetailTitle').textContent=title;$('insightDetailNote').textContent=note;
 const root=$('insightDetailBody');root.replaceChildren();
 groups.forEach(group=>{
  const section=document.createElement('section');section.className='insight-detail-group';
  const heading=document.createElement('h4');const sum=group.rows.reduce((s,r)=>s+Math.round(Number(r.amount)*100),0)/100;
  heading.textContent=group.label+' · '+money(sum)+' · '+group.rows.length+' รายการ';section.append(heading);
  if(!group.rows.length){const p=document.createElement('p');p.className='muted';p.textContent='ไม่มีรายการที่บันทึกในช่วงนี้';section.append(p);}
  const body=document.createElement('div'),progress=document.createElement('p'),more=document.createElement('button');
  progress.className='muted';progress.setAttribute('role','status');more.type='button';more.className='btn soft';more.textContent='แสดงอีก 100 รายการ';
  let shown=0;
  function appendNext(){
   const end=Math.min(shown+100,group.rows.length),fragment=document.createDocumentFragment();
   for(const r of group.rows.slice(shown,end)){const row=document.createElement('div');row.className='insight-detail-row';const detail=document.createElement('div');const name=document.createElement('b');name.textContent=r.description;const sub=document.createElement('small');sub.textContent=fmtDate(r.transaction_date)+' · '+(r.categories?.name||'ไม่ระบุหมวด')+' · '+(r.accounts?.name||'ไม่ระบุบัญชี')+' · '+(r.status==='pending'?'รอดำเนินการ':'จ่าย/รับแล้ว');detail.append(name,sub);const amount=document.createElement('strong');amount.textContent=money(r.amount);amount.className=r.type==='income'?'income':'expense';row.append(detail,amount);fragment.append(row);}
   body.append(fragment);shown=end;progress.textContent='แสดง '+shown+' จาก '+group.rows.length+' รายการ';more.hidden=shown>=group.rows.length;more.textContent='แสดงอีก '+Math.min(100,group.rows.length-shown)+' รายการ';
  }
  more.onclick=appendNext;appendNext();section.append(body);
  if(group.rows.length>100)section.append(progress,more);
  root.append(section);
 });
 $('insightDetailDialog').showModal();
}
return openInsightDetails;
}
function bindTotal($,id,open){const el=$(id);if(!el)return;el.onclick=event=>{event?.stopPropagation();open();};}
