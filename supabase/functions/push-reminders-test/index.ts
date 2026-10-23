import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
const admin=createClient(Deno.env.get('SUPABASE_URL'),Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),{auth:{persistSession:false,autoRefreshToken:false}});
const ORIGIN='https://narubetsupadon-debug.github.io';
const WEBSITE=ORIGIN+'/my-finance/';
const headers={'Content-Type':'application/json','Access-Control-Allow-Origin':ORIGIN,'Vary':'Origin','Access-Control-Allow-Headers':'authorization,apikey,content-type','Access-Control-Allow-Methods':'POST,OPTIONS'};
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers});
const attempts=new Map();
function providerOf(endpoint){
 if(typeof endpoint!=='string'||endpoint.length>4096||/[\\\s]/.test(endpoint))return null;
 try{const u=new URL(endpoint);if(u.protocol!=='https:'||u.username||u.password||u.port||u.hash||u.pathname==='/')return null;
 if(u.hostname==='fcm.googleapis.com')return 'Google';
 if(u.hostname==='updates.push.services.mozilla.com')return 'Mozilla';
 if(/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+push\.apple\.com$/.test(u.hostname))return 'Apple';
 if(/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+notify\.windows\.com$/.test(u.hostname))return 'Microsoft';
 }catch{}return null;
}
function safeReason(error){
 // Never return or log the raw body: it may echo endpoint tokens or request headers.
 try{const body=typeof error?.body==='string'?JSON.parse(error.body):null;const code=body?.reason||body?.error?.status;
 const known=new Set(['BadJwtToken','BadWebPushTopic','BadAuthorizationHeader','BadCryptoKey','BadEncryption','BadTtl','BadTopic','BadUrgency','DeviceTokenNotForTopic','Forbidden','ExpiredToken','InvalidToken','Unregistered','PayloadTooLarge','TooManyRequests','UNREGISTERED','INVALID_ARGUMENT','SENDER_ID_MISMATCH','PERMISSION_DENIED','UNAUTHENTICATED','THIRD_PARTY_AUTH_ERROR','INTERNAL','UNAVAILABLE','QUOTA_EXCEEDED']);
 if(known.has(code))return code;}catch{}
 const status=Number(error?.statusCode||0);
 return status===403?'Forbidden':status===404||status===410?'SubscriptionExpired':status===401?'Unauthorized':'ProviderRequestFailed';
}
async function handler(req){
 if(req.method==='OPTIONS')return json({ok:true});
 if(req.method!=='POST')return json({error:'method_not_allowed'},405);
 const origin=req.headers.get('origin');if(origin&&origin!==ORIGIN)return json({error:'origin_not_allowed'},403);
 const bearer=req.headers.get('authorization')||'';if(!bearer.toLowerCase().startsWith('bearer '))return json({error:'unauthorized'},401);
 try{
  const {data:auth,error:authError}=await admin.auth.getUser(bearer.slice(7));if(authError||!auth?.user)return json({error:'unauthorized'},401);
  const user=auth.user,body=await req.json().catch(()=>null);
  if(!body||!['diagnose','test'].includes(body.action))return json({error:'unknown_action'},400);
  if(body.action==='test'&&(!/^[0-9a-f-]{36}$/i.test(String(body.subscriptionId||''))||!['current','website'].includes(body.subjectMode)))return json({error:'invalid_test'},400);
  const {data:rows,error}=await admin.from('push_subscriptions').select('id,endpoint,p256dh,auth,updated_at').eq('user_id',user.id).eq('enabled',true).order('updated_at',{ascending:false});
  if(error)throw error;
  const {data:cfg,error:cfgError}=await admin.rpc('get_push_server_config');if(cfgError||!cfg?.vapid_public||!cfg?.vapid_private)return json({error:'server_config_unavailable'},503);
  if(body.action==='diagnose')return json({ok:true,publicKey:cfg.vapid_public,devices:(rows||[]).map(s=>({id:s.id,provider:providerOf(s.endpoint)||'Unsupported',updatedAt:s.updated_at,current:s.endpoint===body.currentEndpoint})),productionSubject:'mailto:noreply@myfinance.local',testSubject:WEBSITE});
  const sub=(rows||[]).find(s=>s.id===body.subscriptionId);if(!sub)return json({error:'device_not_found'},404);
  const provider=providerOf(sub.endpoint);if(!provider)return json({error:'unsupported_provider'},400);
  const now=Date.now();for(const [id,at]of attempts)if(now-at>=60000)attempts.delete(id);
  if(attempts.has(user.id))return json({error:'wait_before_retry',retryAfterSeconds:60},429);
  attempts.set(user.id,now);
  const subject=body.subjectMode==='website'?WEBSITE:'mailto:noreply@myfinance.local';
  try{
   // Only one owned device per deliberate click. No cron, subscription writes, or key rotation.
   await webpush.sendNotification({endpoint:sub.endpoint,keys:{p256dh:sub.p256dh,auth:sub.auth}},JSON.stringify({title:'🔔 My Finance · TEST',body:'ข้อความทดสอบแจ้งเตือน กรุณากลับไปยืนยันผลในหน้า Test',url:WEBSITE+'preview/push-test.html',tag:'my-finance-push-test'}),{TTL:60,timeout:10000,vapidDetails:{subject,publicKey:cfg.vapid_public,privateKey:cfg.vapid_private}});
   console.log(JSON.stringify({service:'push-reminders-test',provider,status:201,subjectMode:body.subjectMode}));
   return json({ok:true,sent:1,provider,subjectMode:body.subjectMode,delivery:'provider_accepted'});
  }catch(e){const status=Number(e?.statusCode||0),reason=safeReason(e);
   console.error(JSON.stringify({service:'push-reminders-test',provider,status,reason,subjectMode:body.subjectMode}));
   return json({ok:false,sent:0,provider,status,reason,subjectMode:body.subjectMode,expired:status===404||status===410});
  }
 }catch{console.error('push-reminders-test internal_error');return json({error:'server_error'},500);}
}
Deno.serve(handler);
