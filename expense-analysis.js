// Deterministic, local-only analysis. Amounts are aggregated in integer satang.
export function analyzeExpenses({transactions=[],budgets=[],config,today,groupBy=x=>x.categories?.name||'ไม่ระบุหมวด'}){
 const cents=x=>Math.round(Number(x.amount)*100),sum=rows=>rows.reduce((s,x)=>s+cents(x),0);
 const actual=transactions.filter(x=>x.type==='expense'&&!['cancelled','pending'].includes(x.status)&&/^\d{4}-\d{2}-\d{2}$/.test(String(x.transaction_date))&&x.transaction_date<=today&&Number.isFinite(Number(x.amount))&&Number(x.amount)>=0);
 const repayments=actual.filter(x=>groupBy(x)==='ชำระบัตร/สินเชื่อ');
 const spending=actual.filter(x=>groupBy(x)!=='ชำระบัตร/สินเชื่อ');
 const selected=spending.filter(x=>config.mode==='days'?x.transaction_date.slice(0,7)===config.monthKey:config.keys.includes(x.transaction_date.slice(0,7)));
 const groups=new Map();selected.forEach(x=>{const key=groupBy(x);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(x);});
 const totalCents=sum(selected),ranking=[...groups].map(([name,rows])=>({name,rows,amountCents:sum(rows),percent:totalCents?sum(rows)/totalCents*100:0})).sort((a,b)=>b.amountCents-a.amountCents||a.name.localeCompare(b.name,'th'));
 let comparison={state:'select_month'},forecast={state:'select_current_month',items:[]};
 if(config.mode==='days'){
  const month=config.monthKey,[y,m]=month.split('-').map(Number),current=today.slice(0,7),daysInMonth=new Date(y,m,0).getDate();
  const previousDate=new Date(y,m-2,1),previousMonth=previousDate.getFullYear()+'-'+String(previousDate.getMonth()+1).padStart(2,'0');
  const cutoff=Math.min(month===current?Number(today.slice(8,10)):daysInMonth,new Date(y,m-1,0).getDate());
  const currentRows=spending.filter(x=>x.transaction_date.slice(0,7)===month&&Number(x.transaction_date.slice(8,10))<=cutoff),previousRows=spending.filter(x=>x.transaction_date.slice(0,7)===previousMonth&&Number(x.transaction_date.slice(8,10))<=cutoff);
  const currentCents=sum(currentRows),previousCents=sum(previousRows),deltaCents=currentCents-previousCents;
  const names=new Set([...currentRows,...previousRows].map(groupBy));
  const drivers=[...names].map(name=>({name,currentCents:sum(currentRows.filter(x=>groupBy(x)===name)),previousCents:sum(previousRows.filter(x=>groupBy(x)===name))})).map(g=>({...g,deltaCents:g.currentCents-g.previousCents})).sort((a,b)=>b.deltaCents-a.deltaCents);
  comparison={drivers,state:month>current?'future':!currentRows.length||!previousRows.length?'insufficient':'ready',month,previousMonth,cutoff,currentRows,previousRows,currentCents,previousCents,deltaCents,percent:previousCents>0?deltaCents/previousCents*100:null};
  if(month===current){
   const elapsedDays=Number(today.slice(8,10)),monthRows=spending.filter(x=>x.transaction_date.slice(0,7)===month);
   const active=budgets.filter(b=>b.is_active);
   const items=active.map(b=>{
    const names=new Set(b.category_names||[]),rows=monthRows.filter(x=>names.has(x.categories?.name)),spentCents=sum(rows),limitCents=Math.round(Number(b.monthly_limit||0)*100),recordedDays=new Set(rows.map(x=>x.transaction_date)).size;
    const enough=elapsedDays>=7&&recordedDays>=3&&names.size>0&&limitCents>0;
    const projectedCents=enough?Math.round(spentCents/elapsedDays*daysInMonth):null;
    return {id:b.id,name:b.name,rows,spentCents,limitCents,recordedDays,elapsedDays,daysInMonth,daysRemaining:daysInMonth-elapsedDays,dailyAllowanceCents:daysInMonth>elapsedDays?Math.floor(Math.max(0,limitCents-spentCents)/(daysInMonth-elapsedDays)):null,projectedCents,remainingCents:limitCents-spentCents,state:limitCents<=0||!names.size?'needs_setup':spentCents>limitCents?'over_actual':!enough?'insufficient':projectedCents>limitCents?'over_projected':'within'};
   });
   forecast={state:items.length?'ready':'no_budget',items};
  }
 }
 const committedNames=new Set(['รายจ่ายประจำ','บิล/สาธารณูปโภค','ห้องเช่า','ค่างวดรถ']);
 const committed=selected.filter(x=>committedNames.has(groupBy(x))),other=selected.filter(x=>!committedNames.has(groupBy(x)));
 const selectedRepayments=repayments.filter(x=>config.mode==='days'?x.transaction_date.slice(0,7)===config.monthKey:config.keys.includes(x.transaction_date.slice(0,7)));
 return {selected,totalCents,ranking,comparison,forecast,split:{committed,other,committedCents:sum(committed),otherCents:sum(other),repayments:selectedRepayments,repaymentCents:sum(selectedRepayments)}};
}

