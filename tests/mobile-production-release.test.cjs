const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),read=name=>fs.readFileSync(path.join(root,name),'utf8');
for(const page of ['index.html','rent.html','car.html','salary.html']){
 const html=read(page);
 assert.match(html,/nav-unified\.css\?v=20261023-releaseux01/,page+' unified bottom tabs');
 assert.match(html,/mobile-polish\.css\?v=20261023-releaseux01/,page+' polish');
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
assert.match(rent,/nav-scroll\.js\?v=20261023-releaseux01/,'Rent inner scroll listener');
const nav=read('nav-unified.css');
assert.match(nav,/body:has\(\.finance-detail-page\) \.mobile-app-nav\.is-scroll-hidden\s*\{/,'Car and salary hide selector');
assert.match(nav,/translateY\(calc\(100%/,'Scroll down hides tabs');
assert.match(nav,/\.mobile-app-nav:not\(\.is-scroll-hidden\)/,'Scroll up reveals tabs');
const sw=read('sw.js');
assert.match(sw,/my-finance-mobile-ux-release01/);
for(const p of ['nav-unified.css','mobile-polish.css','rent-refresh.css','nav-scroll.js'])assert.ok(sw.includes('./'+p+'?v=20261023-releaseux01'),p+' offline cached');
console.log('PASS production mobile UX release: 4 pages, rent fields, scrolling, offline cache, no test guard');
