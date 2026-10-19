// Local-only PDF export. Canvas shapes Thai text with the bundled font;
// one page is rendered at a time to bound memory on phones. No financial data
// is sent to a PDF service or persisted in the service-worker cache.
const COLORS={navy:'#142d40',ink:'#203a4c',muted:'#607586',teal:'#168d8b',blue:'#4975ba',gold:'#cf9226',other:'#a1afbc',orange:'#bd7046',line:'#dfe7ec',paper:'#fafcfd'};
const FONT_URL=new URL('./fonts/Sarabun-Regular.ttf?v=20261019-analysis1',import.meta.url).href;
const PDF_URL=new URL('./vendor/jspdf-4.2.1.umd.min.js?v=20261019-analysis1',import.meta.url).href;
const W=595.28,H=841.89,SCALE=2;
const number=new Intl.NumberFormat('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
const money=cents=>number.format(cents/100);
let assetsPromise;

export function buildSummaryReport(snapshot){
 const rows=snapshot.rows.map(row=>{
  const cents=Math.round(Number(row.amount)*100);
  if(!Number.isSafeInteger(cents)||cents<0||!['income','expense'].includes(row.type))throw Error('พบยอดรายการไม่ถูกต้อง กรุณาตรวจรายการก่อนส่งออก');
  return {date:String(row.transaction_date),type:row.type,cents,description:String(row.description||'ไม่ระบุรายการ'),category:String(row.reportCategory||row.categories?.name||'อื่นๆ'),subcategory:String(row.subcategory||'').trim(),status:row.status||'paid'};
 }).sort((a,b)=>a.date.localeCompare(b.date));
 let income=0,expense=0;const categories=new Map(),periods=new Map(snapshot.keys.map(key=>[key,{key,income:0,expense:0}]));
 for(const row of rows){
  if(row.type==='income')income+=row.cents;else{expense+=row.cents;categories.set(row.category,(categories.get(row.category)||0)+row.cents);}
  const key=snapshot.mode==='days'?row.date:row.date.slice(0,7),period=periods.get(key);
  if(!period)throw Error('ช่วงเวลารายงานไม่ตรงกับรายการ กรุณาเลือกช่วงเวลาใหม่');
  period[row.type]+=row.cents;
 }
 if(!Number.isSafeInteger(income)||!Number.isSafeInteger(expense))throw Error('ยอดรวมเกินขนาดที่รองรับ');
 const ranked=[...categories].map(([name,cents])=>({name,cents})).sort((a,b)=>b.cents-a.cents);
 const slices=ranked.length>4?[...ranked.slice(0,3),{name:`หมวดที่เหลือ ${ranked.length-3} หมวด`,cents:ranked.slice(3).reduce((n,r)=>n+r.cents,0)}]:ranked;
 return {...snapshot,rows,income,expense,balance:income-expense,categories:ranked,slices,periods:[...periods.values()],pending:rows.filter(r=>r.status==='pending').length};
}

function loadAssets(){
 if(assetsPromise)return assetsPromise;
 assetsPromise=Promise.all([
  new Promise((resolve,reject)=>{
   if(window.jspdf?.jsPDF){resolve();return;}
   const script=document.createElement('script');script.src=PDF_URL;script.async=true;
   const timer=setTimeout(()=>{script.remove();reject(Error('โหลดตัวสร้าง PDF ไม่สำเร็จ กรุณาลองใหม่'));},20000);
   script.onload=()=>{clearTimeout(timer);if(window.jspdf?.jsPDF)resolve();else reject(Error('เปิดตัวสร้าง PDF ไม่สำเร็จ'));};
   script.onerror=()=>{clearTimeout(timer);script.remove();reject(Error('โหลดตัวสร้าง PDF ไม่สำเร็จ กรุณาตรวจอินเทอร์เน็ตแล้วลองใหม่'));};
   document.head.append(script);
  }),
  (async()=>{
   const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);
   try{
    const response=await fetch(FONT_URL,{signal:controller.signal});if(!response.ok)throw Error('font');
    const face=new FontFace('FinanceReport',await response.arrayBuffer());await face.load();document.fonts.add(face);
   }catch{throw Error('โหลดฟอนต์ไทยไม่สำเร็จ กรุณาตรวจอินเทอร์เน็ตแล้วลองใหม่');}
   finally{clearTimeout(timer);}
  })()
 ]).catch(error=>{assetsPromise=null;throw error;});
 return assetsPromise;
}

