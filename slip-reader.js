// Reads images locally. Never uploads, saves transactions or assigns categories.
export function parseSlipText(raw){
 const text=String(raw).replace(/[๐-๙]/g,c=>String('๐๑๒๓๔๕๖๗๘๙'.indexOf(c))).replace(/[\u200b-\u200d\ufeff]/g,'').replace(/(\d)\s*\.\s*(\d{2})(?!\d)/g,'$1.$2');
 const lines=text.split(/\r?\n/), amounts=[];
 const excluded=/ค่าธรรมเนียม|fee|balance|คงเหลือ/i,excludedLines=new Set();
 for(let i=0;i<lines.length;i++){
  if(!excluded.test(lines[i]))continue;excludedLines.add(i);
  // A fee/balance label can be on its own line, with its value below it.
  if(!/\d/.test(lines[i])){
   let next=i+1;while(next<lines.length&&!lines[next].trim())next++;
   if(next<lines.length&&/^\s*(?:฿|THB)?\s*[\d,]+(?:\.\d{2})?\s*(?:บาท|THB)?\s*$/i.test(lines[next]))excludedLines.add(next);
  }
 }
 for(let i=0;i<lines.length;i++){
  const line=lines[i];if(excludedLines.has(i))continue;
  const labelled=/จำนวน(?:เงิน)?|ยอด(?:เงิน|โอน|ชำระ)|amount|total|บาท|THB|฿/i.test(line);
  if(!labelled&&/บัญชี|account|reference|เลขที่|วันที่|date|\d{1,2}:\d{2}/i.test(line))continue;
  const next=lines[i+1]||'';
  const source=labelled&&!/\d+\.\d{2}|\d+\s*(?:บาท|THB|฿)/i.test(line)&&!excludedLines.has(i+1)?line+' '+next:line;
  for(const m of source.matchAll(/(?<![\d.,-])(?:\d{1,3}(?:,\d{3})+|\d+)\.\d{2}(?![\d.])/g)){
   const value=Number(m[0].replaceAll(',',''));if(value>0&&value<=999999999)amounts.push({value,labelled});
  }
  // Integer money is accepted only next to a currency, never from bare account IDs.
  for(const m of source.matchAll(/(?:฿|THB)\s*((?:\d{1,3}(?:,\d{3})+|\d+))(?![\d.,])|(?<![\d.,-])((?:\d{1,3}(?:,\d{3})+|\d+))\s*(?:บาท|THB)(?![a-z])/gi)){
   const value=Number((m[1]||m[2]).replaceAll(',',''));if(value>0&&value<=999999999)amounts.push({value,labelled:true});
  }
 }
 const priority=amounts.some(x=>x.labelled)?amounts.filter(x=>x.labelled):amounts;
 const unique=[...new Set(priority.map(x=>x.value))];
 const dates=[];
 const add=(d,m,y,thai=false,era='')=>{y=Number(y);const calendar=era.replace(/[.\s]/g,'').toUpperCase(),be=['พศ','BE'].includes(calendar),ad=['คศ','AD'].includes(calendar);if(y<100)y+=be||!ad&&(thai||y>=40)?2500:2000;if(be||!ad&&y>2400)y-=543;d=Number(d);m=Number(m);const t=new Date(Date.UTC(y,m-1,d));if(y>=2000&&y<=2100&&t.getUTCFullYear()===y&&t.getUTCMonth()===m-1&&t.getUTCDate()===d)dates.push(`${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`);};
 for(const m of text.matchAll(/(?<![\d.])(\d{1,2})\s*[\/\-.]\s*(\d{1,2})\s*[\/\-.]\s*(\d{4}|\d{2})(?![\d.])/g))add(m[1],m[2],m[3]);
 for(const m of text.matchAll(/\b(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})\b/g))add(m[3],m[2],m[1]);
 const months=['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.','jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
 const fullMonths=['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
 // OCR may join date tokens or insert whitespace between abbreviation letters.
 const englishMonths=['january','february','march','april','may','june','july','august','september','october','november','december'];
 for(const [idx,name] of [...months,...fullMonths,...englishMonths].entries()){
  const token=name.split('').map(c=>c==='.'?'[.·]?':c).join('[ \\t]*');
  const pattern=new RegExp('(?<![\\d.])(\\d{1,2})\\s*'+token+'\\s*(พ[.]?\\s*ศ[.]?|ค[.]?\\s*ศ[.]?|BE|AD)?\\s*(\\d{4}|\\d{2})(?!\\d)','gi');
  for(const m of text.matchAll(pattern))add(m[1],idx%12+1,m[3],idx<12||idx>=24&&idx<36,m[2]||'');
 }
 const ds=[...new Set(dates)];return {amount:unique.length===1?unique[0].toFixed(2):'',date:ds.length===1?ds[0]:''};
}

async function improveImage(file){
 const url=URL.createObjectURL(file),img=new Image();
 try{
  await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src=url;});
  const scale=Math.min(2,2000/Math.max(img.naturalWidth,img.naturalHeight));
  const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));
  const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0,canvas.width,canvas.height);
  const pixels=ctx.getImageData(0,0,canvas.width,canvas.height),d=pixels.data;
  for(let i=0;i<d.length;i+=4){const gray=Math.max(0,Math.min(255,(.299*d[i]+.587*d[i+1]+.114*d[i+2]-128)*1.4+128));d[i]=d[i+1]=d[i+2]=gray;}
  ctx.putImageData(pixels,0,0);return canvas;
 }finally{URL.revokeObjectURL(url);}
}

