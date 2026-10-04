// Dashboard/Home renderer. Keeps Home calculations and insight UI out of app.js.
export function createDashboardRenderer({
 $,money,fmtDate,esc,bangkokDate,bangkokDay,billDue,nextDueDate,
 getTransactions,getDebts,getUiSettings,budgetTotals,orderedQuickItems,
 showPage,renderTxList,refreshDailyGreeting
}){
function renderDashboard(){
 const transactions=getTransactions(),debts=getDebts(),uiSettings=getUiSettings();
 refreshDailyGreeting();
 const now=bangkokDate(),today=bangkokDay(),y=now.getFullYear(),m=now.getMonth()
 const monthly=transactions.filter(x=>{const d=new Date(x.transaction_date+'T00:00:00');return d.getFullYear()===y&&d.getMonth()===m&&x.status!=='cancelled'})
 const prevDate=new Date(y,m-1,1),py=prevDate.getFullYear(),pm=prevDate.getMonth()
 const previous=transactions.filter(x=>{const d=new Date(x.transaction_date+'T00:00:00');return d.getFullYear()===py&&d.getMonth()===pm&&x.status!=='cancelled'})
 const inc=monthly.filter(x=>x.type==='income').reduce((s,x)=>s+Number(x.amount),0)
 const exp=monthly.filter(x=>x.type==='expense').reduce((s,x)=>s+Number(x.amount),0)
 const prevExp=previous.filter(x=>x.type==='expense').reduce((s,x)=>s+Number(x.amount),0)
 const todayRows=monthly.filter(x=>x.type==='expense'&&x.transaction_date===today),todaySpent=todayRows.reduce((s,x)=>s+Number(x.amount),0)
 const bsum=budgetTotals(),dailyLeft=bsum.daily,pct=bsum.limit?Math.min(100,bsum.spent/bsum.limit*100):0
 $('nextBillCard')?.classList.toggle('hidden',uiSettings.dueReminder===false);
 $('upcomingList')?.closest('details')?.classList.toggle('hidden',uiSettings.dueReminder===false);
 document.querySelector('.budget-panel')?.classList.toggle('budget-panel-warning',uiSettings.budgetReminder!==false&&bsum.limit>0&&bsum.spent/bsum.limit>=.8);
 $('todayLabel').textContent=now.toLocaleDateString('th-TH',{weekday:'long',day:'numeric',month:'long',year:'numeric'})
 $('monthLabel').textContent=now.toLocaleDateString('th-TH',{month:'long',year:'numeric'})
 $('todaySpent').textContent=money(todaySpent);$('todayCount').textContent=todayRows.length+' รายการ'
 $('todayCanSpend').textContent=money(dailyLeft);$('todayCanSpendHint').textContent=bsum.limit?'จากงบเฉลี่ยต่อวันที่เหลือ':'ยังไม่ได้ตั้งงบ'
 $('incomeTotal').textContent=money(inc);$('expenseTotal').textContent=money(exp);$('balanceTotal').textContent=money(inc-exp)
 $('debtTotal').textContent=money(debts.filter(x=>x.is_active).reduce((s,x)=>s+Number(x.outstanding_amount||0),0))
 $('budgetSpentDash').textContent=money(bsum.spent);$('budgetLimitDash').textContent=money(bsum.limit);$('budgetRemainDash').textContent=money(bsum.remain);$('budgetDailyDash').textContent='ใช้ได้เฉลี่ยวันละ '+money(bsum.daily)
 $('homeBudgetStatus').textContent=!bsum.limit?'ยังไม่ได้ตั้งงบ · แตะเพื่อเริ่ม':bsum.spent>bsum.limit?'เกินงบ '+money(bsum.spent-bsum.limit):'เฉลี่ยได้อีกวันละ '+money(bsum.daily);
 $('homeBudgetStatus').classList.toggle('is-over',bsum.spent>bsum.limit);
 $('budgetRemainDash').textContent=bsum.limit?money(bsum.remain):'ยังไม่ตั้งงบ';
 $('viewToday').onclick=()=>openInsightDetails('รายจ่ายวันนี้',[{label:fmtDate(today),rows:todayRows}],'รายการที่บันทึกวันนี้ ไม่รวมรายการยกเลิก');
 $('budgetPctDash').textContent=Math.round(pct)+'%';$('budgetProgressDash').style.width=pct+'%';$('budgetProgressDash').classList.toggle('over',bsum.spent>bsum.limit)

 const quick=orderedQuickItems().filter(x=>!uiSettings.quickHidden.includes(x.label))
 $('quickAdd').innerHTML=quick.map(({icon,label,desc})=>'<button class="quick-btn" onclick="quickAdd(\''+label+'\',\''+desc+'\')"><span>'+icon+'</span><b>'+label+'</b></button>').join('')+'<button class="quick-btn more" onclick="openTx()"><span>＋</span><b>อื่น ๆ</b></button>'

 const sums={};monthly.filter(x=>x.type==='expense').forEach(x=>{const n=x.categories?.name||'อื่นๆ';sums[n]=(sums[n]||0)+Number(x.amount)})
 const sorted=Object.entries(sums).sort((a,b)=>b[1]-a[1]),top=sorted[0]

 const insights=[];
 const cutoff=Math.min(now.getDate(),new Date(y,m,0).getDate());
 const currentComparable=monthly.filter(x=>x.type==='expense'&&Number(x.transaction_date.slice(8,10))<=cutoff);
 const priorComparable=previous.filter(x=>x.type==='expense'&&Number(x.transaction_date.slice(8,10))<=cutoff);
 const currentSum=currentComparable.reduce((s,x)=>s+Number(x.amount),0),priorSum=priorComparable.reduce((s,x)=>s+Number(x.amount),0);
 if(top)insights.push({text:'เดือนนี้ใช้มากสุดที่ '+top[0]+' '+money(top[1]),icon:'✨',open:()=>openInsightDetails('รายจ่ายหมวด '+top[0],[{label:'เดือนนี้ · '+top[0],rows:monthly.filter(x=>x.type==='expense'&&(x.categories?.name||'อื่นๆ')===top[0])}],'ไม่รวมรายการยกเลิก')});
 if(priorSum>0){const diff=(currentSum-priorSum)/priorSum*100;insights.push({text:diff===0?'รายจ่ายเท่ากับเดือนก่อนในช่วงเดียวกัน':('รายจ่าย'+(diff>0?'เพิ่มขึ้น ':'ลดลง ')+Math.abs(diff).toFixed(0)+'% ในช่วงเดียวกัน'),icon:'📊',open:()=>openInsightDetails('เทียบรายจ่ายช่วงวันที่ 1–'+cutoff,[{label:now.toLocaleDateString('th-TH',{month:'long',year:'numeric'}),rows:currentComparable},{label:prevDate.toLocaleDateString('th-TH',{month:'long',year:'numeric'}),rows:priorComparable}],'เทียบช่วงวันที่เท่ากันของสองเดือน จากรายการที่บันทึกไว้ ไม่รวมรายการยกเลิก')});}
 if(bsum.limit)insights.push({text:bsum.spent>bsum.limit?'ใช้เกินงบรวม '+money(bsum.spent-bsum.limit):'งบรวมยังเหลือ '+money(bsum.remain),icon:'🎯',open:()=>showPage('budget')});
 if(inc>0)insights.push({text:'รายรับหักรายจ่ายเดือนนี้ '+money(inc-exp),icon:'💙',open:()=>openInsightDetails('รายรับและรายจ่ายเดือนนี้',[{label:'รายรับ',rows:monthly.filter(x=>x.type==='income')},{label:'รายจ่าย',rows:monthly.filter(x=>x.type==='expense')}],'ผลต่าง '+money(inc-exp)+' จากรายการที่บันทึกในเดือนนี้ ไม่ใช่ยอดเงินคงเหลือทุกบัญชี')});
 const insightRoot=$('insightList');insightRoot.replaceChildren();
 if(!insights.length){const empty=document.createElement('div');empty.className='empty';empty.textContent='เริ่มบันทึกรายการ แล้วนิลินจะสรุปให้ตรงนี้ ✨';insightRoot.append(empty);}
 insights.slice(0,4).forEach(item=>{const b=document.createElement('button');b.type='button';b.className='insight-item insight-link';const icon=document.createElement('span');icon.textContent=item.icon;icon.setAttribute('aria-hidden','true');const text=document.createElement('div');text.textContent=item.text;const hint=document.createElement('small');hint.textContent='ดูรายละเอียด ›';text.append(document.createElement('br'),hint);b.append(icon,text);b.onclick=item.open;insightRoot.append(b);});

 const upcoming=[
  ...bills.filter(x=>x.is_active).map(x=>({kind:'บิล',name:x.name,amount:Number(x.amount||0),due:billDue(x)})),
  ...debts.filter(x=>x.is_active&&Number(x.outstanding_amount||0)>0).map(x=>({kind:'บัตร/สินเชื่อ',name:x.name,amount:Number(x.installment_amount||0)||null,due:nextDueDate(x.due_day)}))
 ].filter(x=>x.due).sort((a,b)=>a.due-b.due).slice(0,5)
 const next=upcoming[0];
 $('nextBillName').textContent=next?next.name:'ยังไม่มีวันครบกำหนด';
 $('nextBillAmount').textContent=next?(next.amount===null?'ยังไม่ระบุยอด':money(next.amount)):'—';
 if(next){const days=Math.round((next.due-new Date(y,m,now.getDate()))/86400000);$('nextBillDate').textContent=(days<0?'เลยกำหนด '+Math.abs(days)+' วัน':days===0?'ครบกำหนดวันนี้':'อีก '+days+' วัน')+' · '+next.due.toLocaleDateString('th-TH',{day:'numeric',month:'short'});$('nextBillDate').classList.toggle('is-over',days<=0);}
 else{$('nextBillDate').textContent='แตะเพื่อจัดการบิลและวันครบกำหนด';$('nextBillDate').classList.remove('is-over');}
 $('nextBillCard').onclick=()=>showPage(next?.kind==='บัตร/สินเชื่อ'?'debts':'bills');
 $('upcomingList').innerHTML=upcoming.length?upcoming.map(x=>{const days=Math.ceil((x.due-new Date(y,m,now.getDate()))/86400000);return '<div class="upcoming-item"><div><b>'+esc(x.name)+'</b><div class="muted">'+x.kind+' · '+(days===0?'วันนี้':days<0?'เลยกำหนด '+Math.abs(days)+' วัน':'อีก '+days+' วัน')+'</div></div><div><b>'+(x.amount===null?'ยังไม่ระบุยอดรอบนี้':money(x.amount))+'</b><div class="muted">'+x.due.toLocaleDateString('th-TH',{day:'numeric',month:'short'})+'</div></div></div>'}).join(''):'<div class="empty">ไม่มีรายการใกล้ครบกำหนด 🎉</div>'

 renderTxList($('recentList'),transactions.slice(0,5),true)
 const max=Math.max(1,...Object.values(sums));$('categoryChart').innerHTML=Object.keys(sums).length?sorted.slice(0,8).map(([n,v])=>'<div class="bar-row"><span>'+esc(n)+'</span><div class="barbg"><div class="barfill" style="width:'+Math.round(v/max*100)+'%"></div></div><b>'+money(v)+'</b></div>').join(''):'<div class="empty">ยังไม่มีรายจ่ายเดือนนี้</div>'
}

function openInsightDetails(title,groups,note){
 $('insightDetailTitle').textContent=title;$('insightDetailNote').textContent=note;
 const root=$('insightDetailBody');root.replaceChildren();
 groups.forEach(group=>{
  const section=document.createElement('section');section.className='insight-detail-group';
  const heading=document.createElement('h4');const sum=group.rows.reduce((s,r)=>s+Number(r.amount),0);
  heading.textContent=group.label+' · '+money(sum)+' · '+group.rows.length+' รายการ';section.append(heading);
  if(!group.rows.length){const p=document.createElement('p');p.className='muted';p.textContent='ไม่มีรายการที่บันทึกในช่วงนี้';section.append(p);}
  group.rows.forEach(r=>{const row=document.createElement('div');row.className='insight-detail-row';const detail=document.createElement('div');const name=document.createElement('b');name.textContent=r.description;const sub=document.createElement('small');sub.textContent=fmtDate(r.transaction_date)+' · '+(r.categories?.name||'ไม่ระบุหมวด')+' · '+(r.accounts?.name||'ไม่ระบุบัญชี');detail.append(name,sub);const amount=document.createElement('strong');amount.textContent=money(r.amount);amount.className=r.type==='income'?'income':'expense';row.append(detail,amount);section.append(row);});
  root.append(section);
 });
 $('insightDetailDialog').showModal();
}


 return renderDashboard;
}
