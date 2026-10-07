import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {parsePayslipTokens,validatePayslipDraft,setupPayslipImport,normalizePayslipLabel} from '../salary-payslip.js';
const require=createRequire(import.meta.url),{JSDOM}=require('jsdom');
const t=(text,x,y)=>({text,x,y});
const sample=[t('Earnings',123,126),t('Deductions',359,126),t('Amount',272,126),t('Amount',460,126),t('Payroll Date',531,132),t('Net To Pay',534,264),t('Total Earnings',137,300),t('Total Deduction',350,300),t('30/09/2569',535,158),
 t('อัตรา',88,141),t('10,000.00',286,141),t('เงินเดือน',88,153),t('30.00',230,153),t('10,000.00',286,153),t('ค่าล่วงเวลา 1.5เท่า',88,166),t('8.00',230,166),t('500.00',290,166),t('เบี<ยขยัน',88,213),t('100.00',290,213),t('ค่าอาหาร',88,260),t('50.00',296,260),
 t('หักค่าอาหาร',330,201),t('50.00',482,201),t('สํารองเลี<ยงชีพ',330,248),t('300.00',482,248),t('หักสมทบประกันสังคม',330,260),t('750.00',482,260),t('หักภาษี',330,270),t('0.00',490,270),
 t('10,650.00',283,294),t('1,100.00',474,294),t('9,550.00',539,294),t('120,000.00',100,346),t('6,000.00',276,346)];
const draft=parsePayslipTokens([...sample].reverse()),result=validatePayslipDraft(draft);
assert.equal(normalizePayslipLabel('เบี<ยขยัน'),'เบี้ยขยัน');
assert.equal(normalizePayslipLabel('หักค่านํ<าประปา'),'หักค่าน้ำประปา');
assert.equal(normalizePayslipLabel('หักจ่ายอื-นๆ'),'หักจ่ายอื่นๆ');
assert.equal(normalizePayslipLabel('ค่าเบี<ยเลี<ยง/ค่าเที-ยว/ค่ากะ'),'ค่าเบี้ยเลี้ยง/ค่าเที่ยว/ค่ากะ');
assert.equal(normalizePayslipLabel('สํารองเลี<ยงชีพ'),'สำรองเลี้ยงชีพ');
assert.equal(normalizePayslipLabel('โบนัสก่อน-หลัง / OT 1.5'),'โบนัสก่อน-หลัง / OT 1.5');
assert.ok(draft.rows.some(row=>row.label==='เบี้ยขยัน'));
assert.equal(draft.month,'2026-09');assert.equal(draft.paymentDate,'2026-09-30');assert.equal(result.matches,true);assert.equal(result.values.base_salary,1000000);assert.equal(result.values.overtime,50000);assert.equal(result.values.provident_fund,30000);assert.equal(result.net,955000);
assert.equal(validatePayslipDraft(parsePayslipTokens(sample.map(t=>({...t,x:t.x*1.5,y:t.y*1.5})))).matches,true);
const wrong=structuredClone(draft);wrong.rows[0].cents+=1;assert.equal(validatePayslipDraft(wrong).matches,false);
wrong.rows[0].cents=NaN;assert.equal(validatePayslipDraft(wrong).matches,false);
assert.throws(()=>parsePayslipTokens(sample.filter(t=>t.text!=='9,550.00')),/ยอดรวม/);
assert.throws(()=>parsePayslipTokens(sample.map(t=>({...t,text:t.text==='30/09/2569'?'31/09/2569':t.text}))),/วันที่/);
assert.throws(()=>parsePayslipTokens([]),/รูปแบบ/);

const dom=new JSDOM(fs.readFileSync(new URL('../salary.html',import.meta.url),'utf8')),$=id=>dom.window.document.getElementById(id);
Object.defineProperty($('payslipFile'),'files',{value:[{name:'example.pdf'}]});
let resolveRead,applied=0,isLocked=false,shouldReject=false,reason='';
const importer=setupPayslipImport({document:dom.window.document,canRead:()=>!isLocked,canApply:()=>reason,onBusy:v=>{isLocked=v;},onApply:()=>{applied++;},readPdf:async()=>{if(shouldReject)throw new Error('รหัสเปิด PDF ไม่ถูกต้อง');return new Promise(resolve=>{resolveRead=resolve;});}});
$('payslipPassword').value='temporary-test-secret';const pending=$('readPayslip').onclick();assert.equal(isLocked,true);assert.equal($('payslipPassword').value,'');assert.equal(applied,0);resolveRead(structuredClone(draft));await pending;assert.equal(isLocked,false);assert.equal($('applyPayslip').disabled,false);assert.equal(applied,0);
const groups=[...$('payslipRows').querySelectorAll('.payslip-group')];
assert.deepEqual(groups.map(group=>group.dataset.kind),['earning','deduction']);
assert.equal(groups[0].querySelector('h4').textContent,'รายได้');assert.equal(groups[1].querySelector('h4').textContent,'รายการหัก');
assert.equal($('payslipRows').querySelector('table'),null);
assert.equal($('payslipRows').querySelectorAll('.payslip-row').length,draft.rows.length);
assert.equal($('payslipRows').querySelectorAll('input').length,draft.rows.length);
assert.equal(groups[1].querySelector('details').open,false);
assert.match(groups[0].textContent,/เบี้ยขยัน/);assert.equal(groups[0].textContent.includes('<'),false);
assert.ok([...$('payslipRows').querySelectorAll('label')].every(label=>dom.window.document.getElementById(label.htmlFor)));
reason='เดือนนี้มีเงินเดือนบันทึกแล้ว';$('applyPayslip').click();assert.equal(applied,0);assert.match($('payslipStatus').textContent,/บันทึกแล้ว/);reason='';
const input=$('payslipRows').querySelector('input');input.value='9999.99';input.oninput();assert.equal($('applyPayslip').disabled,true);$('applyPayslip').click();assert.equal(applied,0);
input.value='10000.00';input.oninput();assert.equal($('applyPayslip').disabled,false);$('applyPayslip').click();assert.equal(applied,1);assert.equal($('payslipReview').hidden,true);
shouldReject=true;$('payslipPassword').value='wrong';await $('readPayslip').onclick();assert.equal($('payslipPassword').value,'');assert.match($('payslipStatus').textContent,/รหัส/);assert.equal($('applyPayslip').disabled,true);
shouldReject=false;const stale=$('readPayslip').onclick();importer.clear();resolveRead(structuredClone(draft));await stale;assert.equal($('payslipReview').hidden,true);assert.equal(applied,1);dom.window.close();
console.log('PASS payslip: positioned columns, duplicate rate and annual totals excluded, Thai dates, reconciliation, review-only import, duplicate-month block, password clearing, stale reads');
