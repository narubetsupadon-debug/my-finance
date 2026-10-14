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
  const drivers=[...names].map(name=>{const current=currentRows.filter(x=>groupBy(x)===name),previous=previousRows.filter(x=>groupBy(x)===name),currentCents=sum(current),previousCents=sum(previous);return {name,currentRows:current,previousRows:previous,currentCents,previousCents,currentCount:current.length,previousCount:previous.length,currentAverageCents:current.length?Math.round(currentCents/current.length):null,previousAverageCents:previous.length?Math.round(previousCents/previous.length):null,deltaCents:currentCents-previousCents};}).sort((a,b)=>Math.abs(b.deltaCents)-Math.abs(a.deltaCents)||a.name.localeCompare(b.name,'th'));
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
 const largest=[...selected].sort((a,b)=>cents(b)-cents(a)||a.transaction_date.localeCompare(b.transaction_date)).slice(0,3);
 const frequent=[...ranking].sort((a,b)=>b.rows.length-a.rows.length||b.amountCents-a.amountCents).slice(0,3);
 const deep={count:selected.length,recordedDays:new Set(selected.map(x=>x.transaction_date)).size,averageCents:selected.length?Math.round(totalCents/selected.length):null,largest,largestCents:sum(largest),frequent,savings:[5,10,20].map(percent=>({percent,baseCents:sum(other),savedCents:Math.round(sum(other)*percent/100)}))};
 return {selected,totalCents,ranking,comparison,forecast,deep,split:{committed,other,committedCents:sum(committed),otherCents:sum(other),repayments:selectedRepayments,repaymentCents:sum(selectedRepayments)}};
}

