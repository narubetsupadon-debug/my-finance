import {analyze} from '../preview/analysis-core.mjs';
import assert from 'node:assert/strict';
const row=(date,amount,extra={})=>({id:date+amount,type:'expense',status:'paid',amount,transaction_date:date,categories:{name:'อาหาร'},...extra});
const data=[row('2026-10-01',10.1),row('2026-10-08',20.2),row('2026-10-23',30.3),row('2026-10-24',900),row('2026-10-02',900,{status:'pending'}),row('2026-10-03',900,{status:'cancelled'}),row('2026-10-04',900,{type:'income'}),row('2026-09-01',100),row('2026-09-23',100),row('2026-09-24',900)];
const report=analyze(data,'2026-10','2026-10-23');assert.equal(report.totalCents,6060);assert.equal(report.priorCents,20000);assert.equal(report.categories.reduce((s,c)=>s+c.cents,0),6060);assert.equal(report.weeks.reduce((s,w)=>s+w.cents,0),6060);assert.equal(report.weeks.length,4);assert.equal(report.previousCutoff,23);
const end=analyze([row('2026-10-31',99)],'2026-10','2026-11-01');assert.equal(end.weeks.length,5);assert.equal(end.weeks[4].cents,9900);assert.equal(end.delta,null);
assert.equal(analyze([], '2026-03','2026-03-31').previousCutoff,28);assert.equal(analyze([], '2024-03','2024-03-31').previousCutoff,29);assert.equal(analyze([], '2026-01','2026-01-05').previous,'2025-12');
const rent=analyze([row('2026-10-05',7210,{source:'rent'}),row('2026-10-06',50,{categories:{name:'หนี้/ผ่อน'}})],'2026-10','2026-10-23');assert.equal(rent.totalCents,726000);assert.equal(rent.categories[0].name,'ค่าห้องเช่า');assert.equal(rent.categories[0].cents,721000);assert.equal(rent.categories[1].name,'ชำระบัตร/สินเชื่อ');assert.equal(analyze([],'2026-10','2026-10-23').insight,null);
console.log('PASS calm analysis: paid/date scope, integer cents, month/day comparison, leap year, week5, rent unchanged, debt and category/weekly reconciliation');
