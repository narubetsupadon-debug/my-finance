/* Chart presentation and selection; original report values remain unchanged. */
document.addEventListener('DOMContentLoaded',()=>{
 const root=document.getElementById('foodSubcategoryBreakdown'),canvas=document.getElementById('categoryPieChart');if(!root||!canvas)return;
 const label=document.getElementById('summaryCenterLabel'),amount=document.getElementById('summaryPieTotal'),percent=document.getElementById('summarySelectedPercent'),reset=document.getElementById('summarySelectionReset');
 const palette=['#4fc5cb','#a8e1e6','#92b9f3','#b29ee0','#eeafcc','#f2ba8b'];let selected=null;
 const format=value=>'฿'+Number(value).toLocaleString('th-TH',{minimumFractionDigits:2,maximumFractionDigits:2});
 const chartNow=()=>window.Chart?.getChart?.(canvas);
 function select(index){
  const chart=chartNow();if(!chart)return;const dataset=chart.data.datasets[0],values=dataset.data.map(value=>Math.round(Number(value||0)*100)),total=values.reduce((sum,value)=>sum+value,0);
  selected=Number.isInteger(index)&&index>=0&&index<values.length?index:null;
  const current=selected===null?total:values[selected];if(label)label.textContent=selected===null?'รายจ่ายรวม':chart.data.labels[selected];if(amount)amount.textContent=(current>0?'−':'')+format(current/100);
  if(percent){percent.hidden=selected===null;percent.textContent=selected===null?'':(total>0?current/total*100:0).toFixed(1)+'% ของรายจ่าย';}if(reset)reset.hidden=selected===null;
  root.querySelectorAll(':scope > .summary-category').forEach((row,i)=>row.classList.toggle('selected-category',i===selected));
  dataset.offset=values.map((_,i)=>i===selected?6:0);chart.update('none');
 }
 function decorate(){
  selected=null;root.querySelectorAll(':scope > .summary-category').forEach((item,index)=>{const dot=item.querySelector('.summary-category-dot');if(dot)dot.style.background=palette[index%palette.length];});
  const chart=chartNow();if(!chart){if(label)label.textContent='รายจ่ายรวม';if(percent)percent.hidden=true;if(reset)reset.hidden=true;return;}const dataset=chart.data.datasets[0];if(!dataset)return;
  dataset.backgroundColor=chart.data.labels.map((_,index)=>palette[index%palette.length]);dataset.borderWidth=0;dataset.borderRadius=2;dataset.spacing=2;dataset.hoverOffset=5;
  chart.options.cutout='74%';chart.options.animation={duration:0};if(chart.options.plugins?.legend)chart.options.plugins.legend.display=false;if(chart.options.plugins?.tooltip)chart.options.plugins.tooltip.enabled=false;
  chart.options.onClick=(_event,elements)=>select(elements?.length?elements[0].index:null);select(null);
 }
 reset?.addEventListener('click',()=>select(null));
 root.addEventListener('click',event=>{const summary=event.target.closest('summary');if(!summary)return;const row=summary.parentElement,index=[...root.children].indexOf(row);if(index>=0)select(index);});
 canvas.setAttribute('tabindex','0');canvas.setAttribute('aria-label','กราฟสัดส่วนรายจ่าย แตะส่วนของวงกลม หรือใช้ปุ่มลูกศรเพื่อแสดงยอดหมวดตรงกลาง กด Escape เพื่อดูยอดรวม');
 canvas.addEventListener('keydown',event=>{const chart=chartNow(),count=chart?.data?.labels?.length||0;if(!count)return;let next;if(event.key==='Escape')next=null;else if(event.key==='Home')next=0;else if(event.key==='End')next=count-1;else if(event.key==='ArrowRight')next=selected===null?0:(selected+1)%count;else if(event.key==='ArrowLeft')next=selected===null?count-1:(selected+count-1)%count;else return;event.preventDefault();select(next);});
 new MutationObserver(decorate).observe(root,{childList:true});decorate();
});
