const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
for(const [source,mirror] of [['index.html','preview/index.html'],['index.html','preview/test.html'],['rent.html','preview/rent.html'],['car.html','preview/car.html'],['salary.html','preview/salary.html']]){
 const prod=read(source),test=read(mirror);
 assert.match(test,/PREVIEW_READ_ONLY/,'Preview must block financial writes: '+mirror);
 assert.match(test,/<base href="\.\/">/,'Navigation must remain inside Preview: '+mirror);
 assert.match(test,/noindex,nofollow/,'Preview must not be indexed: '+mirror);
 assert.doesNotMatch(test,/rel="manifest"/,'Preview must not install a production PWA: '+mirror);
 assert.match(test,/src="\.\.\/app-nav\.js\?v=/,'Use matching root navigation JS: '+mirror);
 assert.match(test,/href="\.\.\/mobile-compact\.css\?v=/,'Use latest responsive UI: '+mirror);
 for(const token of ['id="saveRent"','id="saveCar"','id="saveSalary"'].filter(x=>prod.includes(x)))assert.ok(test.includes(token),'Keep existing controls: '+token);
 if(source==='index.html')assert.ok(test.includes('id="dashboardPage"')&&test.includes('id="settingsPage"'),'Test must contain real UI screens');
}
// Main preview must run the same payment-release entrypoint and responsive asset versions.
const prodHome=read('index.html'),previewHome=read('preview/test.html');
const mainEntrypoint=prodHome.match(/<script type="module" src="\.\/app\.js\?([^"]+)"><\/script>/)?.[1];
assert.ok(mainEntrypoint,'Production app module must exist');
assert.ok(previewHome.includes('src="../app.js?'+mainEntrypoint+'"'),'Preview must load the exact production main module URL');
for(const name of ['nav-unified.css','mobile-polish.css','payment-picker.css','wallet-clarity.css']){
 const escName=name.replace(/\./g,'\\.');
 const m=prodHome.match(new RegExp('href="\\./'+escName+'\\?([^"]+)"'));
 assert.ok(m,'Production asset missing: '+name);
 assert.ok(previewHome.includes('href="../'+name+'?'+m[1]+'"'),'Preview version drift: '+name);
}
assert.ok(!previewHome.includes('rel="manifest"'),'Test must not install production PWA');

// Soft Minimal must remain an isolated preview theme; never change production pages.
for(const p of ['test.html','index.html','rent.html','car.html','salary.html']){
 const html=read('preview/'+p);
 assert.match(html,/<html lang="th" class="soft-minimal-preview">/,'Preview theme scoped: '+p);
 assert.ok(html.includes('href="./soft-minimal.css?v=20261103-refinev4"'),'Soft Minimal V4 CSS must load in Preview: '+p);
 assert.doesNotMatch(html,/id="darkThemeStylesheet"/,'No dark palette on Soft Minimal Preview: '+p);
}
for(const page of ['test.html','index.html']){
 const html=read('preview/'+page);
 assert.match(html,/preview-monthly-overview" open>/,'Preview home should surface existing monthly metrics: '+page);
 assert.ok(html.includes('soft-minimal.css?v=20261103-refinev4'),'Preview home must use latest visual layout: '+page);
}
assert.ok(read('preview/soft-minimal.css').includes('grid-template-columns:repeat(5,minmax(0,1fr))'),'Five visible quick expense actions');
assert.match(read('preview/soft-minimal.css'),/summary-donut-wrap/,'Summary donut layout must be designed');

assert.doesNotMatch(read('index.html'),/soft-minimal\.css|soft-minimal-preview/,'Production must retain its existing theme');
assert.match(read('preview/soft-minimal.css'),/\.soft-minimal-preview/,'Preview CSS is scoped');

// Reference V5: real data bindings, original Preview write guard, and mobile navigation.
for(const p of ['test.html','index.html']){
 const html=read('preview/'+p);
 for(const id of ['balanceTotal','incomeTotal','expenseTotal','budgetCard','budgetPctDash','budgetSpentDash','budgetLimitDash','budgetProgressDash','quickAdd','recentList','categoryPieChart','debtList','txForm']){
  assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1,'Reference page must preserve one real '+id+': '+p);
 }
 assert.match(html,/class="reference-balance-hero"/,'Large reference blue balance hero: '+p);
 assert.match(html,/reference-income-expense/,'Real month income and expense cards: '+p);
 assert.match(html,/reference-budget/,'Budget progress layout: '+p);
 assert.match(html,/data-ref-debt-tab="cards"/,'Credit card switch: '+p);
 assert.match(html,/data-ref-debt-tab="loans"/,'Loan switch: '+p);
 assert.ok(html.includes('reference-layout.css?v=20261103-refv6'),'Reference CSS loaded: '+p);
 assert.ok(html.includes('reference-layout.js?v=20261103-refv6'),'Reference navigation loaded: '+p);
}
for(const p of ['rent.html','car.html','salary.html']){const html=read('preview/'+p);assert.ok(html.includes('reference-layout.js?v=20261103-refv6'),'Consistent five-tab preview navigation: '+p);assert.ok(html.includes('reference-layout.css?v=20261103-refv6'),'Consistent five-tab styling: '+p);}
for(const p of ['test.html','index.html']){
 const html=read('preview/'+p);
 assert.ok(html.includes('id="referenceMonthLabel"'),'Monthly selector title is visible: '+p);
 assert.ok(html.includes('data-reference-month="-1"')&&html.includes('data-reference-month="1"'),'Previous and next month controls: '+p);
 assert.ok(html.includes('class="reference-chart-row"'),'Donut and category legend align side-by-side: '+p);
}
assert.ok(read('preview/reference-layout.js').includes("if(btn.textContent!==label)"),'Debts renderer avoids a feedback loop');
assert.ok(read('preview/reference-layout.js').includes("month.dispatchEvent(new Event('change'"),'Summary selection uses the existing report renderer');
assert.ok(read('preview/reference-layout.css').includes('reference-tabbar'),'Reference nav styling is present');
assert.ok(read('preview/reference-layout.js').includes('finance:navigate'),'Reference tabs use existing app navigation');
assert.ok(read('preview/reference-layout.js').includes('reference-pay-action'),'Debt cards keep payment entry accessible');
assert.doesNotMatch(read('index.html'),/reference-balance-hero|reference-layout\\.css/,'Production layout remains untouched');

assert.match(read('preview/compare.html'),/เปรียบเทียบกับเว็บไซต์จริง/,'Preserve previous comparison hub');
console.log('PASS preview mirrors: latest UI, read-only guard and internal test navigation');