function painter(){
 const canvas=document.createElement('canvas');canvas.width=Math.round(W*SCALE);canvas.height=Math.round(H*SCALE);
 const ctx=canvas.getContext('2d');if(!ctx)throw Error('เบราว์เซอร์นี้ยังสร้าง PDF ไม่ได้');ctx.scale(SCALE,SCALE);
 const font=(size,bold=false)=>{ctx.font=`${bold?'600':'400'} ${size}px FinanceReport, sans-serif`;};
 const box=(x,y,w,h,color,r=0)=>{ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();};
 const text=(value,x,y,size=10,color=COLORS.ink,align='left')=>{font(size);ctx.fillStyle=color;ctx.textAlign=align;ctx.textBaseline='top';ctx.fillText(String(value),x,y);};
 const line=(x,y,x2,y2)=>{ctx.beginPath();ctx.strokeStyle=COLORS.line;ctx.lineWidth=.6;ctx.moveTo(x,y);ctx.lineTo(x2,y2);ctx.stroke();};
 const wrap=(value,width,size=10)=>{
  font(size);const lines=[];let current='';
  const parts=typeof Intl.Segmenter==='function'?[...new Intl.Segmenter('th',{granularity:'grapheme'}).segment(String(value))].map(x=>x.segment):Array.from(String(value));
  for(const char of parts){if(char==='\n'){lines.push(current);current='';continue;}if(current&&ctx.measureText(current+char).width>width){lines.push(current);current=char;}else current+=char;}
  if(current||!lines.length)lines.push(current);return lines;
 };
 const multiline=(value,x,y,width,size=9,color=COLORS.muted)=>{const lines=wrap(value,width,size);lines.forEach((s,i)=>text(s,x,y+i*size*1.5,size,color));return lines.length*size*1.5;};
 const fit=(value,x,y,width,size=19,color=COLORS.ink,align='right')=>{font(size);while(ctx.measureText(value).width>width&&size>10){size-=.5;font(size);}text(value,x,y,size,color,align);};
 box(0,0,W,H,'#ffffff');return {canvas,ctx,box,text,line,wrap,multiline,fit};
}
function footer(p,page,total,created){
 p.line(36,797,559,797);p.text('MY FINANCE / รายงานส่วนบุคคล',36,807,8,COLORS.muted);
 p.text(`${page} / ${total}`,559,807,8,COLORS.muted,'right');
 p.text(`สร้าง ${created} • ส่วนต่างไม่ใช่ยอดเงินสดคงเหลือ`,36,820,7,COLORS.muted);
}
function heading(p,report){
 p.text('MY FINANCE',36,31,11,COLORS.teal);p.text('รายละเอียดรายรับและรายจ่าย',36,61,20);
 p.text(report.label,36,100,10,COLORS.muted);p.text(report.scope,36,120,8.5,COLORS.muted);
}
function firstPage(report){
 const p=painter(),{box,text,line,ctx,fit,multiline}=p;
 box(0,0,W,H,COLORS.paper);box(0,0,W,178,COLORS.navy);
 text('MY FINANCE',36,30,12,'#ffffff');box(36,54,34,3,COLORS.teal);
 text('ภาพรวมรายรับและรายจ่าย',36,70,24,'#ffffff');
 text(`${report.label} | ${report.rows.length.toLocaleString('th-TH')} รายการ`,36,115,10,'#d4e1e8');
 multiline(report.scope,36,139,520,9,'#d4e1e8');
 const cards=[['รายรับรวม',report.income,COLORS.teal],['รายจ่ายรวม',report.expense,COLORS.blue],['รายรับสุทธิหลังหักรายจ่าย',report.balance,COLORS.orange]];
 cards.forEach(([label,value,color],i)=>{const x=36+i*178;box(x,194,167,81,'#ffffff',10);box(x+12,207,21,3,color);text(label,x+12,220,9,COLORS.muted);fit(money(value),x+154,242,145,20,color);});
 text('หน่วย: บาท • รับเข้า - จ่ายออก ไม่รวมยอดยกมา',36,287,8.5,COLORS.muted);
 box(36,312,523,214,'#ffffff',12);text('สัดส่วนรายจ่ายตามหมวดหมู่',52,327,16);
 text(`สัดส่วนจากยอดจ่ายออก ${money(report.expense)} บาท`,52,352,8.5,COLORS.muted);
 const palette=[COLORS.teal,COLORS.blue,COLORS.gold,COLORS.other];
 let angle=-Math.PI/2;const cx=145,cy=445;
 if(!report.expense){ctx.beginPath();ctx.strokeStyle=COLORS.line;ctx.lineWidth=19;ctx.arc(cx,cy,53,0,Math.PI*2);ctx.stroke();}
 report.slices.forEach((row,i)=>{
  const end=angle+row.cents/report.expense*Math.PI*2;
  ctx.beginPath();ctx.strokeStyle=palette[i];ctx.lineWidth=20;ctx.arc(cx,cy,53,angle,end);ctx.stroke();angle=end;
  const y=377+i*35;box(247,y+4,7,7,palette[i],2);
  const label=p.wrap(row.name,177,9).slice(0,1)[0];text(label+(label!==row.name?'…':''),263,y,9);
  text(`${(row.cents/report.expense*100).toFixed(1)}%`,542,y,10,palette[i],'right');
  text(money(row.cents)+' บาท',542,y+16,9,COLORS.muted,'right');
 });
 fit(money(report.expense),cx,435,90,13,COLORS.ink,'center');text(report.expense?'จ่ายออก':'ไม่มีรายจ่าย',cx,455,8,COLORS.muted,'center');
 if(!report.expense)text('ไม่มีรายจ่ายในช่วงที่เลือก',247,406,11,COLORS.muted);
 box(36,540,523,194,'#ffffff',12);text(`รับเข้า–จ่ายออก ${report.mode==='days'?'รายวัน':'รายเดือน'}`,52,555,15);
 text('แสดงยอดตามวันที่ทำรายการ • หน่วย: บาท',52,581,8.5,COLORS.muted);
 box(391,563,7,7,COLORS.teal);text('รับเข้า',404,559,8.5);box(472,563,7,7,COLORS.blue);text('จ่ายออก',485,559,8.5);
 const left=89,base=696,pw=453,ph=94,count=report.periods.length;
 const max=Math.max(100,...report.periods.flatMap(row=>[row.income,row.expense]))/100;
 const unit=10**Math.floor(Math.log10(max)),ceiling=Math.ceil(max/unit)*unit;
 [0,ceiling/2,ceiling].forEach(value=>{const y=base-value/ceiling*ph;line(left,y,left+pw,y);text(new Intl.NumberFormat('en-US',{maximumFractionDigits:1}).format(value),left-9,y-4,7.5,COLORS.muted,'right');});
 const step=pw/Math.max(count,1),bw=Math.min(7,step*.3),labelEvery=Math.max(1,Math.ceil(count/7));
 report.periods.forEach((row,i)=>{
  const x=left+(i+.5)*step;
  [['income',-bw-1,COLORS.teal],['expense',1,COLORS.blue]].forEach(([type,offset,color])=>{const h=row[type]/100/ceiling*ph;if(h)box(x+offset,base-h,bw,h,color);});
  if(i===0||i===count-1||i%labelEvery===0){const label=report.mode==='days'?row.key.slice(8):row.key.slice(5)+'/'+row.key.slice(2,4);text(label,x,base+9,7.5,COLORS.muted,'center');}
 });
 text('วันที่ไม่มีแท่ง = ไม่มีรายการบันทึกในชุดข้อมูล',52,717,7.8,COLORS.muted);
 const note=report.pending?`รวมรอดำเนินการ ${report.pending} รายการตามตัวกรอง ไม่ใช่ยอดจ่ายจริงทั้งหมด`:'รับเข้ารวมเงินคืน/เงินสมทบ จ่ายออกตามที่บันทึก อาจมีแลกเงิน โอนเงิน ลงทุน และให้ยืม';
 let y=746;y+=multiline(note,40,y,515,8)+3;
 multiline('อ้างอิงยอดที่บันทึกโดยไม่ปรับสัดส่วนค่าอาหารหรือค่าเช่า • รวมยอดชำระหนี้ • ดูหมวดหลักและหมวดย่อยในหน้ารายละเอียด',40,y,515,8);
 return p;
}
function detailLayout(report){
 const measure=painter(),pages=[];let group=[],height=0;
 for(const row of report.rows){
  const desc=measure.wrap(row.description,232,9),cat=measure.wrap(row.category,87,8),sub=row.subcategory?measure.wrap('↳ '+row.subcategory,87,7.5):[];
  const needed=Math.max(desc.length*13,cat.length*12+sub.length*11,26)+7;
  if(group.length&&height+needed>550){pages.push(group);group=[];height=0;}
  if(needed>550)throw Error('ข้อความในรายการยาวเกินไป กรุณาย่อรายละเอียดก่อนส่งออก');
  group.push({...row,desc,cat,sub,height:needed});height+=needed;
 }
 if(group.length||!pages.length)pages.push(group);
 measure.canvas.width=measure.canvas.height=0;return pages;
}
function detailPage(report,rows,index,total){
 const p=painter();heading(p,report);
 p.box(36,145,523,25,COLORS.navy,4);
 [[42,'วันที่'],[101,'รายละเอียดรายการ'],[342,'หมวดหลัก / ย่อย'],[447,'รายรับ'],[506,'รายจ่าย']].forEach(([x,label])=>p.text(label,x,152,8,'#ffffff'));
 let y=177;
 rows.forEach((row,i)=>{
  if(i%2===0)p.box(36,y-2,523,row.height,'#f1f5f7');
  p.text(row.date.slice(8)+'/'+row.date.slice(5,7)+'/'+row.date.slice(2,4),42,y+3,8);
  row.desc.forEach((s,j)=>p.text(s,101,y+3+j*13,9));row.cat.forEach((s,j)=>p.text(s,342,y+3+j*12,8));row.sub.forEach((s,j)=>p.text(s,342,y+3+row.cat.length*12+j*11,7.5,COLORS.blue));
  p.text(row.status==='pending'?'รอดำเนินการ':'บันทึกแล้ว',42,y+16,6.5,COLORS.muted);
  p.fit(money(row.cents),row.type==='income'?489:552,y+3,58,9,row.type==='income'?COLORS.teal:COLORS.ink);
  y+=row.height;
 });
 if(!rows.length){p.text('ไม่มีรายการในช่วงที่เลือก',42,y+15,11,COLORS.muted);y+=40;}
 p.line(36,y+5,559,y+5);
 const isLast=index===total-1;
 p.text(isLast?`รวมทั้งรายงาน ${report.rows.length} รายการ`:`รวมหน้านี้ ${rows.length} รายการ`,42,y+14,9);
 const sum=type=>isLast?report[type]:rows.filter(r=>r.type===type).reduce((n,r)=>n+r.cents,0);
 p.fit(money(sum('income')),489,y+14,70,10,COLORS.teal);p.fit(money(sum('expense')),552,y+14,60,10,COLORS.blue);
 p.text('ยอดตามข้อมูลที่บันทึก • ไม่รวมรายการยกเลิก • อ้างอิงตัวกรองจากหน้าสรุป',36,768,8,COLORS.muted);
 return p;
}

