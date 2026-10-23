/* Presentation only: retain the existing category amounts, filters and grouping. */
document.addEventListener('DOMContentLoaded',()=>{
 const root=document.getElementById('foodSubcategoryBreakdown'),canvas=document.getElementById('categoryPieChart');if(!root||!canvas)return;
 const palette=['#4fc5cb','#a8e1e6','#92b9f3','#b29ee0','#eeafcc','#f2ba8b'];
 function decorate(){
  root.querySelectorAll(':scope > .summary-category').forEach((item,index)=>{
   const dot=item.querySelector('.summary-category-dot');if(dot)dot.style.background=palette[index%palette.length];
  });
  const chart=window.Chart?.getChart?.(canvas);if(!chart)return;
  const dataset=chart.data.datasets[0];if(!dataset)return;
  // The renderer owns data. These overrides affect only how the same data is drawn.
  dataset.backgroundColor=chart.data.labels.map((_,index)=>palette[index%palette.length]);
  dataset.borderWidth=0;dataset.borderRadius=2;dataset.spacing=2;dataset.hoverOffset=5;
  chart.options.cutout='74%';chart.options.animation={duration:0};
  if(chart.options.plugins?.legend)chart.options.plugins.legend.display=false;
  chart.update('none');
 }
 new MutationObserver(decorate).observe(root,{childList:true});decorate();
});
