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
assert.match(read('preview/compare.html'),/เปรียบเทียบกับเว็บไซต์จริง/,'Preserve previous comparison hub');
console.log('PASS preview mirrors: latest UI, read-only guard and internal test navigation');
