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
// Summary page renderer. Keeps summary grouping and chart state out of app.js.
export function createSummaryRenderer({$,money,esc,bangkokDay,getTransactions,ChartCtor=null}){
 let trendChart=null,categoryChart2=null,pieChart=null;

function excelGroup(x){
 const cat=x.categories?.name||'อื่นๆ',text=((x.description||'')+' '+(x.note||'')).toLowerCase()
 if(['ที่พัก','ห้องเช่า','บ้าน','ห้องเช่า','ค่าเช่า'].includes(cat))return 'ห้องเช่า'
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
function rangeConfig(){
 const today=bangkokDay(),currentMonth=today.slice(0,7),year=today.slice(0,4)
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
function setupSummaryFilters(){
 const transactions=getTransactions()
 const years=[...new Set([bangkokDay().slice(0,4),...transactions.map(x=>String(x.transaction_date).slice(0,4)).filter(Boolean)])].sort((a,b)=>b.localeCompare(a))
 const ys=$('summaryYear'),current=ys.value||bangkokDay().slice(0,4)
 ys.innerHTML=years.map(y=>'<option value="'+y+'" '+(y===current?'selected':'')+'>'+y+'</option>').join('')
 if(!ys.value&&years.length)ys.value=years[0]
 const ms=$('summaryMonth'),mv=ms.value||bangkokDay().slice(5,7)
 ms.innerHTML='<option value="all">ทั้งปี</option>'+Array.from({length:12},(_,i)=>{const v=String(i+1).padStart(2,'0'),label=new Date(2026,i,1).toLocaleDateString('th-TH',{month:'long'});return '<option value="'+v+'" '+(v===mv?'selected':'')+'>'+label+'</option>'}).join('')
}
function renderSummary(){
 const transactions=getTransactions()
 setupSummaryFilters()
 const config=rangeConfig(),valid=transactions.filter(x=>x.status!=='cancelled')
 const rows=config.mode==='days'
  ?valid.filter(x=>String(x.transaction_date).slice(0,7)===config.monthKey)
  :valid.filter(x=>config.keys.includes(String(x.transaction_date).slice(0,7)))
 const inc=rows.filter(x=>x.type==='income').reduce((s,x)=>s+Number(x.amount),0),exp=rows.filter(x=>x.type==='expense').reduce((s,x)=>s+Number(x.amount),0)
 $('sumIncome').textContent=money(inc);$('sumExpense').textContent=money(exp);$('sumBalance').textContent=money(inc-exp)
 $('summaryPeriodText').textContent='กำลังดู '+config.label
 $('summaryTrendTitle').textContent='กระแสเงินสด'
 $('summaryCategoryTitle').textContent='รายจ่ายแยกหมวดหมู่'
 $('summaryTrendBadge').textContent=config.badge;$('summaryCategoryBadge').textContent=config.badge
 $('sumIncomeHint').textContent=config.label;$('sumExpenseHint').textContent=config.label
 $('sumBalanceHint').textContent=inc-exp>=0?'ยังเหลือ '+(inc?((inc-exp)/inc*100).toFixed(0):0)+'% ของรายรับ':'รายจ่ายมากกว่ารายรับ'
 document.querySelectorAll('[data-summary-range]').forEach(b=>{const active=b.dataset.summaryRange===selectedRange;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active))})
 $('summaryCustomFilters').classList.toggle('hidden',selectedRange!=='custom')

 const grouped=rows.filter(x=>x.type==='expense').reduce((o,x)=>{const g=excelGroup(x);o[g]=(o[g]||0)+Number(x.amount);return o},{})
 $('sumDebtPay').textContent=money(grouped['ชำระบัตร/สินเชื่อ']||0)
 const rentTotal=grouped['ห้องเช่า']||0
 const carTotal=(grouped['ค่างวดรถ']||0)+(grouped['น้ำมันรถ']||0)+(grouped['ซ่อม/ประกัน/ภาษีรถ']||0)+(grouped['ค่าใช้รถอื่น ๆ']||0)+(grouped['รถยนต์อื่น ๆ']||0)
 $('sumRent').textContent=money(rentTotal)
 $('sumCar').textContent=money(carTotal)
 $('sumCarInstallment').textContent=money(grouped['ค่างวดรถ']||0)
 $('sumCarOther').textContent=money(carTotal-(grouped['ค่างวดรถ']||0))
 $('sumRecurring').textContent=money(grouped['รายจ่ายประจำ']||0)

 const timelineKeys=summaryTimelineKeys(config,bangkokDay(),rows)
 const timelineLabels=config.mode==='days'
  ?timelineKeys.map(k=>String(Number(k.slice(8,10))))
  :timelineKeys.map(k=>new Date(Number(k.slice(0,4)),Number(k.slice(5,7))-1,1).toLocaleDateString('th-TH',{month:'short',year:config.keys.some(x=>x.slice(0,4)!==config.keys[0].slice(0,4))?'2-digit':undefined}))
 const timeline=timelineKeys.map(k=>{const r=rows.filter(x=>config.mode==='days'?String(x.transaction_date).slice(0,10)===k:String(x.transaction_date).slice(0,7)===k);const income=r.filter(x=>x.type==='income').reduce((s,x)=>s+Number(x.amount),0),expense=r.filter(x=>x.type==='expense').reduce((s,x)=>s+Number(x.amount),0);return{income,expense,balance:income-expense,count:r.length}})
 const moneyFmt=v=>document.body?.classList.contains('privacy-mode')?'••••':new Intl.NumberFormat('th-TH',{maximumFractionDigits:0}).format(v)
 if(trendChart)trendChart.destroy()
 if(ChartCtor)trendChart=new ChartCtor($('monthlyTrendChart'),{data:{labels:timelineLabels,datasets:[
  {type:'bar',label:'รายรับ',data:timeline.map(x=>x.income),backgroundColor:'rgba(16,185,129,.72)',borderRadius:4,maxBarThickness:16,pointStyle:'rect'},
  {type:'bar',label:'รายจ่าย',data:timeline.map(x=>x.expense),backgroundColor:'rgba(239,68,68,.70)',borderRadius:4,maxBarThickness:16,pointStyle:'rect'},
  {type:'line',label:config.mode==='days'?'สุทธิรายวัน':'สุทธิรายเดือน',data:timeline.map(x=>x.balance),borderColor:'#4f46e5',backgroundColor:'#4f46e5',borderWidth:2,tension:0,pointRadius:0,pointHoverRadius:4,pointHitRadius:12,pointStyle:'line'}
 ]},options:{responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},plugins:{legend:{position:'bottom',labels:{usePointStyle:true,boxWidth:10,boxHeight:10,padding:14}},tooltip:{callbacks:{label:c=>c.dataset.label+': '+money(c.raw)}}},scales:{y:{ticks:{callback:v=>'฿'+moneyFmt(v)},grid:{color:'rgba(148,163,184,.15)'}},x:{title:{display:config.mode==='days',text:config.mode==='days'?'วันที่':''},ticks:{autoSkip:true,maxTicksLimit:6,maxRotation:0,minRotation:0},grid:{display:false}}}}})

 const priority=['ห้องเช่า','ค่างวดรถ','น้ำมันรถ','ซ่อม/ประกัน/ภาษีรถ','ค่าใช้รถอื่น ๆ','ชำระบัตร/สินเชื่อ','รายจ่ายประจำ']
 const other=[...new Set(rows.filter(x=>x.type==='expense').map(excelGroup).filter(x=>!priority.includes(x)))].sort()
 const cats=[...priority,...other].filter(g=>rows.some(x=>x.type==='expense'&&excelGroup(x)===g))
 const timelineByCat=cats.map(g=>timelineKeys.map(k=>rows.filter(x=>x.type==='expense'&&(config.mode==='days'?String(x.transaction_date).slice(0,10)===k:String(x.transaction_date).slice(0,7)===k)&&excelGroup(x)===g).reduce((s,x)=>s+Number(x.amount),0)))
 if(categoryChart2)categoryChart2.destroy()
 const palette=['#6366f1','#f59e0b','#ef4444','#06b6d4','#8b5cf6','#10b981','#ec4899','#64748b','#84cc16','#f97316','#14b8a6','#a855f7']
 if(ChartCtor)categoryChart2=new ChartCtor($('monthlyCategoryChart'),{type:'bar',data:{labels:timelineLabels,datasets:cats.map((g,idx)=>({label:g,data:timelineByCat[idx],backgroundColor:palette[idx%palette.length],borderRadius:4}))},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom'},tooltip:{callbacks:{label:c=>c.dataset.label+': '+money(c.raw)}}},scales:{x:{stacked:true,grid:{display:false}},y:{stacked:true,ticks:{callback:v=>'฿'+moneyFmt(v)},grid:{color:'rgba(148,163,184,.15)'}}}}})

 const pieCats=Object.entries(grouped).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1])
 const expenseTotal=pieCats.reduce((sum,[,value])=>sum+Number(value),0)
 const expensePercent=value=>expenseTotal>0?(Number(value)/expenseTotal*100):0
 if(pieChart)pieChart.destroy()
 if(ChartCtor)pieChart=new ChartCtor($('categoryPieChart'),{type:'doughnut',data:{labels:pieCats.map(x=>x[0]),datasets:[{data:pieCats.map(x=>x[1]),backgroundColor:pieCats.map((_,i)=>palette[i%palette.length]),borderWidth:0}]},options:{responsive:true,maintainAspectRatio:false,cutout:'66%',plugins:{legend:{position:'bottom',labels:{boxWidth:12,usePointStyle:true,generateLabels:chart=>{const ds=chart.data.datasets[0]||{data:[]};return chart.data.labels.map((label,i)=>({text:label+' '+expensePercent(ds.data[i]).toFixed(1)+'%',fillStyle:ds.backgroundColor[i],strokeStyle:ds.backgroundColor[i],lineWidth:0,hidden:!chart.getDataVisibility(i),index:i}))}}},tooltip:{callbacks:{label:c=>c.label+': '+money(c.raw)+' ('+expensePercent(c.raw).toFixed(1)+'%)'}}}}})

 const tableKeys=config.mode==='days'?[config.monthKey]:config.keys
 const monthly=tableKeys.map(k=>{const r=valid.filter(x=>x.status!=='cancelled'&&String(x.transaction_date).slice(0,7)===k);const income=r.filter(x=>x.type==='income').reduce((s,x)=>s+Number(x.amount),0),expense=r.filter(x=>x.type==='expense').reduce((s,x)=>s+Number(x.amount),0);return[k,{income,expense,balance:income-expense,count:r.length}]})
 $('summaryTable').innerHTML=monthly.length?'<div class="table-wrap"><table class="table"><thead><tr><th>เดือน</th><th>รายรับ</th><th>รายจ่าย</th><th>คงเหลือ</th><th>รายการ</th></tr></thead><tbody>'+monthly.map(([k,v])=>{const label=new Date(Number(k.slice(0,4)),Number(k.slice(5,7))-1,1).toLocaleDateString('th-TH',{month:'long',year:'numeric'});return '<tr><td>'+label+'</td><td class="income">'+money(v.income)+'</td><td class="expense">'+money(v.expense)+'</td><td class="balance">'+money(v.balance)+'</td><td>'+v.count+'</td></tr>'}).join('')+'</tbody></table></div>':'<div class="empty">ยังไม่มีข้อมูล</div>'

 const headers=tableKeys.map(k=>new Date(Number(k.slice(0,4)),Number(k.slice(5,7))-1,1).toLocaleDateString('th-TH',{month:'short',year:'2-digit'}))
 $('categoryMonthTable').innerHTML=cats.length?'<div class="table-wrap"><table class="table"><thead><tr><th>หมวด</th>'+headers.map(h=>'<th>'+h+'</th>').join('')+'<th>รวม</th></tr></thead><tbody>'+cats.map(g=>{const vals=tableKeys.map(k=>valid.filter(x=>x.type==='expense'&&x.status!=='cancelled'&&String(x.transaction_date).slice(0,7)===k&&excelGroup(x)===g).reduce((s,x)=>s+Number(x.amount),0));return '<tr><td>'+esc(g)+'</td>'+vals.map(v=>'<td>'+money(v)+'</td>').join('')+'<td><b>'+money(vals.reduce((a,b)=>a+b,0))+'</b></td></tr>'}).join('')+'</tbody></table></div>':'<div class="empty">ยังไม่มีข้อมูลรายจ่าย</div>'
}
renderSummary.setRange=range=>{selectedRange=range;renderSummary()}


 return renderSummary;
}
