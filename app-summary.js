// Summary page renderer. Keeps summary grouping and chart state out of app.js.
export function createSummaryRenderer({$,money,esc,bangkokDay,getTransactions,ChartCtor=null}){
 let trendChart=null,categoryChart2=null,pieChart=null;

function excelGroup(x){
 const cat=x.categories?.name||'อื่นๆ',text=((x.description||'')+' '+(x.note||'')).toLowerCase()
 if(cat==='ที่พัก')return 'ค่าห้อง'
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
function setupSummaryFilters(){
 const transactions=getTransactions();
 const years=[...new Set([bangkokDay().slice(0,4),...transactions.map(x=>String(x.transaction_date).slice(0,4)).filter(Boolean)])].sort((a,b)=>b.localeCompare(a))
 const ys=$('summaryYear'),current=ys.value||bangkokDay().slice(0,4)
 ys.innerHTML=years.map(y=>'<option value="'+y+'" '+(y===current?'selected':'')+'>'+y+'</option>').join('')
 if(!ys.value&&years.length)ys.value=years[0]
 const ms=$('summaryMonth'),mv=ms.value||'all'
 ms.innerHTML='<option value="all">ทุกเดือน</option>'+Array.from({length:12},(_,i)=>{const v=String(i+1).padStart(2,'0'),label=new Date(2026,i,1).toLocaleDateString('th-TH',{month:'long'});return '<option value="'+v+'" '+(v===mv?'selected':'')+'>'+label+'</option>'}).join('')
}
function renderSummary(){
 const transactions=getTransactions();
 setupSummaryFilters()
 const year=$('summaryYear').value,month=$('summaryMonth').value
 const base=transactions.filter(x=>x.status!=='cancelled'&&String(x.transaction_date).slice(0,4)===year)
 const rows=month==='all'?base:base.filter(x=>String(x.transaction_date).slice(5,7)===month)
 const inc=rows.filter(x=>x.type==='income').reduce((s,x)=>s+Number(x.amount),0),exp=rows.filter(x=>x.type==='expense').reduce((s,x)=>s+Number(x.amount),0)
 $('sumIncome').textContent=money(inc);$('sumExpense').textContent=money(exp);$('sumBalance').textContent=money(inc-exp)
 const grouped=rows.filter(x=>x.type==='expense').reduce((o,x)=>{const g=excelGroup(x);o[g]=(o[g]||0)+Number(x.amount);return o},{})
 $('sumDebtPay').textContent=money(grouped['ชำระบัตร/สินเชื่อ']||0)
 $('sumHomeCar').textContent=money((grouped['ค่าห้อง']||0)+(grouped['ค่างวดรถ']||0)+(grouped['น้ำมันรถ']||0)+(grouped['ซ่อม/ประกัน/ภาษีรถ']||0)+(grouped['ค่าใช้รถอื่น ๆ']||0)+(grouped['รถยนต์อื่น ๆ']||0))
 $('sumRecurring').textContent=money(grouped['รายจ่ายประจำ']||0)

 const monthKeys=Array.from({length:12},(_,i)=>year+'-'+String(i+1).padStart(2,'0'))
 const monthLabels=monthKeys.map(k=>new Date(Number(k.slice(0,4)),Number(k.slice(5,7))-1,1).toLocaleDateString('th-TH',{month:'short'}))
 const monthly=monthKeys.map(k=>{const r=base.filter(x=>String(x.transaction_date).slice(0,7)===k);const income=r.filter(x=>x.type==='income').reduce((s,x)=>s+Number(x.amount),0),expense=r.filter(x=>x.type==='expense').reduce((s,x)=>s+Number(x.amount),0);return{income,expense,balance:income-expense,count:r.length}})
 const moneyFmt=v=>document.body?.classList.contains('privacy-mode')?'••••':new Intl.NumberFormat('th-TH',{maximumFractionDigits:0}).format(v)
 if(trendChart)trendChart.destroy()
 if(ChartCtor)trendChart=new ChartCtor($('monthlyTrendChart'),{data:{labels:monthLabels,datasets:[
  {type:'bar',label:'รายรับ',data:monthly.map(x=>x.income),backgroundColor:'rgba(16,185,129,.72)',borderRadius:7},
  {type:'bar',label:'รายจ่าย',data:monthly.map(x=>x.expense),backgroundColor:'rgba(239,68,68,.70)',borderRadius:7},
  {type:'line',label:'คงเหลือ',data:monthly.map(x=>x.balance),borderColor:'#4f46e5',backgroundColor:'#4f46e5',borderWidth:3,tension:.3,pointRadius:3}
 ]},options:{responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},plugins:{legend:{position:'bottom'},tooltip:{callbacks:{label:c=>c.dataset.label+': '+money(c.raw)}}},scales:{y:{ticks:{callback:v=>'฿'+moneyFmt(v)},grid:{color:'rgba(148,163,184,.15)'}},x:{grid:{display:false}}}}})

 const priority=['ค่าห้อง','ค่างวดรถ','น้ำมันรถ','ซ่อม/ประกัน/ภาษีรถ','ค่าใช้รถอื่น ๆ','ชำระบัตร/สินเชื่อ','รายจ่ายประจำ']
 const other=[...new Set(base.filter(x=>x.type==='expense').map(excelGroup).filter(x=>!priority.includes(x)))].sort()
 const cats=[...priority,...other].filter(g=>base.some(x=>x.type==='expense'&&excelGroup(x)===g))
 const monthlyByCat=cats.map(g=>monthKeys.map(k=>base.filter(x=>x.type==='expense'&&String(x.transaction_date).slice(0,7)===k&&excelGroup(x)===g).reduce((s,x)=>s+Number(x.amount),0)))
 if(categoryChart2)categoryChart2.destroy()
 const palette=['#6366f1','#f59e0b','#ef4444','#06b6d4','#8b5cf6','#10b981','#ec4899','#64748b','#84cc16','#f97316','#14b8a6','#a855f7']
 if(ChartCtor)categoryChart2=new ChartCtor($('monthlyCategoryChart'),{type:'bar',data:{labels:monthLabels,datasets:cats.map((g,idx)=>({label:g,data:monthlyByCat[idx],backgroundColor:palette[idx%palette.length],borderRadius:4}))},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom'},tooltip:{callbacks:{label:c=>c.dataset.label+': '+money(c.raw)}}},scales:{x:{stacked:true,grid:{display:false}},y:{stacked:true,ticks:{callback:v=>'฿'+moneyFmt(v)},grid:{color:'rgba(148,163,184,.15)'}}}}})

 const pieCats=Object.entries(grouped).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1])
 if(pieChart)pieChart.destroy()
 if(ChartCtor)pieChart=new ChartCtor($('categoryPieChart'),{type:'doughnut',data:{labels:pieCats.map(x=>x[0]),datasets:[{data:pieCats.map(x=>x[1]),backgroundColor:pieCats.map((_,i)=>palette[i%palette.length]),borderWidth:0}]},options:{responsive:true,maintainAspectRatio:false,cutout:'62%',plugins:{legend:{position:'bottom'},tooltip:{callbacks:{label:c=>c.label+': '+money(c.raw)+' ('+((c.raw/(exp||1))*100).toFixed(1)+'%)'}}}}})

 const visibleMonths=month==='all'?monthKeys:[year+'-'+month]
 const visibleMonthly=visibleMonths.map(k=>{const idx=monthKeys.indexOf(k);return [k,monthly[idx]]})
 $('summaryTable').innerHTML=visibleMonthly.length?'<div class="table-wrap"><table class="table"><thead><tr><th>เดือน</th><th>รายรับ</th><th>รายจ่าย</th><th>คงเหลือ</th><th>รายการ</th></tr></thead><tbody>'+visibleMonthly.map(([k,v])=>{const label=new Date(Number(k.slice(0,4)),Number(k.slice(5,7))-1,1).toLocaleDateString('th-TH',{month:'long',year:'numeric'});return '<tr><td>'+label+'</td><td class="income">'+money(v.income)+'</td><td class="expense">'+money(v.expense)+'</td><td class="balance">'+money(v.balance)+'</td><td>'+v.count+'</td></tr>'}).join('')+'</tbody></table></div>':'<div class="empty">ยังไม่มีข้อมูล</div>'

 const matrixCats=cats.length?cats:['ไม่มีข้อมูล']
 const headers=visibleMonths.map(k=>new Date(Number(k.slice(0,4)),Number(k.slice(5,7))-1,1).toLocaleDateString('th-TH',{month:'short'}))
 $('categoryMonthTable').innerHTML=cats.length?'<div class="table-wrap"><table class="table"><thead><tr><th>หมวด</th>'+headers.map(h=>'<th>'+h+'</th>').join('')+'<th>รวม</th></tr></thead><tbody>'+matrixCats.map(g=>{const vals=visibleMonths.map(k=>base.filter(x=>x.type==='expense'&&String(x.transaction_date).slice(0,7)===k&&excelGroup(x)===g).reduce((s,x)=>s+Number(x.amount),0));return '<tr><td>'+esc(g)+'</td>'+vals.map(v=>'<td>'+money(v)+'</td>').join('')+'<td><b>'+money(vals.reduce((a,b)=>a+b,0))+'</b></td></tr>'}).join('')+'</tbody></table></div>':'<div class="empty">ยังไม่มีข้อมูลรายจ่าย</div>'
}


 return renderSummary;
}
