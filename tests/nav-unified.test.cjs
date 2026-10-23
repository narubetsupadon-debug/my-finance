const fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const css=read('nav-unified.css'),nav=read('app-nav.js');
const pages=['index.html','test.html','rent.html','car.html','salary.html'];
for(const p of pages){
 const html=read('preview/'+p);
 const link='../nav-unified.css?v=20261023-hidefix04';
 assert.equal(html.split(link).length-1,1,'One unified navigation CSS per Test page: '+p);
 assert.ok(html.indexOf('mobile-compact.css')<html.indexOf(link),'Unified nav CSS must load last: '+p);
 assert.match(html,/PREVIEW_READ_ONLY/,'Test must not change financial records: '+p);
 assert.match(html,/src="\.\.\/app-nav\.js\?v=/,'Use shared menu code: '+p);
}
assert.deepEqual([...nav.matchAll(/\['(dashboard|transactions|capture|summary)','/g)].map(x=>x[1]),['dashboard','transactions','capture','summary'],'Main destinations unchanged');
assert.match(nav,/makeButton\(\['more','☰','เพิ่มเติม'\]/,'More menu preserved');
assert.match(css,/\.mobile-app-nav\.is-scroll-hidden/,'Menu must remain visible on page scroll');
assert.match(css,/transform:none!important/,'No nav movement on scroll');
assert.match(css,/grid-template-columns:repeat\(5,minmax\(0,1fr\)\)/,'Exactly five equal slots');
assert.match(css,/safe-area-inset-bottom/,'iPhone safe area preserved');
assert.doesNotMatch(css,/display:none!important/,'Never hide the menu');
assert.equal((css.match(/\{/g)||[]).length,(css.match(/\}/g)||[]).length,'CSS braces balanced');
for(const p of ['index.html','rent.html','car.html','salary.html']){
 assert.ok(!read(p).includes('nav-unified.css'),'Production stays untouched until approval: '+p);
}
console.log('PASS unified bottom nav: all five test views, same fixed layout and read-only production isolation');
