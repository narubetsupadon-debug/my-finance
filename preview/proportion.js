/* Presentation only: retain the existing category amounts, filters and grouping. */
document.addEventListener('DOMContentLoaded',()=>{
 const root=document.getElementById('foodSubcategoryBreakdown'),canvas=document.getElementById('categoryPieChart');if(!root||!canvas)return;
 const palette=['#7963e8','#eeaf54','#e67f91','#69b9cb','#9d86d9','#63b698'];
 function decorate(){
  root.querySelectorAll(':scope > .summary-category').forEach((item,index)=>{
   const dot=item.querySelector('.summary-category-dot');if(dot)dot.style.background=palette[index%palette.length];
  });
  const chart=window.Chart?.getChart?.(canvas);if(!chart)return;
  const dataset=chart.data.datasets[0];if(!dataset)return;
  // The renderer owns data. These overrides affect only how the same data is drawn.
  dataset.backgroundColor=chart.data.labels.map((_,index)=>palette[index%palette.length]);
  dataset.borderWidth=0;dataset.borderRadius=5;dataset.spacing=3;dataset.hoverOffset=5;
  chart.options.cutout='74%';chart.options.animation={duration:0};
  if(chart.options.plugins?.legend)chart.options.plugins.legend.display=false;
  chart.update('none');
 }
 new MutationObserver(decorate).observe(root,{childList:true});decorate();
});
