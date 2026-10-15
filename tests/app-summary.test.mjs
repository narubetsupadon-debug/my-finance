import assert from 'node:assert/strict';
import {summaryTimelineKeys,createSummaryRenderer,rentShareTotals} from '../app-summary.js';

assert.deepEqual(rentShareTotals([{amount:1000,source:'import_r3_v2',status:'paid'},{amount:2000,source:'web',status:'paid'},{amount:9999,source:'import_r3_v2',status:'cancelled'}]),{shareCents:200000,fullCents:400000});
const config={mode:'days',monthKey:'2026-10'};
assert.equal(summaryTimelineKeys(config,'2026-10-07').length,7);
assert.equal(summaryTimelineKeys({...config,monthKey:'2026-09'},'2026-10-07').length,30);
assert.equal(summaryTimelineKeys({...config,monthKey:'2024-02'},'2026-10-07').length,29);
assert.equal(summaryTimelineKeys(config,'2026-10-07',[{transaction_date:'2026-10-31',status:'cancelled'}]).length,7);
assert.equal(summaryTimelineKeys(config,'2026-10-07',[{transaction_date:'2026-10-31',status:'paid'}]).length,31);
assert.deepEqual(summaryTimelineKeys({mode:'months',keys:['2026-09','2026-10']},'2026-10-07'),['2026-09','2026-10']);

const elements=new Map();
const $=id=>{if(!elements.has(id))elements.set(id,{textContent:'',innerHTML:'',parentElement:{hidden:false},value:id==='summaryYear'?'2026':id==='summaryMonth'?'10':'',classList:{toggle(){}},setAttribute(){}});return elements.get(id);};
const charts=[];
class Chart{constructor(canvas,config){charts.push({canvas,config});this.destroyed=false;}destroy(){this.destroyed=true;}}
const previousDocument=globalThis.document;
globalThis.document={body:{classList:{contains:()=>false}},querySelectorAll:()=>[]};
let transactions=[
 {transaction_date:'2026-10-01',type:'income',amount:1000,status:'paid'},
 {transaction_date:'2026-10-02',type:'expense',amount:250,status:'paid'},
 {transaction_date:'2026-10-03',type:'expense',amount:2000,status:'paid',categories:{name:'ห้องเช่า'}},
 {transaction_date:'2026-10-02',type:'expense',amount:999,status:'cancelled'},
 {transaction_date:'2026-09-02',type:'expense',amount:50,status:'paid'}
];
try{
 const render=createSummaryRenderer({$,money:String,esc:String,bangkokDay:()=> '2026-10-07',getTransactions:()=>transactions,ChartCtor:Chart});
 render();
 assert.equal(charts.length,1,'Summary renders just one chart');
 const pie=charts[0].config;
 const legend=c=>c.options.plugins.legend.labels.generateLabels({data:c.data,getDataVisibility:()=>true});
 assert.equal(legend(pie)[0].fontColor,'#475569');
 assert.equal(legend(pie)[0].text,'ห้องเช่า 88.9%');
 assert.equal($('sumBalance').textContent,'-1250');
 assert.equal($('sumRent').textContent,'1000');assert.equal($('sumRentFull').textContent,'2000');
 globalThis.document.documentElement={dataset:{resolvedTheme:'dark'}};
 render();
 assert.equal(legend(charts.at(-1).config)[0].fontColor,'#cbd5e1');
 render.setRange('6m');assert.equal($('sumExpense').textContent,'2300');
 render.setRange('custom');$('summaryMonth').value='09';render();assert.equal($('sumExpense').textContent,'50');
 $('summaryMonth').value='all';render();assert.equal($('sumExpense').textContent,'2300');
 render.setRange('month');
 transactions=Array.from({length:9},(_,i)=>({transaction_date:'2026-10-02',type:'expense',amount:(i+1)*10,status:'paid',categories:{name:'หมวด '+i}}));
 render();
 const grouped=charts.at(-1).config;
 assert.equal(grouped.data.labels.length,6,'Many categories collapse into five leaders plus remainder');
 assert.equal(grouped.data.labels.at(-1),'หมวดที่เหลือ');
 assert.equal(grouped.data.datasets[0].data.reduce((a,b)=>a+b,0),450,'Remainder must preserve the entire expense total');
 const count=charts.length;transactions=[];render();
 assert.equal(charts.length,count,'Empty range does not create a blank chart');
 assert.equal($('summaryPieEmpty').hidden,false);assert.equal($('sumExpense').textContent,'0');
 assert.equal($('categoryPieChart').parentElement.hidden,true);
 transactions=[{transaction_date:'2026-10-31',type:'expense',amount:100,status:'pending'}];render();
 assert.equal($('summaryPieEmpty').hidden,true);assert.equal($('categoryPieChart').parentElement.hidden,false);
 assert.equal($('sumExpense').textContent,'100','Pending/future scope stays unchanged');
}finally{globalThis.document=previousDocument;}
console.log('PASS compact summary: totals, ranges, one percentage chart, category remainder, empty state, themes and unchanged pending/future scope');

assert.deepEqual(rentShareTotals([{id:"rent",amount:2000,status:"paid",source:"rent"}],[{transaction_id:"rent",my_amount:800}]),{shareCents:80000,fullCents:200000});
