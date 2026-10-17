// Scriptable for iPhone. Public project key only; no owner credentials in this file.
// Log in privately in the prompt. Session tokens are saved in iOS Keychain.
// This script only reads financial data. It never creates/edits transactions.
const BASE='https://mmvdhopogchcxwlstflk.supabase.co';
const PUBLIC_KEY='sb_publishable_PYkDjHN3ULlFW9BavMvAVQ_d77eZZ5W';
const WEBSITE='https://narubetsupadon-debug.github.io/my-finance/';
const SESSION_KEY='my-finance-widget-session-v1';
const CHECK_KEY='my-finance-widget-last-success-v1';
function lastCheck(){
 try{if(!Keychain.contains(SESSION_KEY)||!Keychain.contains(CHECK_KEY))return null;const session=JSON.parse(Keychain.get(SESSION_KEY)),last=JSON.parse(Keychain.get(CHECK_KEY));return last.owner===session.user_id&&Number.isFinite(last.at)?new Date(last.at):null;}catch{return null;}
}
function checkedLabel(at){const df=new DateFormatter();df.dateFormat='dd/MM HH:mm';df.timeZone='Asia/Bangkok';return df.string(at);}

async function api(path,{token,method='GET',body}={}){
 const request=new Request(BASE+path);request.method=method;request.timeoutInterval=15;
 // Scriptable bridges headers as a dictionary snapshot. Assign the complete
 // dictionary once; modifying request.headers.Authorization can be discarded.
 request.headers={apikey:PUBLIC_KEY,'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})};
 if(body)request.body=JSON.stringify(body);
 request.onRedirect=()=>null;
 const data=await request.loadJSON(),status=request.response.statusCode;
 if(status<200||status>=300){const message=data?.error_code==='invalid_credentials'?'อีเมลหรือรหัสผ่านไม่ถูกต้อง':data?.error_code==='no_authorization'?'สคริปต์ไม่ได้ส่งโทเคน กรุณาอัปเดตสคริปต์':data?.error_code==='session_not_found'?'การเข้าสู่ระบบเดิมหมดอายุ เปิด Scriptable เพื่อเข้าสู่ระบบใหม่ค่ะ':status===400||status===401?'เข้าสู่ระบบใหม่ใน Scriptable ค่ะ':'เชื่อมข้อมูลไม่สำเร็จ ลองใหม่ค่ะ';const error=new Error(message);error.status=status;error.code=data?.error_code;throw error;}
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
 let user;
 try{user=await api('/auth/v1/user',{token:session.access_token});}
 catch(error){
  if(error.code==='session_not_found'||error.status===401&&error.code!=='no_authorization'){
   Keychain.remove(SESSION_KEY);session=await login();
   user=await api('/auth/v1/user',{token:session.access_token});
  }else throw error;
 }
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
function budgetPercent(data){return data.limit>0?Math.round(data.spent/data.limit*100):null;}
function budgetRing(data,size){
 const ctx=new DrawContext();ctx.size=new Size(size,size);ctx.opaque=false;ctx.respectScreenScale=true;
 const percent=budgetPercent(data),fill=percent===null?0:Math.min(100,Math.max(0,percent));
 const dot=size*.065,radius=size*.405,center=size/2;
 for(let i=0;i<100;i++){
  const angle=(i/100*Math.PI*2)-Math.PI/2;
  ctx.setFillColor(new Color(i<fill?(data.spent>data.limit?'#ffc28c':'#79dec4'):'#3b405b'));
  ctx.fillEllipse(new Rect(center+Math.cos(angle)*radius-dot/2,center+Math.sin(angle)*radius-dot/2,dot,dot));
 }
 ctx.setFont(Font.semiboldSystemFont(size*.23));ctx.setTextColor(new Color('#ffffff'));ctx.setTextAlignedCenter();
 ctx.drawTextInRect(percent===null?'—':percent+'%',new Rect(0,size*.36,size,size*.3));
 return ctx.getImage();
}
function text(widget,value,size,color){const line=widget.addText(value);line.font=Font.semiboldSystemFont(size);line.textColor=new Color(color);line.minimumScaleFactor=.65;line.lineLimit=1;return line;}
function money(cents){return '฿'+(cents/100).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});}
function cardMode(parameter){
 const parts=String(parameter||'').trim().split(':');
 return parts[0].toLowerCase()==='cards'?{id:parts.slice(1).join(':').trim()}:null;
}
function cardBalances(rows,id=''){
 return rows.filter(x=>x.debt_type==='credit_card'&&(!id||String(x.id)===id)).map(x=>{
  const limit=Number(x.original_amount||0),used=Number(x.outstanding_amount||0);
  if(!Number.isFinite(limit)||!Number.isFinite(used)||limit<0||used<0)throw new Error('ข้อมูลวงเงินไม่ถูกต้อง กรุณาตรวจในเว็บ');
  const limitCents=Math.round(limit*100),usedCents=Math.round(used*100);
  return {id:x.id,name:x.name||'บัตรเครดิต',limit:limitCents,spent:usedCents,remaining:Math.max(0,limitCents-usedCents),over:Math.max(0,usedCents-limitCents)};
 }).sort((a,b)=>String(a.name).localeCompare(String(b.name),'th')||String(a.id).localeCompare(String(b.id)));
}
function renderCards(widget,cards,checkedAt,selected){
 const family=config.widgetFamily||'medium',small=family==='small',capacity=small?1:family==='large'?3:2;
 widget.url=WEBSITE+'#debts';text(widget,'MY FINANCE · บัตร',11,'aaa7ff');widget.addSpacer(6);
 if(!cards.length){text(widget,selected?'ไม่พบบัตรที่เลือก':'ยังไม่มีบัตรเครดิต',14,'ffffff');text(widget,'จัดการที่เมนูบัตรและสินเชื่อ',11,'a3a8be');}
 for(const card of cards.slice(0,capacity)){
  const row=widget.addStack();row.layoutHorizontally();row.centerAlignContent();
  const col=row.addStack();col.layoutVertically();text(col,card.name,11,'ffffff');
  text(col,'เหลือ '+money(card.remaining),small?17:18,card.over?'ffc28c':'79dec4');
  if(small){text(col,'ใช้ '+money(card.spent),10,'d8d9e4');text(col,'วงเงิน '+money(card.limit),10,'a3a8be');}
  else text(col,'ใช้ '+money(card.spent)+' / วงเงิน '+money(card.limit),10,'d8d9e4');
  if(card.over)text(col,'เกินวงเงิน '+money(card.over),10,'ffc28c');
  if(!small){row.addSpacer();const ring=row.addImage(budgetRing(card,44));ring.imageSize=new Size(44,44);}
  widget.addSpacer(5);
 }
 if(cards.length>capacity)text(widget,'อีก '+(cards.length-capacity)+' บัตร · แตะดูทั้งหมด',10,'aaa7ff');
 widget.addSpacer();text(widget,'ข้อมูล ณ '+checkedLabel(checkedAt),10,'a3a8be');
 text(widget,'ยอดตามที่บันทึกในแอป',9,'a3a8be');
}
async function main(){
 const widget=new ListWidget();widget.backgroundColor=new Color('#171b32');const padding=config.widgetFamily==='small'?12:16;widget.setPadding(padding,padding,padding,padding);widget.url=WEBSITE;widget.refreshAfterDate=new Date(Date.now()+10*60000);
 try{
  if(!config.runsInWidget&&Keychain.contains(SESSION_KEY)){
   const menu=new Alert();menu.title='My Finance Widget';menu.addAction('อัปเดต / ดูตัวอย่าง');menu.addDestructiveAction('ออกจากระบบวิดเจ็ต');menu.addCancelAction('ยกเลิก');
   const action=await menu.presentSheet();if(action===-1){Script.complete();return;}if(action===1){
    const session=JSON.parse(Keychain.get(SESSION_KEY));try{await api('/auth/v1/logout?scope=local',{token:session.access_token,method:'POST'});}catch{}Keychain.remove(SESSION_KEY);if(Keychain.contains(CHECK_KEY))Keychain.remove(CHECK_KEY);throw new Error('ออกจากระบบแล้ว ลบวิดเจ็ตบนหน้าจอด้วยค่ะ');
   }
  }
  const session=await getSession(),mode=cardMode(typeof args==='undefined'?'':args.widgetParameter);
  if(mode){
   const rows=await readAll('debts','select=id,name,debt_type,original_amount,outstanding_amount',session),cards=cardBalances(rows,mode.id),checkedAt=new Date();
   renderCards(widget,cards,checkedAt,mode.id);
   try{Keychain.set(CHECK_KEY,JSON.stringify({owner:session.user_id,at:checkedAt.getTime()}));}catch{}
   Script.setWidget(widget);if(!config.runsInWidget)await widget.presentMedium();Script.complete();return;
  }
  const day=currentDay(),month=day.slice(0,7),[y,m]=month.split('-').map(Number),next=new Date(Date.UTC(y,m,1)).toISOString().slice(0,10);
  const [rows,budgets]=await Promise.all([
   readAll('transactions','select=id,amount,type,status,transaction_date,categories(name)&transaction_date=gte.'+month+'-01&transaction_date=lt.'+next,session),
   readAll('budgets','select=id,is_active,monthly_limit,category_names',session)
  ]);
  const data=totals(budgets,rows,day);
  const checkedAt=new Date();try{Keychain.set(CHECK_KEY,JSON.stringify({owner:session.user_id,at:checkedAt.getTime()}));}catch{}
  const small=config.widgetFamily==='small';
  text(widget,'MY FINANCE',11,'aaa7ff');widget.addSpacer(4);
  const amountRow=widget.addStack();amountRow.layoutHorizontally();amountRow.centerAlignContent();
  const amountCol=amountRow.addStack();amountCol.layoutVertically();text(amountCol,'วันนี้ใช้ไป',12,'d8d9e4');text(amountCol,money(data.today),small?22:28,'ffffff');
  if(!small){amountCol.addSpacer(6);text(amountCol,'งบเดือนนี้เหลือ',12,'d8d9e4');text(amountCol,data.limit?money(data.remaining):'ยังไม่ตั้งงบ',22,'79dec4');}
  amountRow.addSpacer(small?4:null);const graphCol=amountRow.addStack();graphCol.layoutVertically();
  const ringSize=small?40:80;
  const graph=graphCol.addImage(budgetRing(data,ringSize));graph.imageSize=new Size(ringSize,ringSize);
  text(graphCol,data.limit?'งบเดือนนี้':'ยังไม่ตั้งงบ',small?8:10,'a3a8be');widget.addSpacer(3);
  if(small){text(widget,'งบเดือนนี้เหลือ',12,'d8d9e4');text(widget,data.limit?money(data.remaining):'ยังไม่ตั้งงบ',20,'79dec4');}widget.addSpacer();
  text(widget,'ข้อมูล ณ '+checkedLabel(checkedAt),10,'a3a8be');
  text(widget,'อ่านสำเร็จ',9,'79dec4');
 }catch(error){text(widget,'MY FINANCE',12,'aaa7ff');widget.addSpacer(10);const line=widget.addText(error.message||'เชื่อมต่อไม่ได้ กรุณาเปิด Scriptable');line.font=Font.systemFont(12);line.textColor=new Color('#ffffff');widget.addSpacer();const last=lastCheck();text(widget,last?'สำเร็จล่าสุด '+checkedLabel(last):'ยังไม่มีข้อมูลล่าสุด',10,'a3a8be');text(widget,'อัปเดตไม่สำเร็จ · แตะเปิดเว็บ',9,'ffc28c');}
 Script.setWidget(widget);if(!config.runsInWidget)await widget.presentMedium();Script.complete();
}
await main();
