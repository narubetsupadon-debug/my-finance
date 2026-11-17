const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),read=name=>fs.readFileSync(path.join(root,name),'utf8');
for(const page of ['index.html','rent.html','car.html','salary.html']){
 const html=read(page);
 assert.match(html,/nav-unified\.css\?v=20261023-quality02&navux=01/,page+' unified bottom tabs');
 assert.match(html,/mobile-polish\.css\?v=20261023-quality02&navux=01/,page+' polish');
 assert.doesNotMatch(html,/PREVIEW_READ_ONLY/,page+' production must not have test write guard');
}
for(const css of ['nav-unified.css','mobile-polish.css','rent-refresh.css']){
 const content=read(css);assert.equal((content.match(/\{/g)||[]).length,(content.match(/\}/g)||[]).length,css+' braces balanced');
}
const rent=read('rent.html');
for(const id of ['rentMonth','rentDate','rentFull','rentMy','rentHalf','rentStatus','rentAccount','rentCategory','rentExisting','rentNote','saveRent','rentHistory']){
 assert.equal(rent.split('id="'+id+'"').length-1,1,'Rent IDs preserved '+id);
}
assert.match(rent,/class="rent-advanced"/,'Rent details accessible');
assert.match(rent,/nav-scroll\.js\?v=20261023-quality02&navux=01/,'Rent inner scroll listener');
const nav=read('nav-unified.css');
assert.match(nav,/body:has\(\.finance-detail-page\) \.mobile-app-nav\.is-scroll-hidden\s*\{/,'Car and salary hide selector');
assert.match(nav,/translateY\(calc\(100%/,'Scroll down hides tabs');
assert.match(nav,/\.mobile-app-nav:not\(\.is-scroll-hidden\)/,'Scroll up reveals tabs');
const sw=read('sw.js');
assert.match(sw,/my-finance-direct-payment-v1\.0\.23/);
for(const p of ['nav-unified.css','mobile-polish.css','rent-refresh.css','nav-scroll.js'])assert.ok(sw.includes('./'+p+'?v=20261023-quality02&navux=01'),p+' offline cached');
console.log('PASS production mobile UX release: 4 pages, rent fields, scrolling, offline cache, no test guard');

assert.ok(read('index.html').includes('./dashboard-mobile.css?v=20261023-quality02&overview=09'),'Approved overview CSS must load');assert.ok(read('sw.js').includes('./dashboard-mobile.css?v=20261023-quality02&overview=09'),'Exact overview URL cached');assert.equal(read('dashboard-mobile.css').replace('Approved mobile-first overview.','Preview only: mobile-first overview.'),read('preview/dashboard-mobile.css'),'Released design matches reviewed preview');


const released=read('index.html');
assert.match(released,/ปรับช่องไฟระหว่างยอดเงิน เปอร์เซ็นต์ และลูกศรในหน้าสรุป/,'Settings describes current release');
const refresh=read('interface-refresh.css');
assert.match(refresh,/Narrow-screen financial amount resilience/,'Narrow-screen category amount regression guard');
assert.match(refresh,/summary-category-numbers strong\{white-space:normal;overflow-wrap:anywhere;text-align:right\}/,'Large figures can wrap on narrow screens');
assert.equal((refresh.match(/\{/g)||[]).length,(refresh.match(/\}/g)||[]).length,'Interface refresh braces balanced');

const assetQa=read('sw.js');
for(const resource of ['app.js?v=20261023-quality02&payments=14&splash=02&summary=02&period=17&stability=22&billfix=24','app-planning.js?v=20261023-quality02&payments=14&billfix=24','app-dashboard.js?v=20261023-quality02&budget=21&billfix=24','finance-core.js?v=20261023-quality02&payment=10&billfix=24','interface-refresh.css?v=20261023-quality02&ui=23&billfix=24'])assert.ok(assetQa.includes('./'+resource),'Updated finance resource must be precached: '+resource);
assert.match(read('app.js'),/finance-core\.js\?v=20261023-quality02&payment=10&billfix=24/,'Main app imports updated core');
assert.match(read('app-planning.js'),/finance-core\.js\?v=20261023-quality02&payment=10&billfix=24/,'Planning reuses updated core');
assert.match(read('index.html'),/stability=22&billfix=24/,'Entry point requests new module URL');
