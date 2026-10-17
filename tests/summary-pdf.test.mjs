import assert from 'node:assert/strict';
import {buildSummaryReport} from '../summary-pdf.js';
import {createSummaryRenderer} from '../app-summary.js';

const elements=new Map();
const $=id=>{if(!elements.has(id))elements.set(id,{textContent:'',innerHTML:'',parentElement:{hidden:false},value:id==='summaryYear'?'2026':id==='summaryMonth'?'10':'',classList:{toggle(){}},setAttribute(){}});return elements.get(id);};
const previous=globalThis.document;globalThis.document={querySelectorAll:()=>[]};
let rows=[
 {transaction_date:'2026-10-02',type:'income',amount:'23000.10',status:'paid'},
 {transaction_date:'2026-10-03',type:'expense',amount:'10.01',status:'paid',categories:{name:'อาหาร'}},
 {transaction_date:'2026-10-03',type:'expense',amount:'0.20',status:'paid',categories:{name:'อาหาร'}},
 {transaction_date:'2026-10-05',type:'expense',amount:2000,status:'paid',source:'rent'},
 {transaction_date:'2026-10-20',type:'expense',amount:777,status:'paid'},
 {transaction_date:'2026-10-20',type:'expense',amount:555,status:'pending'},
 {transaction_date:'2026-10-02',type:'expense',amount:999,status:'cancelled'},
 {transaction_date:'2026-09-30',type:'expense',amount:50,status:'paid'}
];
try{
 const render=createSummaryRenderer({$,money:String,esc:String,bangkokDay:()=> '2026-10-17',getTransactions:()=>rows});
 render();let snapshot=render.getReport(),report=buildSummaryReport(snapshot);
 assert.equal(report.income/100,Number($('sumIncome').textContent));
 assert.equal(report.expense/100,Number($('sumExpense').textContent));
 assert.equal(report.balance/100,Number($('sumBalance').textContent));
 assert.equal(report.categories.find(x=>x.name==='ห้องเช่า').cents,200000,'PDF uses raw transaction amount, not the separate rent-share card');
 assert.equal(report.pending,1);assert.equal(report.keys.at(-1),'2026-10-20','Recorded future dates stay on the timeline');
 snapshot.rows[0].amount=1;assert.notEqual(render.getReport().rows[0].amount,1,'Snapshot changes must not mutate app state');
 $('summaryStatus').value='paid';render();report=buildSummaryReport(render.getReport());
 assert.equal(report.expense,201021);assert.equal(report.pending,0);assert.equal(report.keys.at(-1),'2026-10-17');
 assert.equal(report.slices.reduce((n,x)=>n+x.cents,0),report.expense);
 assert.equal(report.periods.reduce((n,x)=>n+x.expense,0),report.expense);
 render.setRange('6m');report=buildSummaryReport(render.getReport());assert.equal(report.expense,206021);assert.equal(report.periods.length,6);
 render.setRange('custom');$('summaryMonth').value='09';render();report=buildSummaryReport(render.getReport());assert.equal(report.expense,5000);assert.equal(report.periods.length,30);
 rows=[];render();report=buildSummaryReport(render.getReport());assert.equal(report.balance,0);assert.deepEqual(report.slices,[]);
 const base={keys:['2026-10-01'],mode:'days',rows:[]};
 assert.throws(()=>buildSummaryReport({...base,rows:[{transaction_date:'2026-10-01',type:'expense',amount:Infinity}]}),/ยอดรายการ/);
 assert.throws(()=>buildSummaryReport({...base,rows:[{transaction_date:'2026-10-02',type:'expense',amount:10}]}),/ช่วงเวลา/);
}finally{globalThis.document=previous;}
console.log('PASS PDF report: exact screen reconciliation, satang precision, cancelled/pending/future filters, rent amount, snapshot isolation, ranges and empty data');
