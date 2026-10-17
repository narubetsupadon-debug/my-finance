import {sumTransactionAmounts} from './finance-core.js?v=20261017-quotes63';
import {createTotalDetails,bindTotal} from './total-details.js?v=20261017-quotes63';
// Current-month charts end at today; retain any explicitly recorded later date.
export function summaryTimelineKeys(config,today,rows=[]){
 if(config.mode!=='days')return config.keys;
 const lastDay=new Date(Number(config.monthKey.slice(0,4)),Number(config.monthKey.slice(5,7)),0).getDate();
 let count=lastDay;
 if(config.monthKey===today.slice(0,7)){
  const recordedDays=rows.filter(x=>x.status!=='cancelled'&&String(x.transaction_date).slice(0,7)===config.monthKey).map(x=>Number(String(x.transaction_date).slice(8,10))).filter(n=>Number.isInteger(n)&&n>=1&&n<=lastDay);
  count=Math.max(Number(today.slice(8,10)),...recordedDays);
 }
 return Array.from({length:count},(_,i)=>config.monthKey+'-'+String(i+1).padStart(2,'0'));
}
// Excel rent imports already contain the user's half, not the full bill.
export function rentShareTotals(rows,records=[]){
 const linked=new Map(records.map(r=>[r.transaction_id,r]));
 return rows.filter(x=>x.status!=='cancelled').reduce((out,x)=>{
  const cents=Math.round(Number(x.amount||0)*100);
  const importedShare=x.source==='import_r3_v2';
  out.shareCents+=linked.has(x.id)?Math.round(Number(linked.get(x.id).my_amount)*100):importedShare?cents:Math.round(cents/2);
  out.fullCents+=importedShare?cents*2:cents;
  return out;
 },{shareCents:0,fullCents:0});
}
// Summary page renderer. Keeps summary grouping and chart state out of app.js.
export function createSummaryRenderer({$,money,esc,bangkokDay,getTransactions,getRentRecords=()=>[],ChartCtor=null}){
 const openTotals=createTotalDetails({$,money,fmtDate:date=>date});
 let pieChart=null,lastReport=null,chartSignature='',yearChoices='',monthChoicesReady=false;
 const monthNames=new Intl.DateTimeFormat('th-TH',{month:'long'});

function excelGroup(x){
 if(x.source==='rent')return 'ห้องเช่า'
 const cat=x.categories?.name||'อื่นๆ',text=((x.description||'')+' '+(x.note||'')).toLowerCase()
 if(['ที่พัก','ห้องเช่า','บ้าน','ค่าห้องเช่า','ค่าห้อง','ค่าเช่า'].includes(cat))return 'ห้องเช่า'
 if(cat==='หนี้/ผ่อน')return 'ชำระบัตร/สินเชื่อ'
 if(cat==='บิล/สาธารณูปโภค')return 'รายจ่ายประจำ'
 if(cat==='รถยนต์'){
  if(/ค่างวด|ผ่อนรถ|รถ – มิว|รถ - มิว/.test(text))return 'ค่างวดรถ'
  if(/น้ำมัน/.test(text))return 'น้ำมันรถ'
  if(/ซ่อม|ประกัน|ภาษี|พ\.ร\.บ|เช็กระยะ|เช็คระยะ|บำรุง/.test(text))return 'ซ่อม/ประกัน/ภาษีรถ'
  if(/ทางด่วน|ที่จอด|ล้างรถ/.test(text))return 'ค่าใช้รถอื่น ๆ'
  return 'รถยนต์อื่น ๆ'
 }
 return cat
}
let selectedRange='month'

function monthKeyOffset(key,offset){
 const y=Number(key.slice(0,4)),m=Number(key.slice(5,7))-1
 const d=new Date(y,m+offset,1)
 return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')
}
function rangeConfig(today=bangkokDay()){
 const currentMonth=today.slice(0,7),year=today.slice(0,4)
 if(selectedRange==='3m'||selectedRange==='6m'){
  const count=selectedRange==='3m'?3:6
  const keys=Array.from({length:count},(_,i)=>monthKeyOffset(currentMonth,i-(count-1)))
  return{mode:'months',keys,label:(count===3?'3 เดือนล่าสุด':'6 เดือนล่าสุด'),badge:'รายเดือน'}
 }
 if(selectedRange==='year'){
  const keys=Array.from({length:12},(_,i)=>year+'-'+String(i+1).padStart(2,'0'))
  return{mode:'months',keys,label:'ปี '+new Date(Number(year),0,1).toLocaleDateString('th-TH',{year:'numeric'}),badge:'รายเดือน'}
 }
 if(selectedRange==='custom'){
  const y=$('summaryYear').value||year,m=$('summaryMonth').value||'all'
  if(m==='all')return{mode:'months',keys:Array.from({length:12},(_,i)=>y+'-'+String(i+1).padStart(2,'0')),label:'ปี '+new Date(Number(y),0,1).toLocaleDateString('th-TH',{year:'numeric'}),badge:'รายเดือน'}
  return{mode:'days',monthKey:y+'-'+m,label:new Date(Number(y),Number(m)-1,1).toLocaleDateString('th-TH',{month:'long',year:'numeric'}),badge:'รายวัน'}
 }
 return{mode:'days',monthKey:currentMonth,label:new Date(Number(year),Number(currentMonth.slice(5,7))-1,1).toLocaleDateString('th-TH',{month:'long',year:'numeric'}),badge:'รายวัน'}
}
function setupSummaryFilters(today){
 const transactions=getTransactions()
 const years=[...new Set([today.slice(0,4),...transactions.map(x=>String(x.transaction_date).slice(0,4)).filter(Boolean)])].sort((a,b)=>b.localeCompare(a))
 const ys=$('summaryYear'),current=ys.value||today.slice(0,4),nextYears=years.join('|');
 if(nextYears!==yearChoices){ys.innerHTML=years.map(y=>'<option value="'+y+'">'+y+'</option>').join('');yearChoices=nextYears;}
 ys.value=years.includes(current)?current:years[0];
 const ms=$('summaryMonth'),mv=ms.value||today.slice(5,7);
 if(!monthChoicesReady){ms.innerHTML='<option value="all">ทั้งปี</option>'+Array.from({length:12},(_,i)=>{const v=String(i+1).padStart(2,'0'),label=monthNames.format(new Date(2026,i,1));return '<option value="'+v+'">'+label+'</option>'}).join('');monthChoicesReady=true;}
 ms.value=mv;
}
function renderSummary(){
 const transactions=getTransactions(),today=bangkokDay();
 setupSummaryFilters(today)
 const paidOnly=$('summaryStatus')?.value==='paid';
 const config=rangeConfig(today),valid=transactions.filter(x=>x.status!=='cancelled'&&(!paidOnly||((x.status||'paid')==='paid'&&String(x.transaction_date)<=today)))
 const scope=paidOnly?'เฉพาะรับ/จ่ายแล้วถึงวันนี้':'รวมรอดำเนินการและวันที่อนาคต';
 if($('summaryScope'))$('summaryScope').textContent=scope+' · ไม่รวมยกเลิก · รวมยอดชำระบัตร/สินเชื่อ · แตะยอดดูรายการ';
 const rows=config.mode==='days'
  ?valid.filter(x=>String(x.transaction_date).slice(0,7)===config.monthKey)
  :valid.filter(x=>config.keys.includes(String(x.transaction_date).slice(0,7)))
 lastReport={label:config.label,scope:scope+' · ไม่รวมยกเลิก',paidOnly,mode:config.mode,
  keys:[...summaryTimelineKeys(config,today,rows)],
  rows:rows.map(x=>({transaction_date:x.transaction_date,type:x.type,amount:x.amount,description:x.description,status:x.status,reportCategory:excelGroup(x)}))};
 const inc=sumTransactionAmounts(rows,'income'),exp=sumTransactionAmounts(rows,'expense')
 $('sumIncome').textContent=money(inc);$('sumExpense').textContent=money(exp);$('sumBalance').textContent=money(inc-exp)
 $('summaryPeriodText').textContent='กำลังดู '+config.label
 $('sumIncomeHint').textContent=config.label;$('sumExpenseHint').textContent=config.label
 $('sumBalanceHint').textContent=inc-exp>=0?'ยังเหลือ '+(inc?((inc-exp)/inc*100).toFixed(0):0)+'% ของรายรับ':'รายจ่ายมากกว่ารายรับ'
 document.querySelectorAll('[data-summary-range]').forEach(b=>{const active=b.dataset.summaryRange===selectedRange;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active))})
 $('summaryCustomFilters').classList.toggle('hidden',selectedRange!=='custom')

 const grouped=rows.filter(x=>x.type==='expense').reduce((o,x)=>{const g=excelGroup(x);o[g]=(o[g]||0)+Number(x.amount);return o},{})
 $('sumDebtPay').textContent=money(grouped['ชำระบัตร/สินเชื่อ']||0)
 const rent=rentShareTotals(rows.filter(x=>x.type==='expense'&&excelGroup(x)==='ห้องเช่า'),getRentRecords())
 const carTotal=(grouped['ค่างวดรถ']||0)+(grouped['น้ำมันรถ']||0)+(grouped['ซ่อม/ประกัน/ภาษีรถ']||0)+(grouped['ค่าใช้รถอื่น ๆ']||0)+(grouped['รถยนต์อื่น ๆ']||0)
 $('sumRent').textContent=money(rent.shareCents/100)
 $('sumRentFull').textContent=money(rent.fullCents/100)
 $('sumCar').textContent=money(carTotal)
 $('sumCarInstallment').textContent=money(grouped['ค่างวดรถ']||0)
 $('sumCarOther').textContent=money(carTotal-(grouped['ค่างวดรถ']||0))
 $('sumRecurring').textContent=money(grouped['รายจ่ายประจำ']||0)
 const criteria=config.label+' · '+scope+' · ไม่รวมยกเลิก';
 const incomeRows=rows.filter(x=>x.type==='income'),expenseRows=rows.filter(x=>x.type==='expense');
 const show=(id,title,selected,note=criteria)=>bindTotal($,id,()=>openTotals(title,[{label:title,rows:selected}],note));
 show('sumIncome','รายรับ',incomeRows);show('sumExpense','รายจ่าย',expenseRows);
 bindTotal($,'sumBalance',()=>openTotals('รายรับหักรายจ่าย',[{label:'รายรับ',rows:incomeRows},{label:'รายจ่าย',rows:expenseRows}],criteria+' · ผลต่าง '+money(inc-exp)));
 show('sumDebtPay','ชำระบัตร/สินเชื่อ',expenseRows.filter(x=>excelGroup(x)==='ชำระบัตร/สินเชื่อ'));
 show('sumRecurring','รายจ่ายประจำ',expenseRows.filter(x=>excelGroup(x)==='รายจ่ายประจำ'));
 const carRows=expenseRows.filter(x=>['ค่างวดรถ','น้ำมันรถ','ซ่อม/ประกัน/ภาษีรถ','ค่าใช้รถอื่น ๆ','รถยนต์อื่น ๆ'].includes(excelGroup(x)));
 show('sumCar','ค่าใช้จ่ายรถ',carRows);
 show('sumRent','รายการอ้างอิงค่าห้องเช่า',expenseRows.filter(x=>excelGroup(x)==='ห้องเช่า'),criteria+' · การ์ดแสดงส่วนมิว '+money(rent.shareCents/100)+' / บิลรวมอ้างอิง '+money(rent.fullCents/100)+' · รายการด้านล่างแสดงยอดที่บันทึก ส่วนมิวใช้ยอดที่ระบุในประวัติค่าห้อง หรือครึ่งบิล; ข้อมูลนำเข้าเดิมเป็นส่วนมิวอยู่แล้ว');
 const chartTextColor=document.documentElement?.dataset.resolvedTheme==='dark'?'#cbd5e1':'#475569';
 const palette=['#6366f1','#f59e0b','#ef4444','#06b6d4','#8b5cf6','#10b981'];
 const allCategories=Object.entries(grouped).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]);
 const pieCats=allCategories.length>6?[...allCategories.slice(0,5),['หมวดที่เหลือ',allCategories.slice(5).reduce((sum,[,value])=>sum+value,0)]]:allCategories;
 const expenseTotal=pieCats.reduce((sum,[,value])=>sum+Number(value),0)
 const expensePercent=value=>expenseTotal>0?(Number(value)/expenseTotal*100):0
 $('summaryPieEmpty').hidden=pieCats.length>0;
 $('categoryPieChart').parentElement.hidden=pieCats.length===0;
 const nextSignature=JSON.stringify([pieCats,chartTextColor,document.body?.classList.contains('privacy-mode')]);
 if(!pieCats.length){if(pieChart)pieChart.destroy();pieChart=null;chartSignature='';}
 if(ChartCtor&&pieCats.length&&nextSignature!==chartSignature){
 const chartConfig={type:'doughnut',data:{labels:pieCats.map(x=>x[0]),datasets:[{data:pieCats.map(x=>x[1]),backgroundColor:pieCats.map((_,i)=>palette[i%palette.length]),borderWidth:0}]},options:{color:chartTextColor,responsive:true,maintainAspectRatio:false,animation:{duration:180},cutout:'66%',plugins:{legend:{position:'bottom',labels:{color:chartTextColor,boxWidth:12,usePointStyle:true,generateLabels:chart=>{const ds=chart.data.datasets[0]||{data:[]};return chart.data.labels.map((label,i)=>({text:label+' '+expensePercent(ds.data[i]).toFixed(1)+'%',fontColor:chartTextColor,fillStyle:ds.backgroundColor[i],strokeStyle:ds.backgroundColor[i],lineWidth:0,hidden:!chart.getDataVisibility(i),index:i}))}}},tooltip:{callbacks:{label:c=>c.label+': '+money(c.raw)+' ('+expensePercent(c.raw).toFixed(1)+'%)'}}}}};
 if(pieChart&&typeof pieChart.update==='function'&&JSON.stringify(pieChart.data.labels)===JSON.stringify(chartConfig.data.labels)){pieChart.data=chartConfig.data;pieChart.options=chartConfig.options;pieChart.update('none');}
 else{if(pieChart)pieChart.destroy();pieChart=new ChartCtor($('categoryPieChart'),chartConfig);}
 chartSignature=nextSignature;
 }


}
renderSummary.setRange=range=>{selectedRange=range;renderSummary()}
// Snapshot the same rows and status scope used by the visible summary totals.
renderSummary.getReport=()=>lastReport?{...lastReport,keys:[...lastReport.keys],rows:lastReport.rows.map(x=>({...x}))}:null;


 return renderSummary;
}

