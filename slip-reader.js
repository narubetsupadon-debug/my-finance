// Reads images locally. Never uploads, saves transactions or assigns categories.
export function parseSlipText(raw){
 const text=String(raw).replace(/[๐-๙]/g,c=>String('๐๑๒๓๔๕๖๗๘๙'.indexOf(c)));
 const lines=text.split(/\r?\n/), amounts=[];
 for(let i=0;i<lines.length;i++){
  const line=lines[i];if(/ค่าธรรมเนียม|fee|balance|คงเหลือ/i.test(line))continue;
  const labelled=/จำนวนเงิน|ยอดเงิน|amount|total|บาท|THB|฿/i.test(line);
  const source=labelled?line+' '+(lines[i+1]||''):line;
  for(const m of source.matchAll(/(?<![\d.,])(?:\d{1,3}(?:,\d{3})+|\d+)\.\d{2}(?!\d)/g)){
   const value=Number(m[0].replaceAll(',',''));if(value>0&&value<=999999999)amounts.push({value,labelled});
  }
 }
 const priority=amounts.some(x=>x.labelled)?amounts.filter(x=>x.labelled):amounts;
 const unique=[...new Set(priority.map(x=>x.value))];
 const dates=[];
 const add=(d,m,y)=>{y=Number(y);if(y<100)y+=2000;if(y>2400)y-=543;d=Number(d);m=Number(m);const t=new Date(Date.UTC(y,m-1,d));if(y>=2000&&y<=2100&&t.getUTCFullYear()===y&&t.getUTCMonth()===m-1&&t.getUTCDate()===d)dates.push(`${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`);};
 for(const m of text.matchAll(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\b/g))add(m[1],m[2],m[3]);
 const months=['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.','jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
 for(const m of text.matchAll(/(?<![\d.])(\d{1,2})[ \t]+([ก-๙.]+|[a-z]+)[ \t]+(\d{2,4})(?!\d)/gi)){const key=m[2].toLowerCase(),idx=months.findIndex(x=>x.replaceAll('.','')===key.replaceAll('.',''));if(idx>=0)add(m[1],idx%12+1,m[3]);}
 const ds=[...new Set(dates)];return {amount:unique.length===1?unique[0].toFixed(2):'',date:ds.length===1?ds[0]:''};
}

let library;
function loadOCR(){
 if(globalThis.Tesseract)return Promise.resolve(globalThis.Tesseract);
 return library??=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='https://cdn.jsdelivr.net/npm/tesseract.js@6.0.1/dist/tesseract.min.js';script.onload=()=>resolve(globalThis.Tesseract);script.onerror=()=>{script.remove();library=null;reject(new Error('โหลดตัวอ่านไม่สำเร็จ ตรวจอินเทอร์เน็ตแล้วลองใหม่ค่ะ'));};document.head.append(script);});
}
export function bindSlipReader(){
 const $=id=>document.getElementById(id);if(!$('slipFile'))return;
 let serial=0,worker=null,busy=false;
 const status=message=>{$('slipStatus').textContent=message;};
 const clear=()=>{serial++;busy=false;if(worker){worker.terminate().catch(()=>{});worker=null;}$('slipFile').value='';$('slipReview').hidden=true;$('slipAmount').value='';$('slipDate').value='';$('slipRead').disabled=false;status('อ่านในเครื่อง ไม่อัปโหลดหรือเก็บรูป · ครั้งแรกต้องโหลดตัวอ่านผ่านอินเทอร์เน็ต');};
 $('txDialog').addEventListener('close',clear);
 $('slipFile').addEventListener('change',()=>{serial++;busy=false;if(worker){worker.terminate().catch(()=>{});worker=null;}$('slipRead').disabled=false;clearReview();status('เลือกรูปแล้ว กดอ่านสลิปได้ค่ะ');});
 function clearReview(){$('slipReview').hidden=true;$('slipAmount').value='';$('slipDate').value='';}
 $('slipRead').onclick=async()=>{
  if(busy)return;const file=$('slipFile').files[0];if(!file){status('เลือกรูปสลิปก่อนค่ะ');return;}
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>10*1024*1024){status('ใช้รูป JPG, PNG หรือ WebP ขนาดไม่เกิน 10 MB ค่ะ');return;}
  const job=++serial;busy=true;$('slipRead').disabled=true;clearReview();status('กำลังโหลดตัวอ่านและอ่านสลิป… อาจใช้เวลาบนมือถือ');
  let ownWorker;
  try{
   const OCR=await loadOCR();if(job!==serial)return;
   ownWorker=await OCR.createWorker('tha+eng',1,{logger:m=>{if(job===serial&&m.status==='recognizing text')status('กำลังอ่าน '+Math.round(m.progress*100)+'%');}});
   if(job!==serial)return;worker=ownWorker;
   const {data}=await ownWorker.recognize(file);if(job!==serial)return;
   const result=parseSlipText(data.text);$('slipAmount').value=result.amount;$('slipDate').value=result.date;$('slipReview').hidden=false;
   status(result.amount&&result.date?'อ่านได้แล้ว ตรวจยอดและวันที่ก่อนใช้ค่ะ':'อ่านบางช่องไม่ชัดหรือพบหลายค่า กรุณากรอกตรวจแก้ในช่องด้านล่างค่ะ');
  }catch(error){if(job===serial)status('อ่านไม่สำเร็จ ลองรูปที่ชัดขึ้น หรือกรอกเองได้ค่ะ');}
  finally{if(ownWorker)await ownWorker.terminate().catch(()=>{});if(job===serial){worker=null;busy=false;$('slipRead').disabled=false;}}
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
