import assert from 'node:assert/strict';
import {summaryTimelineKeys,createSummaryRenderer} from '../app-summary.js';

const config={mode:'days',monthKey:'2026-10'};
assert.equal(summaryTimelineKeys(config,'2026-10-07').length,7);
assert.equal(summaryTimelineKeys({...config,monthKey:'2026-09'},'2026-10-07').length,30);
assert.equal(summaryTimelineKeys({...config,monthKey:'2024-02'},'2026-10-07').length,29);
assert.equal(summaryTimelineKeys(config,'2026-10-07',[{transaction_date:'2026-10-31',status:'cancelled'}]).length,7);
assert.equal(summaryTimelineKeys(config,'2026-10-07',[{transaction_date:'2026-10-31',status:'paid'}]).length,31);
assert.deepEqual(summaryTimelineKeys({mode:'months',keys:['2026-09','2026-10']},'2026-10-07'),['2026-09','2026-10']);

const elements=new Map();
const $=id=>{if(!elements.has(id))elements.set(id,{textContent:'',innerHTML:'',value:id==='summaryYear'?'2026':id==='summaryMonth'?'10':'',classList:{toggle(){}},setAttribute(){}});return elements.get(id);};
const charts=[];
class Chart{constructor(canvas,config){charts.push({canvas,config});}destroy(){}}
const previousDocument=globalThis.document;
globalThis.document={body:{classList:{contains:()=>false}},querySelectorAll:()=>[]};
try{
 const render=createSummaryRenderer({$,money:String,esc:String,bangkokDay:()=> '2026-10-07',getTransactions:()=>[
  {transaction_date:'2026-10-01',type:'income',amount:1000,status:'paid'},
  {transaction_date:'2026-10-02',type:'expense',amount:250,status:'paid'},
  {transaction_date:'2026-10-03',type:'expense',amount:2000,status:'paid',categories:{name:'ห้องเช่า'}},
  {transaction_date:'2026-10-02',type:'expense',amount:999,status:'cancelled'}
 ],ChartCtor:Chart});
 render();
 const trend=charts[0].config;
 assert.equal(trend.data.labels.length,7);
 assert.equal(trend.data.datasets[2].label,'สุทธิรายวัน');
 assert.deepEqual(trend.data.datasets[2].data,[1000,-250,-2000,0,0,0,0]);
 assert.equal($('sumBalance').textContent,'-1250');
 assert.equal($('sumRent').textContent,'1000');
 assert.equal($('sumRentFull').textContent,'2000');
 assert.equal(trend.data.datasets[2].pointRadius,0);
 assert.equal(trend.options.interaction.intersect,false);
 render.setRange('6m');
 assert.equal(charts[3].config.data.labels.length,6);
 assert.equal(charts[3].config.data.datasets[2].label,'สุทธิรายเดือน');
 assert.equal($('sumRent').textContent,'1000');assert.equal($('sumExpense').textContent,'2250');
}finally{globalThis.document=previousDocument;}
console.log('PASS summary: current and historical dates, recorded future entries, cancelled exclusion, daily net and monthly range');
