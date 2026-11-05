// Presentation only: move the existing financial nodes so their renderers/actions remain attached.
window.addEventListener('myfinance:preview-ready',()=>{
 const $=id=>document.getElementById(id),home=$('dashboardPage');
 if(!home||home.querySelector('.pocket-hero'))return;
 const svg=(background,art)=>'<svg viewBox="0 0 320 150" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect width="320" height="150" fill="'+background+'"/><circle cx="263" cy="33" r="36" fill="#fff" opacity=".3"/>'+art+'<path d="M0 128Q50 103 94 125T178 123T260 123T320 119V150H0Z" fill="var(--card)"/></svg>';
 const scenes={
  budget:svg('#d0f0df','<ellipse cx="166" cy="121" rx="64" ry="9" fill="#9dcdb2" opacity=".4"/><path d="M145 107Q129 70 145 37Q172 47 169 74Q188 49 203 54Q208 89 167 110" fill="#46a67e"/><path d="M163 111V64" stroke="#287453" stroke-width="4" stroke-linecap="round"/><path d="M137 101H190L183 129H145Z" fill="#fff4cd"/><path d="M141 108H188" stroke="#ebd695" stroke-width="3"/>'),
  today:svg('#ffe5b9','<ellipse cx="160" cy="122" rx="67" ry="9" fill="#ddbb8a" opacity=".4"/><path d="M102 77H220Q213 119 161 122Q109 119 102 77" fill="#fff"/><ellipse cx="161" cy="78" rx="58" ry="15" fill="#f7c578"/><path d="M117 76Q139 47 162 76Q181 50 203 77" fill="none" stroke="#e99e4e" stroke-width="7"/><path d="M182 35L202 91M198 32L217 87" stroke="#8d6650" stroke-width="5" stroke-linecap="round"/>'),
  income:svg('#dcebf9','<circle cx="218" cy="46" r="23" fill="#f9d472"/><path d="M0 128Q68 33 147 119Q226 51 320 128" fill="#93bcca"/><path d="M0 133Q74 75 160 138Q248 95 320 126V150H0" fill="#b2d7d4"/><rect x="127" y="60" width="56" height="59" rx="12" fill="#fff"/><path d="M144 89l11-12 11 12M155 78v26" fill="none" stroke="#56a7a9" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>'),
  expense:svg('#f5dde7','<ellipse cx="161" cy="124" rx="61" ry="8" fill="#c7a9bd" opacity=".35"/><path d="M124 64H197L205 125H116Z" fill="#fff"/><path d="M141 68V57Q141 36 161 36Q181 36 181 57V68" fill="none" stroke="#c38aa8" stroke-width="6" stroke-linecap="round"/><path d="M146 92h31M161 81v23" stroke="#e2b2c9" stroke-width="5" stroke-linecap="round"/>')};
 const hero=document.createElement('section');hero.className='pocket-hero';hero.setAttribute('aria-label','รายรับหักรายจ่ายเดือนนี้');
 const title=document.createElement('p');title.className='pocket-hero-label';title.textContent='รายรับหักรายจ่ายเดือนนี้';
 const balance=$('balanceTotal');balance.closest('.metric')?.remove();
 const scope=document.createElement('p');scope.className='pocket-hero-note';scope.textContent='รวมรายการรอดำเนินการ · ไม่ใช่ยอดธนาคาร';
 const scenery=document.createElement('div');scenery.className='pocket-hero-scene';scenery.setAttribute('aria-hidden','true');scenery.innerHTML='<svg viewBox="0 0 240 140" xmlns="http://www.w3.org/2000/svg"><circle cx="173" cy="43" r="24" fill="#f4d96e"/><path d="M0 134Q61 25 123 133Q182 71 240 128V140H0" fill="#8cd0be"/><path d="M8 140Q87 76 160 140Q207 106 240 133V140" fill="#5bac97"/><path d="M32 41h52a13 13 0 0 0-12-17a20 20 0 0 0-38 5a7 7 0 0 0-2 12M122 71h62a15 15 0 0 0-19-17a22 22 0 0 0-38 6a6 6 0 0 0-5 11" fill="#fff" opacity=".8"/></svg>';
 hero.append(title,balance,scope,scenery);
 const shortcuts=document.createElement('div');shortcuts.className='pocket-shortcuts';
 for(const [icon,label,event,detail]of [['＋','บันทึก','finance:open-capture',null],['↔','รายการ','finance:navigate','transactions'],['◔','สรุป','finance:navigate','summary']]){
  const button=document.createElement('button');button.type='button';const symbol=document.createElement('span');symbol.textContent=icon;symbol.setAttribute('aria-hidden','true');button.append(symbol,document.createTextNode(label));button.onclick=()=>window.dispatchEvent(new CustomEvent(event,{detail}));shortcuts.append(button);
 }
 const section=document.createElement('section');section.className='pocket-section';
 const heading=document.createElement('div');heading.className='pocket-section-heading';const h=document.createElement('h2');h.textContent='มุมเงินของมิว';
 const budget=document.createElement('button');budget.type='button';budget.textContent='จัดการงบ ＋';budget.onclick=()=>window.dispatchEvent(new CustomEvent('finance:navigate',{detail:'budget'}));heading.append(h,budget);
 const grid=document.createElement('div');grid.className='pocket-grid';
 const decorate=(node,key)=>{node.classList.add('pocket-tile');const art=document.createElement('div');art.className='pocket-art';art.setAttribute('aria-hidden','true');art.innerHTML=scenes[key];node.prepend(art);return node;};
 const budgetCard=$('budgetCard'),spent=home.querySelector('.spent-panel');
 grid.append(decorate(budgetCard,'budget'),decorate(spent,'today'));
 for(const [id,label,key]of [['incomeTotal','รายรับเดือนนี้','income'],['expenseTotal','รายจ่ายเดือนนี้','expense']]){
  const node=$(id),card=document.createElement('article'),caption=document.createElement('p');caption.className='pocket-tile-label';caption.textContent=label;node.closest('.metric')?.remove();card.append(caption,node);grid.append(decorate(card,key));
 }
 section.append(heading,grid);
 home.querySelector('.daily-overview')?.remove();home.querySelector('.home-welcome').after(hero,shortcuts,section);
 // Give the summary chart its own matching visual treatment; preserve amounts, labels and taps.
 if(window.Chart){
  const palette=['#57b9b0','#f2c86c','#8ba4d2','#e5a6ba','#91c6a5','#b5a6d6'];
  Chart.register({id:'my-finance-pocket-palette',beforeUpdate(chart){if(chart.config.type!=='doughnut')return;for(const data of chart.data.datasets){data.backgroundColor=data.data.map((_,i)=>palette[i%palette.length]);data.borderWidth=4;data.borderColor=getComputedStyle(document.documentElement).getPropertyValue('--card').trim();data.borderRadius=5;}chart.options.cutout='74%';},afterUpdate(chart){if(chart.config.type!=='doughnut')return;document.querySelectorAll('.summary-category-dot').forEach((dot,i)=>{dot.style.backgroundColor=palette[i%palette.length];});}});
  const chart=Chart.getChart($('categoryPieChart'));if(chart)chart.update('none');
 }
},{once:true});
