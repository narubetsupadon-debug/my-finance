// Scriptable for iPhone. Public project key only; no owner credentials in this file.
// Log in privately in the prompt. Session tokens are saved in iOS Keychain.
// This script only reads financial data. It never creates/edits transactions.
const BASE='https://mmvdhopogchcxwlstflk.supabase.co';
const PUBLIC_KEY='sb_publishable_PYkDjHN3ULlFW9BavMvAVQ_d77eZZ5W';
const WEBSITE='https://narubetsupadon-debug.github.io/my-finance/';
const SESSION_KEY='my-finance-widget-session-v1';

async function api(path,{token,method='GET',body}={}){
 const request=new Request(BASE+path);request.method=method;request.timeoutInterval=15;
 // Scriptable bridges headers as a dictionary snapshot. Assign the complete
 // dictionary once; modifying request.headers.Authorization can be discarded.
 request.headers={apikey:PUBLIC_KEY,'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})};
 if(body)request.body=JSON.stringify(body);
 request.onRedirect=()=>null;
 const data=await request.loadJSON(),status=request.response.statusCode;
 if(status<200||status>=300){const message=data?.error_code==='invalid_credentials'?'อีเมลหรือรหัสผ่านไม่ถูกต้อง':data?.error_code==='no_authorization'?'สคริปต์ไม่ได้ส่งโทเคน กรุณาอัปเดตสคริปต์':status===400||status===401?'เข้าสู่ระบบใหม่ใน Scriptable ค่ะ':'เชื่อมข้อมูลไม่สำเร็จ ลองใหม่ค่ะ';const error=new Error(message);error.status=status;throw error;}
 return data;
}
function storeSession(data){
 if(!data.access_token||!data.refresh_token||!data.user?.id)throw new Error('ข้อมูลเข้าสู่ระบบไม่ครบ');
 const session={access_token:data.access_token,refresh_token:data.refresh_token,user_id:data.user.id,expires_at:data.expires_at||Math.floor(Date.now()/1000)+data.expires_in};
 Keychain.set(SESSION_KEY,JSON.stringify(session));return session;
}
async function login(){
 if(config.runsInWidget)throw new Error('เปิดสคริปต์ใน Scriptable เพื่อเข้าสู่ระบบก่อนค่ะ');
 const alert=new Alert();alert.title='My Finance';alert.message='ใช้บัญชีเดียวกับเว็บไซต์ รหัสผ่านส่งตรงไป Supabase ไม่เก็บรหัสผ่านไว้ในสคริปต์';
 alert.addTextField('อีเมล');alert.addSecureTextField('รหัสผ่าน');alert.addAction('เข้าสู่ระบบ');alert.addCancelAction('ยกเลิก');
 if(await alert.presentAlert()===-1)throw new Error('ยกเลิกการเข้าสู่ระบบ');
 return storeSession(await api('/auth/v1/token?grant_type=password',{method:'POST',body:{email:alert.textFieldValue(0).trim(),password:alert.textFieldValue(1)}}));
}
async function getSession(){
 let session=Keychain.contains(SESSION_KEY)?JSON.parse(Keychain.get(SESSION_KEY)):await login();
 if(!Number.isFinite(session.expires_at)||session.expires_at<Date.now()/1000+120){
  try{session=storeSession(await api('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:{refresh_token:session.refresh_token}}));}
  catch(error){if([400,401].includes(error.status)){Keychain.remove(SESSION_KEY);return login();}throw error;}
 }
 // Check the session with the server; do not authorize using editable profile data.
 const user=await api('/auth/v1/user',{token:session.access_token});
 if(user.id!==session.user_id)throw new Error('บัญชีไม่ตรงกัน กรุณาเข้าสู่ระบบใหม่');
 return session;
}
async function readAll(table,query,session){
 const rows=[];
 for(let offset=0;offset<100000;offset+=500){
  const page=await api('/rest/v1/'+table+'?'+query+'&user_id=eq.'+encodeURIComponent(session.user_id)+'&order=id.asc&limit=500&offset='+offset,{token:session.access_token});
  if(!Array.isArray(page))throw new Error('ข้อมูลไม่ครบ');rows.push(...page);if(page.length<500)return rows;
 }
 throw new Error('ข้อมูลมากเกินไป กรุณาเปิดเว็บ');
}
function currentDay(){
 // UTC+7, same day boundary as the website. Independent of iPhone timezone.
 return new Date(Date.now()+7*3600000).toISOString().slice(0,10);
}
function totals(budgets,rows,day){
 const cents=x=>Math.round(Number(x.amount)*100);
 const expenses=rows.filter(x=>x.type==='expense'&&x.status!=='cancelled');
 const today=expenses.filter(x=>x.transaction_date===day).reduce((s,x)=>s+cents(x),0);
 const active=budgets.filter(x=>x.is_active),names=new Set(active.flatMap(x=>x.category_names||[]));
 const limit=active.reduce((s,x)=>s+Math.round(Number(x.monthly_limit||0)*100),0);
 const spent=expenses.filter(x=>x.transaction_date.slice(0,7)===day.slice(0,7)&&names.has(x.categories?.name)).reduce((s,x)=>s+cents(x),0);
 return {today,limit,spent,remaining:Math.max(0,limit-spent)};
}
function text(widget,value,size,color){const line=widget.addText(value);line.font=Font.semiboldSystemFont(size);line.textColor=new Color(color);line.minimumScaleFactor=.65;line.lineLimit=1;return line;}
function money(cents){return '฿'+(cents/100).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});}
async function main(){
 const widget=new ListWidget();widget.backgroundColor=new Color('#171b32');widget.setPadding(16,16,16,16);widget.url=WEBSITE;widget.refreshAfterDate=new Date(Date.now()+15*60000);
 try{
  if(!config.runsInWidget&&Keychain.contains(SESSION_KEY)){
   const menu=new Alert();menu.title='My Finance Widget';menu.addAction('อัปเดต / ดูตัวอย่าง');menu.addDestructiveAction('ออกจากระบบวิดเจ็ต');menu.addCancelAction('ยกเลิก');
   const action=await menu.presentSheet();if(action===-1){Script.complete();return;}if(action===1){
    const session=JSON.parse(Keychain.get(SESSION_KEY));try{await api('/auth/v1/logout?scope=local',{token:session.access_token,method:'POST'});}catch{}Keychain.remove(SESSION_KEY);throw new Error('ออกจากระบบแล้ว ลบวิดเจ็ตบนหน้าจอด้วยค่ะ');
   }
  }
  const session=await getSession(),day=currentDay(),month=day.slice(0,7),[y,m]=month.split('-').map(Number),next=new Date(Date.UTC(y,m,1)).toISOString().slice(0,10);
  const [rows,budgets]=await Promise.all([
   readAll('transactions','select=id,amount,type,status,transaction_date,categories(name)&transaction_date=gte.'+month+'-01&transaction_date=lt.'+next,session),
   readAll('budgets','select=id,is_active,monthly_limit,category_names',session)
  ]);
  const data=totals(budgets,rows,day);
  text(widget,'MY FINANCE',11,'aaa7ff');widget.addSpacer(8);text(widget,'วันนี้ใช้ไป',12,'d8d9e4');text(widget,money(data.today),config.widgetFamily==='small'?24:30,'ffffff');widget.addSpacer(8);
  text(widget,'งบเดือนนี้เหลือ',12,'d8d9e4');text(widget,data.limit?money(data.remaining):'ยังไม่ตั้งงบ',config.widgetFamily==='small'?20:26,'79dec4');widget.addSpacer();
  const df=new DateFormatter();df.dateFormat='dd/MM HH:mm';df.timeZone='Asia/Bangkok';text(widget,'อัปเดต '+df.string(new Date()),10,'a3a8be');
 }catch(error){text(widget,'MY FINANCE',12,'aaa7ff');widget.addSpacer(10);const line=widget.addText(error.message||'เชื่อมต่อไม่ได้ กรุณาเปิด Scriptable');line.font=Font.systemFont(12);line.textColor=new Color('#ffffff');widget.addSpacer();text(widget,'ไม่มีข้อมูลใหม่ · แตะเปิดเว็บ',10,'a3a8be');}
 Script.setWidget(widget);if(!config.runsInWidget)await widget.presentMedium();Script.complete();
}
await main();
