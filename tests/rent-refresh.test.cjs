const fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path');
const read=x=>fs.readFileSync(path.join(__dirname,'..',x),'utf8');
const html=read('preview/rent.html'),prod=read('rent.html'),css=read('preview/rent-refresh.css');
for(const id of ['rentForm','rentMonth','rentDate','rentFull','rentMy','rentHalf','rentStatus','rentAccount','rentCategory','rentExisting','rentNote','rentPreview','saveRent','rentHistory','newRent','rentTitle','rentError']){
 assert.equal([...html.matchAll(new RegExp('id="'+id+'"','g'))].length,1,id+' must exist exactly once');
}
assert.match(html,/PREVIEW_READ_ONLY/,'Test remains read only');
assert.match(html,/\.\/rent-refresh\.css\?v=20261023-rentui01/,'Rent UI stylesheet must load');
assert.ok(html.indexOf('rent-refresh.css')>html.indexOf('nav-unified.css'),'Rent UI styling loaded after nav (without modifying nav rules)');
assert.match(html,/<details class="rent-advanced">/,'Optional link and notes must be accessible');
assert.ok(!prod.includes('rent-refresh.css'),'Production stays unchanged');
assert.match(css,/\.rent-money-fields\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/,'Money amounts side by side');
assert.doesNotMatch(css,/mobile-app-nav/,'Rent layout must not override unified navigation behavior');
assert.equal((css.match(/\{/g)||[]).length,(css.match(/\}/g)||[]).length,'Balanced CSS');
console.log('PASS TEST rent redesign: fields intact, read-only, nav not overridden');
