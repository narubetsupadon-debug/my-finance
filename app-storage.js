export function formatCapacity(bytes){
 const n=Number(bytes);if(!Number.isFinite(n)||n<0)return '—';
 return n>=1e9?(n/1e9).toFixed(2)+' GB':n>=1e6?(n/1e6).toFixed(2)+' MB':n>=1e3?(n/1e3).toFixed(2)+' KB':n+' B';
}
export function renderCapacity($,data){
 for(const [prefix,usedKey,limitKey] of [['capacityDb','databaseBytes','databaseLimitBytes'],['capacityFiles','fileBytes','fileLimitBytes']]){
  const used=Number(data[usedKey]),limit=Number(data[limitKey]);
  if(!Number.isFinite(used)||used<0||!Number.isFinite(limit)||limit<=0)throw Error('invalid capacity');
  const percent=used/limit*100,bar=$(prefix+'Bar');bar.max=100;bar.value=Math.min(100,percent);
  bar.classList.toggle('capacity-warning',percent>=80);bar.classList.toggle('capacity-full',percent>=100);
  $(prefix+'Amount').textContent=formatCapacity(used)+' / '+formatCapacity(limit);
  $(prefix+'Remaining').textContent='ใช้ '+percent.toFixed(2)+'% · เหลือ '+formatCapacity(Math.max(0,limit-used));
  $(prefix+'State').textContent=percent>=100?'ถึงโควตาแล้ว':percent>=80?'ใกล้เต็ม':'ยังมีพื้นที่';
 }
 $('capacityDetail').textContent='ตารางแอพรวมดัชนี '+formatCapacity(data.appTableBytes)+' · '+data.transactionCount+' รายการ · ไฟล์ '+data.fileCount+' ไฟล์'+(Number(data.unknownFileSizes)>0?' · มี '+data.unknownFileSizes+' ไฟล์ที่ยังระบุขนาดไม่ได้':'');
 $('capacityCheckedAt').textContent='ตรวจล่าสุด '+new Date(data.checkedAt).toLocaleString('th-TH',{timeZone:'Asia/Bangkok',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',second:'2-digit'});
}
export function createCapacityMonitor({$,rpc,getUser,isVisible,setTimer=setInterval}){
 let revision=0,inflight=null,last=null;
 async function refresh(){
  const owner=getUser()?.id;if(!owner)return false;if(inflight)return inflight;
  const current=revision;const button=$('refreshCapacity');button.disabled=true;$('capacityStatus').textContent='กำลังตรวจพื้นที่…';
  inflight=(async()=>{try{
   const result=await Promise.resolve().then(rpc);if(result.error)throw result.error;
   if(current!==revision||getUser()?.id!==owner)return false;
   renderCapacity($,result.data);last=result.data;$('capacityStatus').textContent='อัปเดตอัตโนมัติทุก 30 วินาทีขณะเปิดหน้านี้';return true;
  }catch(error){if(current===revision&&getUser()?.id===owner)$('capacityStatus').textContent=last?'อัปเดตไม่สำเร็จ · กำลังแสดงค่าที่ตรวจครั้งก่อน':'ยังตรวจพื้นที่ไม่ได้ · ลองรีเฟรชอีกครั้ง';return false;
  }finally{if(current===revision){inflight=null;button.disabled=false;}}})();
  return inflight;
 }
 function sync(){if(isVisible())return refresh();return Promise.resolve(false)}
 function clear(){revision++;inflight=null;last=null;$('refreshCapacity').disabled=false;$('capacityStatus').textContent='เปิดหน้านี้เพื่อตรวจพื้นที่ล่าสุด';$('capacityCheckedAt').textContent='ยังไม่ได้ตรวจ';$('capacityDetail').textContent='';for(const p of ['capacityDb','capacityFiles']){$(p+'Bar').value=0;$(p+'Amount').textContent='—';$(p+'Remaining').textContent='ยังไม่ได้ตรวจ';$(p+'State').textContent='';}}
 $('refreshCapacity').addEventListener('click',()=>void refresh());setTimer(()=>void sync(),30000);
 return {refresh,sync,clear};
}
