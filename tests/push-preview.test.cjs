const {JSDOM}=require('jsdom'),fs=require('fs'),assert=require('node:assert/strict');
const html=fs.readFileSync('preview/push-test.html','utf8'),source=fs.readFileSync('preview/push-test.js','utf8').replace(/^import .*$/gm,'');
async function run(signedIn=true){
 const d=new JSDOM(html,{url:'https://narubetsupadon-debug.github.io/my-finance/preview/push-test.html',runScripts:'outside-only'}),w=d.window,calls=[];let accepted=true;
 w.createClient=()=>({auth:{getUser:async()=>signedIn?{data:{user:{id:'owner'}}}:{data:{user:null}},getSession:async()=>({data:{session:{access_token:'fixture-token'}}}),signInWithPassword:async()=>({})}});
 w.fetch=async(url,options)=>{assert(url.endsWith('/push-reminders-test'));assert.equal(options.headers.Authorization,'Bearer fixture-token');const b=JSON.parse(options.body);calls.push(b);return {ok:true,json:async()=>b.action==='diagnose'?{publicKey:'fixture-public',devices:[{id:'fixture-device',provider:'Apple',updatedAt:'2026-10-23T01:00:00Z',current:false}]}:accepted?{sent:1,provider:'Apple'}:{sent:0,provider:'Apple',status:403,reason:'BadJwtToken'}}};
 w.eval(source);const wait=()=>new Promise(r=>setTimeout(r,0));await wait();const $=id=>w.document.getElementById(id);
 if(!signedIn){assert.equal(calls.length,0);assert.equal($('loginCard').hidden,false);w.close();return;}
 assert.equal(calls.length,1);assert.equal(calls[0].action,'diagnose');assert.equal($('sendWebsite').disabled,true);
 $('device').value='fixture-device';$('device').dispatchEvent(new w.Event('change'));assert.equal($('sendWebsite').disabled,false);
 $('sendWebsite').click();$('sendCurrent').click();await wait();assert.equal(calls.length,2);assert.equal(calls[1].subjectMode,'website');assert.equal(calls[1].subscriptionId,'fixture-device');assert.equal($('sendWebsite').disabled,true);assert.match($('result').textContent,/ตอบรับการส่ง/);assert.equal($('confirmation').textContent,'');
 $('received').click();assert.match($('confirmation').textContent,/ถึงเครื่องแล้ว/);w.close();
}
(async()=>{await run(false);await run();console.log('PASS push preview: sign-in gate, diagnosis without sending, explicit device selection, one send per click, cooldown and separate receipt confirmation');})().catch(e=>{console.error(e);process.exit(1)});