export function createExpenseAnalysisRenderer({$,money,fmtDate,analyze=analyzeExpenses}){
 let savingsPercent=10;
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
  const deepRoot=$('analysisDeep');
  if(deepRoot){
   deepRoot.replaceChildren();
   const d=result.deep;
   if(!d.count)deepRoot.append(make('p','analysis-empty','ยังไม่มีรายการจ่ายแล้วสำหรับเจาะลึกในช่วงนี้'));
   else{
    const overview=make('article','analysis-card deep-section');overview.append(make('h4','','จ่ายบ่อย หรือจ่ายก้อนใหญ่?'));
    overview.append(make('p','analysis-period-note',d.count+' รายการ · บันทึก '+d.recordedDays+' วัน · เฉลี่ย '+money(d.averageCents/100)+'/รายการ'));
    overview.append(make('p','analysis-verdict','รายการใหญ่สุด (ไม่เกิน 3 รายการ) รวม '+money(d.largestCents/100)+' ('+(result.totalCents?d.largestCents/result.totalCents*100:0).toFixed(1)+'% ของรายจ่าย)'));
    for(const row of d.largest){const b=button('',()=>openDetails('รายจ่ายก้อนใหญ่',[{label:input.label,rows:[row]}],'รายการใหญ่ตามยอดที่บันทึก ไม่ได้หมายความว่าผิดปกติหรือไม่จำเป็น'));b.className='deep-item';b.append(make('span','',row.description||'ไม่ระบุชื่อ'),make('strong','money',money(row.amount)),make('small','',fmtDate(row.transaction_date)+' · '+input.groupBy(row)));overview.append(b);}
    overview.append(make('p','analysis-period-note','หมวดที่บันทึกบ่อย: '+d.frequent.map(g=>g.name+' '+g.rows.length+' รายการ').join(' · ')));
    overview.append(button('ดูรายการจ่ายจริงทั้งหมด ›',()=>openDetails('รายจ่ายที่ใช้วิเคราะห์',[{label:input.label,rows:result.selected}],'จำนวนวันคือวันที่มีรายการบันทึก ไม่ยืนยันว่าบันทึกครบทุกวัน')));deepRoot.append(overview);
    const drivers=make('article','analysis-card deep-section');drivers.append(make('h4','','หมวดไหนทำให้ยอดเปลี่ยน?'));
    if(c.state!=='ready')drivers.append(make('p','analysis-empty',c.state==='select_month'?'เลือกเดือนเดียวเพื่อดูการเปลี่ยนแปลงรายหมวด':'ต้องมีรายการจ่ายแล้วทั้งเดือนที่เลือกและเดือนก่อน จึงจะแยกสาเหตุได้'));
    else{
     drivers.append(make('p','analysis-period-note','เทียบวันที่ 1–'+c.cutoff+' ของสองเดือน · เรียงจากผลต่างมากที่สุด'));
     for(const g of c.drivers.filter(g=>g.deltaCents!==0)){
      const b=button('',()=>openDetails('เทียบหมวด '+g.name,[{label:monthLabel(c.month),rows:g.currentRows},{label:monthLabel(c.previousMonth),rows:g.previousRows}],'จำนวนครั้งหมายถึงจำนวนรายการที่บันทึก ไม่ยืนยันจำนวนครั้งที่ซื้อจริง; หมวดที่ไม่มีรายการไม่ถือว่าไม่ได้ใช้เงิน'));
      b.className='deep-item';b.append(make('span','',g.name),make('strong',(g.deltaCents>0?'expense':'income')+' money',(g.deltaCents>0?'+':'−')+money(Math.abs(g.deltaCents)/100)));
      b.append(make('small','',g.previousCount+' → '+g.currentCount+' รายการ · เฉลี่ย/รายการ '+(g.previousAverageCents===null?'ไม่มีรายการ':money(g.previousAverageCents/100))+' → '+(g.currentAverageCents===null?'ไม่มีรายการ':money(g.currentAverageCents/100))));
      const countDiff=g.currentCount-g.previousCount,averageDiff=(g.currentAverageCents||0)-(g.previousAverageCents||0);
      const reason=!g.previousCount?'เดือนก่อนยังไม่มีรายการหมวดนี้':!g.currentCount?'ช่วงนี้ยังไม่มีรายการหมวดนี้':countDiff>0&&averageDiff>0?'จำนวนรายการและยอดเฉลี่ยเพิ่มทั้งคู่':countDiff<0&&averageDiff<0?'จำนวนรายการและยอดเฉลี่ยลดทั้งคู่':countDiff===0?'จำนวนรายการเท่าเดิม ยอดเปลี่ยนตามค่าเฉลี่ย':averageDiff===0?'ค่าเฉลี่ยใกล้เดิม ยอดเปลี่ยนตามจำนวนรายการ':'จำนวนรายการและค่าเฉลี่ยเปลี่ยนสวนทางกัน';
      b.append(make('small','deep-reason',reason+' · ดูรายการ ›'));drivers.append(b);
     }
     if(c.drivers.every(g=>g.deltaCents===0))drivers.append(make('p','analysis-empty','ยอดทุกหมวดเท่ากันในสองช่วง'));
    }deepRoot.append(drivers);
    const savings=make('article','analysis-card deep-section');savings.append(make('h4','','ถ้าลองลดรายจ่ายอื่น จะเหลือเพิ่มเท่าไร?'));
    savings.append(make('p','analysis-period-note','จำลองกับรายจ่ายอื่น '+money(result.split.otherCents/100)+' ในช่วงที่เลือก แยกค่าห้อง บิล ค่างวดรถ และชำระบัตร/สินเชื่อออก'));
    const controls=make('div','deep-savings-controls');
    const scenario=d.savings.find(x=>x.percent===savingsPercent);
    for(const x of d.savings){const b=button('ลด '+x.percent+'%',()=>{savingsPercent=x.percent;render(input);});b.setAttribute('aria-pressed',String(x.percent===savingsPercent));controls.append(b);}savings.append(controls);
    savings.append(make('p','analysis-verdict income money','ประหยัดได้ '+money(scenario.savedCents/100)+' ในช่วงนี้'));
    for(const g of result.ranking.filter(g=>result.split.other.some(x=>g.rows.includes(x))).slice(0,3))savings.append(button(g.name+' · ถ้าลด '+savingsPercent+'% = '+money(Math.round(g.amountCents*savingsPercent/100)/100)+' ›',()=>openDetails('จำลองลดหมวด '+g.name,[{label:input.label,rows:g.rows}],'ใช้ฐานยอดที่จ่ายแล้วในช่วงนี้ × '+savingsPercent+'% เป็นตัวอย่าง ไม่แก้ยอดหรือบันทึกธุรกรรม')));
    savings.append(make('p','analysis-period-note','เป็นการจำลอง ไม่ใช่ยอดประหยัดจริง รายจ่ายอื่นอาจจำเป็นด้วย ไม่มีการเปลี่ยนข้อมูล และไม่คูณเป็นรายปีจากเดือนที่ยังบันทึกไม่ครบ'));deepRoot.append(savings);
   }
  }
  return result;
 };
}
