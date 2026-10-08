const {JSDOM}=require('jsdom');
const fs=require('fs'),assert=require('node:assert/strict');
(async()=>{
 const code=fs.readFileSync(require('path').join(__dirname,'../app-storage.js'),'utf8');
 const {formatCapacity,renderCapacity,createCapacityMonitor}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
 const dom=new JSDOM(fs.readFileSync(require('path').join(__dirname,'../index.html'),'utf8')),$=id=>dom.window.document.getElementById(id);
 const data={databaseBytes:13743795,databaseLimitBytes:500000000,fileBytes:0,fileLimitBytes:1000000000,appTableBytes:1048576,transactionCount:239,fileCount:0,unknownFileSizes:0,checkedAt:'2026-10-08T02:30:00Z'};
 assert.equal(formatCapacity(0),'0 B');assert.equal(formatCapacity(1e9),'1.00 GB');assert.equal(formatCapacity(-1),'—');
 renderCapacity($,data);assert.ok(Math.abs($('capacityDbBar').value-2.748759)<1e-10);assert.match($('capacityDbRemaining').textContent,/2.75%/);assert.equal($('capacityFilesBar').value,0);
 renderCapacity($,{...data,databaseBytes:450000000});assert.equal($('capacityDbState').textContent,'ใกล้เต็ม');assert.ok($('capacityDbBar').classList.contains('capacity-warning'));
 renderCapacity($,{...data,databaseBytes:600000000,unknownFileSizes:1});assert.equal($('capacityDbBar').value,100);assert.equal($('capacityDbState').textContent,'ถึงโควตาแล้ว');assert.match($('capacityDbRemaining').textContent,/เหลือ 0 B/);assert.match($('capacityDetail').textContent,/ระบุขนาดไม่ได้/);
 let owner={id:'one'},visible=false,tick,calls=0,resolve,mode='ok';
 const monitor=createCapacityMonitor({$,getUser:()=>owner,isVisible:()=>visible,setTimer:(callback,delay)=>{tick=callback;assert.equal(delay,30000)},rpc:()=>{calls++;if(mode==='pending')return new Promise(r=>resolve=r);if(mode==='fail')throw Error('network');return Promise.resolve({data})}});
 await monitor.sync();assert.equal(calls,0);tick();assert.equal(calls,0);visible=true;await monitor.sync();assert.equal(calls,1);assert.match($('capacityStatus').textContent,/30/);
 mode='fail';await monitor.refresh();assert.match($('capacityStatus').textContent,/ครั้งก่อน/);assert.match($('capacityDbAmount').textContent,/13.74 MB/);assert.equal($('refreshCapacity').disabled,false);
 mode='pending';const first=monitor.refresh(),second=monitor.refresh();await Promise.resolve();assert.equal(calls,3);monitor.clear();owner={id:'two'};resolve({data:{...data,databaseBytes:999}});await Promise.all([first,second]);assert.equal($('capacityDbAmount').textContent,'—');assert.equal($('refreshCapacity').disabled,false);
 owner=null;await monitor.refresh();assert.equal(calls,3);owner={id:'two'};mode='fail';await monitor.refresh();assert.match($('capacityStatus').textContent,/ยังตรวจพื้นที่ไม่ได้/);assert.equal($('capacityDbAmount').textContent,'—');
 dom.window.close();console.log('PASS capacity: units, quota limits, warning/full states, visible-page polling, in-flight deduplication, offline stale labels, sign-out/owner race and synchronous errors');
})().catch(e=>{console.error(e);process.exit(1)});
