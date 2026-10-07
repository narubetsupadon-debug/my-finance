const earningKeys=['base_salary','overtime','allowance','bonus','other_income'];
const deductionKeys=['social_security','tax','provident_fund','other_deductions'];
const keyLabels={base_salary:'เงินเดือนพื้นฐาน',overtime:'OT',allowance:'เบี้ยเลี้ยง / ค่าตำแหน่ง',bonus:'โบนัส',other_income:'รายได้อื่น',social_security:'ประกันสังคม',tax:'ภาษี',provident_fund:'กองทุนสำรองเลี้ยงชีพ',other_deductions:'รายการหักอื่น'};
const clean=s=>String(s).normalize('NFKC').replace(/\s+/g,'').toLowerCase();
const amount=s=>/^\d{1,3}(?:,\d{3})*\.\d{2}$|^\d+\.\d{2}$/.test(s.trim())?Math.round(Number(s.replaceAll(',',''))*100):null;

export function validatePayslipDraft(draft){
 const values=Object.fromEntries([...earningKeys,...deductionKeys].map(k=>[k,0]));
 let valid=true;
 for(const row of draft.rows){
  const keys=row.kind==='earning'?earningKeys:deductionKeys;
  if(!keys.includes(row.key)||!Number.isSafeInteger(row.cents)||row.cents<0){valid=false;continue;}
  values[row.key]+=row.cents;
 }
 const gross=earningKeys.reduce((n,k)=>n+values[k],0),deductions=deductionKeys.reduce((n,k)=>n+values[k],0),net=gross-deductions;
 const matches=valid&&[gross,deductions,net].every(Number.isSafeInteger)&&gross===draft.expected.gross&&deductions===draft.expected.deductions&&net===draft.expected.net&&net>0;
 return {values,gross,deductions,net,matches};
}