export function dateRegions(data){
 const regions=[];
 for(const block of data.blocks||[])for(const paragraph of block.paragraphs||[])for(const line of paragraph.lines||[]){
  const words=line.words||[],year=words.findIndex(w=>/\b(?:25|20)\d{2}\b/.test(w.text||''));if(year<0)continue;
  const time=words.findIndex((w,i)=>i>=year&&/\d{1,2}:\d{2}/.test(w.text||''));
  const relevant=words.slice(0,time>=year?time+1:year+1).filter(w=>w.bbox);
  if(!relevant.length)continue;
  regions.push({x0:Math.min(...relevant.map(w=>w.bbox.x0)),y0:Math.min(...relevant.map(w=>w.bbox.y0)),x1:Math.max(...relevant.map(w=>w.bbox.x1)),y1:Math.max(...relevant.map(w=>w.bbox.y1))});
 }
 return regions.slice(0,2);
}
async function cropDate(file,box){
 const url=URL.createObjectURL(file),img=new Image();
 try{
  await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src=url;});
  const pad=Math.max(12,(box.y1-box.y0)*.75),left=Math.max(0,box.x0-pad),top=Math.max(0,box.y0-pad),width=Math.min(img.naturalWidth,box.x1+pad)-left,height=Math.min(img.naturalHeight,box.y1+pad)-top;
  const scale=Math.min(3,1800/width),canvas=document.createElement('canvas');canvas.width=Math.round(width*scale);canvas.height=Math.round(height*scale);
  const ctx=canvas.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,left,top,width,height,0,0,canvas.width,canvas.height);return canvas;
 }finally{URL.revokeObjectURL(url);}
}

