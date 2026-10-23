import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.57.4';
const BASE='https://mmvdhopogchcxwlstflk.supabase.co',KEY='sb_publishable_PYkDjHN3ULlFW9BavMvAVQ_d77eZZ5W';
const db=createClient(BASE,KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
const $=id=>document.getElementById(id);let current=null,busy=false,ready=false,cooldown=0,timer;
function controls(){const enabled=ready&&!busy&&Date.now()>=cooldown&&!!$('device').value;for(const id of ['sendCurrent','sendWebsite'])$(id).disabled=!enabled;$('inspect').disabled=busy;$('device').disabled=busy;}
async function call(action,payload={}){
 const {data,error}=await db.auth.getSession();if(error||!data?.session)throw Error('กรุณาเข้าสู่ระบบก่อน');
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),20000);
 try{const r=await fetch(BASE+'/functions/v1/push-reminders-test',{method:'POST',headers:{'Content-Type':'application/json',apikey:KEY,Authorization:'Bearer '+data.session.access_token},body:JSON.stringify({action,...payload}),signal:controller.signal});const v=await r.json();if(!r.ok){if(v.error==='wait_before_retry')throw Error('รออย่างน้อย 1 นาทีก่อนทดสอบอีกครั้ง');if(r.status===401)throw Error('กรุณาเข้าสู่ระบบใหม่');throw Error(v.error==='device_not_found'?'ไม่พบอุปกรณ์ที่เลือก กรุณาตรวจอีกครั้ง':'เรียกบริการ Test ไม่สำเร็จ ('+r.status+')');}return v;}finally{clearTimeout(timeout);}
}
async function inspect(){
 if(busy)return;busy=true;ready=false;controls();$('connection').textContent='กำลังตรวจอุปกรณ์…';$('deviceFields').hidden=true;
 try{const {data,error}=await db.auth.getUser();if(error||!data?.user){$('loginCard').hidden=false;$('connection').textContent='เข้าสู่ระบบด้วยบัญชีเดียวกับแอปก่อนค่ะ';return;}$('loginCard').hidden=true;
 current=null;try{const reg=await navigator.serviceWorker?.getRegistration(new URL('../',location.href).href);current=await reg?.pushManager?.getSubscription();}catch{}
 const info=await call('diagnose',{currentEndpoint:current?.endpoint||''});$('device').replaceChildren(new Option('เลือกอุปกรณ์',''));
 for(const item of info.devices){const date=new Date(item.updatedAt);const label=item.provider+' · '+(item.current?'เครื่องนี้ · ':'')+'ลงทะเบียน '+(Number.isNaN(+date)?'ไม่ทราบวัน':date.toLocaleDateString('th-TH',{timeZone:'Asia/Bangkok'}));$('device').append(new Option(label,item.id));if(item.current)$('device').value=item.id;}
 $('connection').textContent=info.devices.length?'พบอุปกรณ์ที่เปิดแจ้งเตือน '+info.devices.length+' รายการ เลือกเครื่องที่ต้องการทดสอบ':'ยังไม่มีอุปกรณ์ที่เปิดแจ้งเตือนในบัญชีนี้';
 $('keyMatch').textContent='';const key=current?.options?.applicationServerKey;if(key){const encoded=btoa(String.fromCharCode(...new Uint8Array(key))).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');$('keyMatch').textContent=encoded===info.publicKey?'กุญแจของเครื่องนี้ตรงกับเซิร์ฟเวอร์':'กุญแจของเครื่องนี้ไม่ตรงกับเซิร์ฟเวอร์ ต้องลงทะเบียนใหม่หลังตรวจสอบค่ะ';}
 $('deviceFields').hidden=!info.devices.length;ready=true;
 }catch(e){$('connection').textContent=e.message||'ตรวจไม่สำเร็จ กรุณาลองใหม่';}finally{busy=false;controls();}
}
async function send(subjectMode){
 if(busy||!ready||!$('device').value||Date.now()<cooldown)return;
 busy=true;cooldown=Date.now()+60000;controls();$('outcome').hidden=false;$('result').textContent='กำลังส่งหนึ่งข้อความ…';$('confirmActions').hidden=true;$('confirmation').textContent='';
 try{const r=await call('test',{subscriptionId:$('device').value,subjectMode});const mode=subjectMode==='website'?'ตัวแก้บน Test':'ค่าปัจจุบัน';
 $('result').textContent=r.sent?mode+' · '+r.provider+' ตอบรับการส่งแล้ว\nดูว่ามีข้อความ “My Finance · TEST” เด้งถึงเครื่องหรือไม่':mode+' · ส่งไม่สำเร็จ\nผู้ให้บริการ: '+r.provider+'\nรหัส: '+r.status+' · เหตุผล: '+r.reason+(r.expired?'\nการลงทะเบียนนี้หมดอายุ ต้องลงทะเบียนอุปกรณ์ใหม่':'');
 $('confirmActions').hidden=!r.sent;
 }catch(e){$('result').textContent='ยังยืนยันผลการส่งไม่ได้: '+(e.name==='AbortError'?'การเชื่อมต่อหมดเวลา ตรวจแจ้งเตือนก่อนลองซ้ำ':e.message);}finally{busy=false;controls();clearTimeout(timer);timer=setTimeout(controls,Math.max(0,cooldown-Date.now()));}
}
$('loginForm').addEventListener('submit',async e=>{e.preventDefault();const button=e.currentTarget.querySelector('button');if(button.disabled)return;button.disabled=true;try{const {error}=await db.auth.signInWithPassword({email:$('email').value.trim(),password:$('password').value});$('password').value='';if(error)throw Error('เข้าสู่ระบบไม่สำเร็จ กรุณาตรวจอีเมลและรหัสผ่าน');await inspect();}catch(e){$('connection').textContent=e.message;}finally{button.disabled=false;}});
$('inspect').addEventListener('click',inspect);$('device').addEventListener('change',controls);
$('sendCurrent').addEventListener('click',()=>send('current'));$('sendWebsite').addEventListener('click',()=>send('website'));
$('received').addEventListener('click',()=>{$('confirmation').textContent='ยืนยันว่าแจ้งเตือนถึงเครื่องแล้วค่ะ ผลนี้แสดงเฉพาะหน้านี้';});
$('notReceived').addEventListener('click',()=>{$('confirmation').textContent='ผู้ให้บริการตอบรับแล้ว แต่ทะเบียนที่เลือกอาจเป็นของการติดตั้งเดิม ให้เปิด My Finance Test สำหรับเครื่องนี้จากลิงค์ด้านบนเพื่อลงทะเบียนและทดสอบโดยตรงค่ะ';});
void inspect();