// Read positioned PDF text, never the document's arbitrary extraction order.
export function parsePayslipTokens(tokens){
 const find=s=>tokens.find(t=>clean(t.text)===clean(s));
 const earnings=find('Earnings'),deductions=find('Deductions'),grossLabel=find('Total Earnings'),deductionLabel=find('Total Deduction'),payroll=find('Payroll Date'),netLabel=find('Net To Pay');
 if(![earnings,deductions,grossLabel,deductionLabel,payroll,netLabel].every(Boolean))throw new Error('ยังไม่รองรับรูปแบบสลิปนี้ กรุณากรอกเอง หรือส่งตัวอย่างให้นิลินปรับตัวอ่าน');
 const scale=Math.abs(deductions.x-earnings.x)/235.8;
 if(!Number.isFinite(scale)||scale<=0)throw new Error('ตำแหน่งคอลัมน์ในสลิปไม่ถูกต้อง');
 const tolerance=3*scale;
 const headers=tokens.filter(t=>clean(t.text)==='amount'&&Math.abs(t.y-earnings.y)<tolerance).sort((a,b)=>a.x-b.x);
 if(headers.length!==2)throw new Error('แยกคอลัมน์จำนวนเงินไม่ได้ กรุณากรอกเอง');
 const split=deductions.x-40*scale;
 const rowGroups=[];
 for(const t of tokens.filter(t=>t.y>earnings.y+tolerance&&t.y<grossLabel.y-12*scale).sort((a,b)=>a.y-b.y||a.x-b.x)){
  let row=rowGroups.find(r=>Math.abs(r.y-t.y)<tolerance);
  if(!row){row={y:t.y,tokens:[]};rowGroups.push(row);}row.tokens.push(t);
 }
 const rows=[];
 for(const row of rowGroups){
  for(const kind of ['earning','deduction']){
   const left=kind==='earning'?earnings.x-70*scale:split;
   const right=kind==='earning'?split:payroll.x-15*scale;
   const column=kind==='earning'?headers[0].x:headers[1].x;
   const cell=row.tokens.filter(t=>t.x>=left&&t.x<right);
   const numbers=cell.filter(t=>t.x>=column-3*scale&&amount(t.text)!==null);
   const label=cell.filter(t=>t.x<column-3*scale&&amount(t.text)===null).sort((a,b)=>a.x-b.x).map(t=>t.text).join(' ').trim();
   if(!label||!numbers.length)continue;
   if(numbers.length!==1)throw new Error('พบตัวเลขหลายยอดในแถวเดียว กรุณาตรวจสลิป');
   const normalized=clean(label);
   if(kind==='earning'&&normalized==='อัตรา')continue;
   let key;
   if(kind==='earning')key=/^เงินเดือน/.test(normalized)?'base_salary':/ล่วงเวลา/.test(normalized)?'overtime':/โบนัส|bonus/.test(normalized)?'bonus':/ขยัน|ครองชีพ|โทรศัพท์|ค่ากะ|เบ.*เล/.test(normalized)?'allowance':'other_income';
   else key=/ประกันสังคม/.test(normalized)?'social_security':/ภาษี/.test(normalized)?'tax':/สำรอง|สํารอง/.test(normalized)?'provident_fund':'other_deductions';
   rows.push({kind,label,key,cents:amount(numbers[0].text)});
  }
 }
 const total=(minX,maxX)=>{
  const candidates=tokens.filter(t=>t.x>=minX&&t.x<maxX&&Math.abs(t.y-grossLabel.y)<10*scale&&amount(t.text)!==null);
  if(candidates.length!==1)throw new Error('อ่านยอดรวมในสลิปไม่ครบ กรุณากรอกเอง');
  return amount(candidates[0].text);
 };
 const expected={gross:total(headers[0].x-3*scale,split),deductions:total(headers[1].x-3*scale,payroll.x-15*scale),net:total(payroll.x-15*scale,Infinity)};
 const dateTokens=tokens.filter(t=>t.x>=payroll.x-15*scale&&t.y>payroll.y&&t.y<netLabel.y).map(t=>t.text.trim()).filter(t=>/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(t));
 if(dateTokens.length!==1)throw new Error('อ่านวันที่จ่ายไม่ชัด กรุณากรอกเอง');
 const [day,month,rawYear]=dateTokens[0].split('/').map(Number),year=rawYear>=2400?rawYear-543:rawYear;
 const date=new Date(Date.UTC(year,month-1,day));
 if(year<2000||year>2200||date.getUTCFullYear()!==year||date.getUTCMonth()!==month-1||date.getUTCDate()!==day)throw new Error('วันที่ในสลิปไม่ถูกต้อง');
 if(!rows.some(r=>r.key==='base_salary'))throw new Error('ไม่พบเงินเดือนพื้นฐาน กรุณากรอกเอง');
 const paymentDate=`${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
 return {rows,expected,paymentDate,month:paymentDate.slice(0,7)};
}

let pdfLibrary;
export async function readPayslipPdf(file,password=''){
 if(file.size>15*1024*1024)throw new Error('ไฟล์ใหญ่เกิน 15 MB กรุณาเลือกสลิปไฟล์เล็กลง');
 const buffer=await file.arrayBuffer(),data=new Uint8Array(buffer);
 if(!new TextDecoder().decode(data.slice(0,1024)).includes('%PDF-'))throw new Error('กรุณาเลือกไฟล์ PDF');
 pdfLibrary??=import('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/legacy/build/pdf.mjs').catch(error=>{pdfLibrary=null;throw new Error('โหลดตัวอ่าน PDF ไม่สำเร็จ กรุณาตรวจอินเทอร์เน็ตแล้วลองใหม่');});
 const pdfjs=await pdfLibrary;
 pdfjs.GlobalWorkerOptions.workerSrc='https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/legacy/build/pdf.worker.mjs';
 const task=pdfjs.getDocument({data,password,isEvalSupported:false,useSystemFonts:true});
 try{
  const pdf=await task.promise;
  if(pdf.numPages!==1)throw new Error('รองรับสลิปหนึ่งหน้าต่อไฟล์ กรุณาเลือกไฟล์ของเดือนเดียว');
  const page=await pdf.getPage(1),viewport=page.getViewport({scale:1}),content=await page.getTextContent();
  const tokens=content.items.filter(item=>item.str?.trim()).map(item=>{const [x,y]=viewport.convertToViewportPoint(item.transform[4],item.transform[5]);return {text:item.str,x,y};});
  if(!tokens.length)throw new Error('PDF นี้เป็นภาพสแกน ยังอ่านตัวเลขไม่ได้ กรุณาใช้ PDF ต้นฉบับหรือกรอกเอง');
  return parsePayslipTokens(tokens);
 }catch(error){
  if(error.name==='PasswordException')throw new Error(password?'รหัสเปิด PDF ไม่ถูกต้อง กรุณาใส่ใหม่':'สลิปมีรหัสผ่าน กรุณาใส่รหัสเปิด PDF แล้วกดอ่านอีกครั้ง');
  throw error;
 }finally{await task.destroy();}
}

export function setupPayslipImport({document,canRead,canApply,onApply,onBusy,readPdf=readPayslipPdf}){
 const $=id=>document.getElementById(id),file=$('payslipFile'),password=$('payslipPassword'),read=$('readPayslip'),apply=$('applyPayslip'),review=$('payslipReview'),status=$('payslipStatus'),table=$('payslipRows');
 const money=cents=>new Intl.NumberFormat('th-TH',{minimumFractionDigits:2,maximumFractionDigits:2}).format(cents/100);
 let draft=null,busy=false,epoch=0;
 const clear=()=>{epoch++;draft=null;review.hidden=true;table.replaceChildren();status.textContent='';apply.disabled=true;password.value='';};
 function check(){const result=validatePayslipDraft(draft);apply.disabled=!result.matches;status.textContent=result.matches?'ยอดรายได้ รายการหัก และรับสุทธิตรงกับสลิป ตรวจรายละเอียดแล้วกดนำไปกรอกได้':'ยอดยังไม่ตรงกับสลิป กรุณาตรวจจำนวนเงินทุกแถวก่อนนำไปกรอก';$('payslipTotals').textContent=`รายได้ ${money(result.gross)} · หัก ${money(result.deductions)} · สุทธิ ${money(result.net)} บาท`;return result;}
 function render(){
  table.replaceChildren();
  for(const row of draft.rows){
   const tr=document.createElement('tr'),label=document.createElement('td'),value=document.createElement('td'),destination=document.createElement('td');
   label.textContent=row.label;const input=document.createElement('input');input.type='number';input.min='0';input.max='999999999999.99';input.step='0.01';input.value=(row.cents/100).toFixed(2);input.setAttribute('aria-label','จำนวนเงิน '+row.label);
   input.oninput=()=>{row.cents=input.value.trim()&&input.validity.valid&&Number.isFinite(Number(input.value))?Math.round(Number(input.value)*100):NaN;check();};value.append(input);
   const select=document.createElement('select');select.setAttribute('aria-label','กรอกในช่อง '+row.label);for(const key of row.kind==='earning'?earningKeys:deductionKeys){const option=document.createElement('option');option.value=key;option.textContent=keyLabels[key];select.append(option);}select.value=row.key;select.onchange=()=>{row.key=select.value;check();};destination.append(select);tr.append(label,value,destination);table.append(tr);
  }
  $('payslipDate').textContent='วันที่จ่าย '+draft.paymentDate+' · เดือนที่จะกรอก '+draft.month+' (แก้ได้ในฟอร์ม)';
  $('payslipSourceTotals').textContent=`ยอดในสลิป: รายได้ ${money(draft.expected.gross)} · หัก ${money(draft.expected.deductions)} · สุทธิ ${money(draft.expected.net)} บาท`;
  review.hidden=false;check();
 }
 read.onclick=async()=>{
  if(busy||!canRead())return;
  if(!file.files?.[0]){status.textContent='เลือกไฟล์สลิป PDF ก่อนค่ะ';return;}
  const selected=file.files[0],secret=password.value;clear();const current=epoch;busy=true;read.disabled=true;file.disabled=true;password.disabled=true;onBusy(true);status.textContent='กำลังอ่านสลิปบนเครื่อง…';
  try{const result=await readPdf(selected,secret);if(current!==epoch)return;draft=result;render();}
  catch(error){if(current===epoch)status.textContent=error.message||'อ่านสลิปไม่ได้ กรุณาลองใหม่';}
  finally{busy=false;read.disabled=false;file.disabled=false;password.disabled=false;password.value='';onBusy(false);}
 };
 apply.onclick=()=>{
  if(busy||!draft||!canRead())return;
  const result=check();if(!result.matches)return;
  const reason=canApply(draft);if(reason){status.textContent=reason;return;}
  onApply(draft,result.values);clear();file.value='';status.textContent='กรอกตัวเลขแล้ว ตรวจเดือน วันที่ และบัญชีรับเงินให้ครบ แล้วกดบันทึกเงินเดือน';
 };
 file.onchange=()=>{clear();};$('clearPayslip').onclick=()=>{if(!busy){clear();file.value='';}};
 return {clear,isBusy:()=>busy};
}