export async function createSummaryPdf(snapshot,{onProgress=()=>{},isCancelled=()=>false}={}){
 const report=buildSummaryReport(snapshot);await loadAssets();
 const details=detailLayout(report),total=details.length+1;
 const doc=new window.jspdf.jsPDF({unit:'pt',format:'a4',compress:true});
 doc.setProperties({title:'My Finance - '+report.label,subject:'Personal income and expense report',creator:'My Finance'});
 const created=new Intl.DateTimeFormat('th-TH',{timeZone:'Asia/Bangkok',dateStyle:'short',timeStyle:'short'}).format(new Date());
 for(let i=0;i<total;i++){
  if(isCancelled())throw Error('ยกเลิกการส่งออก เนื่องจากบัญชีหรือการตั้งค่าความเป็นส่วนตัวเปลี่ยนไป');
  onProgress(i+1,total);const p=i===0?firstPage(report):detailPage(report,details[i-1],i,total);
  footer(p,i+1,total,created);if(i)doc.addPage();
  // Unique aliases preserve each page. JPEG keeps multi-year reports small.
  doc.addImage(p.canvas.toDataURL('image/jpeg',.94),'JPEG',0,0,W,H,`page-${i}`);
  p.canvas.width=p.canvas.height=0;
  await new Promise(resolve=>setTimeout(resolve,0));
 }
 if(isCancelled())throw Error('ยกเลิกการส่งออก');
 return {blob:doc.output('blob'),filename:`My-Finance_${report.keys[0]}_${report.keys.at(-1)}_${report.paidOnly?'paid':'all'}.pdf`,pageCount:total};
}
