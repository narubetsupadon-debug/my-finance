const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const css=read('mobile-compact.css'),rentCss=read('rent.css'),nav=read('app-nav.js'),sw=read('sw.js');
const link='mobile-compact.css?v=20261023-quality02';
for(const name of ['index.html','rent.html','car.html','salary.html']){
 const html=read(name);
 assert.equal(html.split(link).length-1,1,name+' must load compact CSS once');
 assert.match(html,/viewport-fit=cover/,name+' must respect iPhone safe area');
}
assert.match(sw,/SHELL\.push\('\.\/mobile-compact\.css\?v=20261023-quality02'\)/,'Service worker must precache exact CSS URL');
assert.match(sw,/my-finance-settings-mobile-fix03-v1\.0\.2/,'Cache must change with mobile release');
assert.match(css,/\.rent-wrap #rentForm>\.fields/,'Rent layout must be compact');
assert.match(css,/\.salary-wrap #saveSalary\{min-height:48px\}/,'Salary save must stay tappable');
assert.match(css,/\.car-wrap #addCarExpense\{min-height:46px\}/,'Car expense action must stay tappable');
assert.match(css,/\.mobile-app-nav \.app-nav-tab\{min-width:0;min-height:54px\}/,'Main navigation tap targets retained');
assert.match(rentCss,/\.mobile-app-nav\.is-scroll-hidden\{[\s\S]*?display:grid!important/,'Rent navigation stays visible');
assert.doesNotMatch(css,/\.mobile-app-nav\s*\{[^}]*display\s*:\s*none/,'Do not hide app navigation');
assert.match(nav,/primary\.forEach\(x=>/,'Primary nav destinations must stay active');
assert.match(css,/body:has\(\.finance-detail-page\) \.mobile-app-nav\.is-scroll-hidden/,'Detail screens must keep navigation visible on scroll');
assert.equal((css.match(/\{/g)||[]).length,(css.match(/\}/g)||[]).length,'CSS braces must balance');
console.log('PASS mobile compact: 4 page stylesheets, cache, rent navigation, car and salary save targets');