export function createExpenseAnalysisRenderer({$,money,fmtDate,analyze=analyzeExpenses}){
 const monthLabel=m=>new Date(Number(m.slice(0,4)),Number(m.slice(5,7))-1,1).toLocaleDateString('th-TH',{month:'long',year:'numeric'});
 const make=(tag,cls,text)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=text;return el;};
 function openDetails(title,groups,note){
  $('insightDetailTitle').textContent=title;$('insightDetailNote').textContent=note;const body=$('insightDetailBody');body.replaceChildren();
  for(const group of groups){const section=make('section','insight-detail-group'),amount=group.rows.reduce((s,r)=>s+Math.round(Number(r.amount)*100),0)/100;section.append(make('h4','',group.label+' · '+money(amount)+' · '+group.rows.length+' รายการ'));
   if(!group.rows.length)section.append(make('p','muted','ไม่มีรายจ่ายที่จ่ายแล้วในช่วงนี้'));
   for(const row of [...group.rows].sort((a,b)=>b.transaction_date.localeCompare(a.transaction_date))){const line=make('div','insight-detail-row'),detail=make('div');detail.append(make('b','',row.description),make('small','',fmtDate(row.transaction_date)+' · '+(row.categories?.name||'ไม่ระบุหมวด')+' · '+(row.accounts?.name||'ไม่ระบุบัญชี')));line.append(detail,make('strong','expense money',money(row.amount)));section.append(line);}body.append(section);
  }$('insightDetailDialog').showModal();
 }
 function button(text,action){const b=make('button','analysis-detail-link',text);b.type='button';b.onclick=action;return b;}
 return function render(input){
  const result=analyze(input),{comparison:c,forecast:f}=result;
  $('analysisPeriod').textContent=input.label;
  const ranking=$('analysisRanking');ranking.replaceChildren();
  if(!result.ranking.length)ranking.append(make('p','analysis-empty','ยังไม่มีรายจ่ายที่จ่ายแล้วในช่วงนี้'));
  result.ranking.slice(0,3).forEach((g,i)=>{const b=button('',()=>openDetails('รายจ่ายหมวด '+g.name,[{label:input.label,rows:g.rows}],'ยอดเงินจ่ายออกจริง ไม่รวมรอดำเนินการ ยกเลิก และวันที่อนาคต'));b.className='analysis-category';const top=make('div','analysis-category-top'),name=make('span','analysis-category-name',(i+1)+'. '+g.name),amount=make('strong','money',money(g.amountCents/100));top.append(name,amount);const track=make('div','analysis-track'),bar=make('div','analysis-bar');bar.style.width=g.percent+'%';track.append(bar);b.append(top,track,make('small','',g.percent.toFixed(1)+'% ของรายจ่าย · '+g.rows.length+' รายการ · ดูรายการ ›'));ranking.append(b);});
  if(result.ranking.length>3)ranking.append(button('ดูรายจ่ายครบ '+result.ranking.length+' หมวด ›',()=>openDetails('รายจ่ายแยกหมวด',result.ranking.map(g=>({label:g.name,rows:g.rows})),'ยอดเงินจ่ายออกจริง · '+input.label)));
  const rentRows=result.selected.filter(x=>input.groupBy(x)==='ห้องเช่า'),rent=input.rentTotals(rentRows);
  $('analysisRentNote').hidden=!rentRows.length;$('analysisRentNote').textContent='ค่าห้อง: เงินจ่ายออกตามรายการ '+money(rentRows.reduce((s,x)=>s+Math.round(Number(x.amount)*100),0)/100)+' · ส่วนมิว '+money(rent.shareCents/100)+' · บิลรวมอ้างอิง '+money(rent.fullCents/100)+' (ตามวันที่จ่าย)';
  const comparison=$('analysisComparison');comparison.replaceChildren();
  if(c.state==='select_month')comparison.append(make('p','analysis-empty','เลือกเดือนเดียวเพื่อเทียบช่วงวันที่ตรงกันกับเดือนก่อน'));
  else if(c.state==='future')comparison.append(make('p','analysis-empty','เดือนที่เลือกยังมาไม่ถึง จึงยังเปรียบเทียบรายจ่ายจริงไม่ได้'));
  else{
   comparison.append(make('p','analysis-period-note','เทียบวันที่ 1–'+c.cutoff+' ของ '+monthLabel(c.month)+' กับ '+monthLabel(c.previousMonth)));
   const metrics=make('div','analysis-compare-values');for(const [label,value,hasData] of [[monthLabel(c.month),c.currentCents,c.currentRows.length],[monthLabel(c.previousMonth),c.previousCents,c.previousRows.length]]){const box=make('div');box.append(make('small','',label),make('strong',hasData?'money':'analysis-missing',hasData?money(value/100):'ไม่มีรายการ'));metrics.append(box);}comparison.append(metrics);
   if(c.state==='insufficient')comparison.append(make('p','analysis-empty','ยังเปรียบเทียบไม่ได้: ไม่มีรายจ่ายที่จ่ายแล้วในอย่างน้อยหนึ่งช่วง ไม่ถือว่าข้อมูลที่หายไปเท่ากับใช้เงินเป็นศูนย์'));
   else{const diff=c.deltaCents,headline=diff===0?'รายจ่ายเท่าเดิม':(diff>0?'เพิ่มขึ้น ':'ลดลง ')+money(Math.abs(diff)/100)+(c.percent===null?'':' ('+Math.abs(c.percent).toFixed(1)+'%)');comparison.append(make('p','analysis-verdict '+(diff>0?'expense':diff<0?'income':''),headline));}
   if(c.state==='ready'){const increases=c.drivers.filter(g=>g.deltaCents>0).slice(0,3);if(increases.length)comparison.append(make('p','analysis-period-note','หมวดที่เพิ่มขึ้น: '+increases.map(g=>g.name+' +'+money(g.deltaCents/100)).join(' · ')));else comparison.append(make('p','analysis-period-note','ไม่มีหมวดที่ใช้เพิ่มขึ้นในช่วงวันที่เท่ากัน'));}
   comparison.append(button('ดูรายการทั้งสองช่วง ›',()=>openDetails('เทียบรายจ่ายวันที่ 1–'+c.cutoff,[{label:monthLabel(c.month),rows:c.currentRows},{label:monthLabel(c.previousMonth),rows:c.previousRows}],'ช่วงวันที่เท่ากัน จากข้อมูลที่บันทึกไว้ ไม่ยืนยันว่าบันทึกครบทุกวัน')));
  }
  const forecast=$('analysisForecast');forecast.replaceChildren();
  if(f.state==='select_current_month')forecast.append(make('p','analysis-empty','เลือกเดือนปัจจุบันเพื่อประมาณงบถึงสิ้นเดือน'));
  else if(f.state==='no_budget')forecast.append(make('p','analysis-empty','ยังไม่มีงบที่เปิดใช้งาน ตั้งงบและเลือกหมวดในหน้างบประมาณก่อนค่ะ'));
  else for(const b of f.items){const box=make('div','analysis-budget'),head=make('div','analysis-budget-head');head.append(make('strong','',b.name),make('span','money',money(b.spentCents/100)+' / '+money(b.limitCents/100)));box.append(head);
   const text=b.state==='needs_setup'?'กำหนดวงเงินมากกว่าศูนย์และเลือกหมวดก่อน':b.state==='over_actual'?'ใช้เกินงบแล้ว '+money((b.spentCents-b.limitCents)/100):b.state==='insufficient'?'ยังไม่คาดการณ์: ต้องผ่านอย่างน้อย 7 วัน และมีรายจ่ายในงบอย่างน้อย 3 วัน':b.state==='over_projected'?'หากใช้ในอัตราเดิม อาจเกินงบ '+money((b.projectedCents-b.limitCents)/100):'หากใช้ในอัตราเดิม คาดว่ายังอยู่ในงบ';
   box.append(make('p','analysis-budget-verdict '+(['over_actual','over_projected'].includes(b.state)?'expense':''),text));
   if(b.state!=='needs_setup')box.append(make('p','analysis-period-note','งบเหลือ '+money(Math.max(0,b.remainingCents)/100)+(b.daysRemaining>0?' · เหลือ '+b.daysRemaining+' วัน · เฉลี่ยใช้ได้อีกวันละ '+money(b.dailyAllowanceCents/100)+' ตั้งแต่พรุ่งนี้':' · วันนี้เป็นวันสุดท้ายของเดือน')));
   if(b.projectedCents!==null)box.append(make('p','analysis-period-note','ประมาณปลายเดือน '+money(b.projectedCents/100)+' · เฉลี่ย '+money(b.spentCents/100/b.elapsedDays)+'/วัน'));
   box.append(button('ดูรายการที่นับในงบ ›',()=>openDetails('รายจ่ายในงบ '+b.name,[{label:input.label,rows:b.rows}],'นับเฉพาะหมวดที่ตั้งไว้ในงบนี้ และเฉพาะรายจ่ายที่จ่ายแล้ว')));forecast.append(box);
  }
  const split=$('analysisSplit');if(split){split.replaceChildren();for(const [label,rows,value] of [['บิล ค่าห้อง และค่างวดรถ',result.split.committed,result.split.committedCents],['รายจ่ายอื่นที่ลองทบทวนได้',result.split.other,result.split.otherCents],['ชำระบัตร/สินเชื่อ (แยกจากยอดวิเคราะห์)',result.split.repayments,result.split.repaymentCents]]){const box=make('div','analysis-budget');box.append(make('strong','',label),make('p','money',money(value/100)),button('ดูรายการ ›',()=>openDetails(label,[{label:input.label,rows}],'จำแนกจากหมวดที่บันทึก ไม่ยืนยันว่าทุกรายการลดได้')));split.append(box);}split.append(make('p','analysis-period-note','เป็นยอดจ่ายแล้ว ไม่ใช่บิลที่ต้องจ่ายทั้งหมด ค่าห้องใช้ยอดรายการจริง ส่วนของมิวดูในหมายเหตุค่าห้อง; รายจ่ายอื่นอาจมีรายการจำเป็นด้วย'));}
  return result;
 };
}