let library;
function loadOCR(){
 if(globalThis.Tesseract)return Promise.resolve(globalThis.Tesseract);
 return library??=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='https://cdn.jsdelivr.net/npm/tesseract.js@6.0.1/dist/tesseract.min.js';script.onload=()=>resolve(globalThis.Tesseract);script.onerror=()=>{script.remove();library=null;reject(new Error('โหลดตัวอ่านไม่สำเร็จ ตรวจอินเทอร์เน็ตแล้วลองใหม่ค่ะ'));};document.head.append(script);});
}
export function bindSlipReader(){
 const $=id=>document.getElementById(id);if(!$('slipFile'))return;
 let serial=0,worker=null,dateWorker=null,busy=false;
 const status=message=>{$('slipStatus').textContent=message;};
 const clear=()=>{serial++;busy=false;if(worker){worker.terminate().catch(()=>{});worker=null;}if(dateWorker){dateWorker.terminate().catch(()=>{});dateWorker=null;}$('slipFile').value='';$('slipReview').hidden=true;$('slipAmount').value='';$('slipDate').value='';$('slipRead').disabled=false;status('อ่านในเครื่อง ไม่อัปโหลดหรือเก็บรูป · ครั้งแรกต้องโหลดตัวอ่านผ่านอินเทอร์เน็ต');};
 $('txDialog').addEventListener('close',()=>{clear();clearReview();});
 $('slipFile').addEventListener('change',()=>{serial++;busy=false;if(worker){worker.terminate().catch(()=>{});worker=null;}if(dateWorker){dateWorker.terminate().catch(()=>{});dateWorker=null;}$('slipRead').disabled=false;clearReview();status('เลือกรูปแล้ว กดอ่านสลิปได้ค่ะ');});
 function clearReview(){$('slipReview').hidden=true;$('slipAmount').value='';$('slipDate').value='';if($('slipReadText'))$('slipReadText').textContent='';}
 $('slipRead').onclick=async()=>{
  if(busy)return;const file=$('slipFile').files[0];if(!file){status('เลือกรูปสลิปก่อนค่ะ');return;}
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>10*1024*1024){status('ใช้รูป JPG, PNG หรือ WebP ขนาดไม่เกิน 10 MB ค่ะ');return;}
  const job=++serial;busy=true;$('slipRead').disabled=true;clearReview();status('กำลังโหลดตัวอ่านและอ่านสลิป… อาจใช้เวลาบนมือถือ');
  let ownWorker,ownDateWorker;
  try{
   const OCR=await loadOCR();if(job!==serial)return;
   ownWorker=await OCR.createWorker('tha+eng',1,{logger:m=>{if(job===serial&&m.status==='recognizing text')status('กำลังอ่าน '+Math.round(m.progress*100)+'%');}});
   if(job!==serial)return;worker=ownWorker;
   const {data}=await ownWorker.recognize(file,{}, {text:true,blocks:true});if(job!==serial)return;
   let readText=data.text,result=parseSlipText(readText);
   if(!result.amount||!result.date){
    status('อ่านบางช่องไม่ชัด กำลังเพิ่มความชัดและอ่านอีกครั้ง…');
    try{const image=await improveImage(file);if(job!==serial)return;const retry=await ownWorker.recognize(image);if(job!==serial)return;readText+='\n'+retry.data.text;result=parseSlipText(readText);}catch{if(job!==serial)return;}
   }
   const regions=dateRegions(data);
   if(!result.date&&regions.length){
    status('กำลังอ่านเฉพาะวันที่ด้วยภาษาไทยแบบละเอียด… ครั้งแรกต้องโหลดเพิ่ม');
    try{
     await ownWorker.terminate().catch(()=>{});ownWorker=null;worker=null;if(job!==serial)return;
     ownDateWorker=await OCR.createWorker('tha',1,{langPath:'https://raw.githubusercontent.com/tesseract-ocr/tessdata_best/e12c65a915945e4c28e237a9b52bc4a8f39a0cec',gzip:false,cachePath:'finance-tha-best-e12c65a9'});
     if(job!==serial)return;dateWorker=ownDateWorker;await ownDateWorker.setParameters({tessedit_pageseg_mode:'7'});
     for(const region of regions){const crop=await cropDate(file,region);if(job!==serial)return;const dated=await ownDateWorker.recognize(crop);if(job!==serial)return;readText+='\n'+dated.data.text;}
     result=parseSlipText(readText);
    }catch{if(job!==serial)return;}
   }
   $('slipAmount').value=result.amount;$('slipDate').value=result.date;$('slipReview').hidden=false;if($('slipReadText'))$('slipReadText').textContent=readText||'ไม่พบข้อความ';
   status(result.amount&&result.date?'อ่านได้แล้ว ตรวจยอดและวันที่ก่อนใช้ค่ะ':'อ่านบางช่องไม่ชัดหรือพบหลายค่า กรุณากรอกตรวจแก้ในช่องด้านล่างค่ะ');
  }catch(error){if(job===serial)status('อ่านไม่สำเร็จ ลองรูปที่ชัดขึ้น หรือกรอกเองได้ค่ะ');}
  finally{if(ownWorker)await ownWorker.terminate().catch(()=>{});if(ownDateWorker)await ownDateWorker.terminate().catch(()=>{});if(job===serial){worker=null;dateWorker=null;busy=false;$('slipRead').disabled=false;}}
 };
 $('slipApply').onclick=()=>{
  if(!$('slipAmount').value||!$('slipDate').value){status('กรอกยอดและวันที่ให้ครบก่อนค่ะ');return;}
  if(!$('slipAmount').checkValidity()||!$('slipDate').checkValidity()){$('slipAmount').reportValidity();$('slipDate').reportValidity();return;}
  $('txAmount').value=$('slipAmount').value;$('txDate').value=$('slipDate').value;
  for(const id of ['txAmount','txDate'])$(id).dispatchEvent(new Event('input',{bubbles:true}));
  status('เติมยอดและวันที่แล้ว เลือกหมวด/บัญชีเอง แล้วกดบันทึกตามปกติค่ะ');
 };
}
if(typeof document!=='undefined')bindSlipReader();
