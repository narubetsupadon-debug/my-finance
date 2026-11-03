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
 assert.match(html,/href="\.\/soft-minimal\.css\?v=20261103-softv2"/,'Soft Minimal CSS must load in Preview: '+p);
 assert.doesNotMatch(html,/id="darkThemeStylesheet"/,'No dark palette on Soft Minimal Preview: '+p);
}
assert.doesNotMatch(read('index.html'),/soft-minimal\.css|soft-minimal-preview/,'Production must retain its existing theme');
assert.match(read('preview/soft-minimal.css'),/\.soft-minimal-preview/,'Preview CSS is scoped');

assert.match(read('preview/compare.html'),/เปรียบเทียบกับเว็บไซต์จริง/,'Preserve previous comparison hub');
console.log('PASS preview mirrors: latest UI, read-only guard and internal test navigation');
