const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const css=read('preview/mobile-polish.css');
for(const p of ['index.html','test.html','rent.html','car.html','salary.html']){
 const s=read('preview/'+p);
 assert.equal(s.split('mobile-polish.css?v=20261023-polish01').length-1,1,p+' must include polish once');
 assert.ok(s.indexOf('mobile-polish.css')>s.indexOf('nav-unified.css'),p+' nav styling remains available');
 assert.match(s,/PREVIEW_READ_ONLY/,p+' must stay read-only');
}
assert.match(css,/font-size:16px/,'Prevent iPhone zoom on input focus');
assert.match(css,/min-height:46px/,'Keep large save targets');
assert.match(css,/overflow-x:auto/,'Period chips should not spill on small screens');
assert.doesNotMatch(css,/mobile-app-nav|is-scroll-hidden|display:none!important/,'Do not override the five-tab scroll behavior');
assert.equal((css.match(/\{/g)||[]).length,(css.match(/\}/g)||[]).length,'Stylesheet braces balanced');
for(const p of ['index.html','rent.html','car.html','salary.html'])assert.match(read(p),/mobile-polish\.css\?v=20261023-quality02&navux=01/,'Approved mobile polish released: '+p);
console.log('PASS preview mobile polish across all Test pages without altering nav or finance data');
