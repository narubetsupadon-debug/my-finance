const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const files=['index.html','app.js','app-data.js','style.css','car.css','minimal-dark.css','theme.js','app-nav.js','sw.js','car.html','car.js','salary.html','salary.js','import.html','finance-core.js','manifest.webmanifest'];
const source=Object.fromEntries(files.map(p=>[p,read(p)]));

// All cache-busted first-party assets must move as one release.
const refs=[];
for(const [file,text] of Object.entries(source)){
 for(const m of text.matchAll(/(?:\.js|\.css)\?v=([A-Za-z0-9_-]+)/g))refs.push({file,version:m[1],ref:m[0]});
}
const versions=[...new Set(refs.map(x=>x.version))];
assert.equal(versions.length,1,'first-party asset versions diverged: '+JSON.stringify(refs));

// Main HTML must not contain duplicate ids, and app.js DOM shortcuts must point to real elements.
const html=source['index.html'];
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
assert.equal(new Set(ids).size,ids.length,'duplicate id in index.html');
const refsByDollar=[...source['app.js'].matchAll(/\$\('([^']+)'\)/g)].map(m=>m[1]);
const missing=[...new Set(refsByDollar.filter(id=>!ids.includes(id)))];
assert.deepEqual(missing,[],'app.js references missing DOM ids');

// Regression guards for the iPhone keyboard bug.
assert.equal(source['style.css'].includes('--capture-height'),false,'obsolete --capture-height returned');
for(const m of source['app.js'].matchAll(/\$\('txAmount'\)\.focus\(\)/g)){
 const before=source['app.js'].slice(Math.max(0,m.index-100),m.index);
 assert.match(before,/window\.innerWidth\s*>\s*820/,'mobile-unsafe txAmount autofocus returned');
}

// Navigation and PWA invariants.
assert.match(source['app.js'],/updateViaCache:'none'/,'service worker registration must bypass HTTP cache');
assert.match(source['sw.js'],/skipWaiting/);
assert.match(source['sw.js'],/clients\.claim/);
assert.match(source['sw.js'],/addEventListener\('push'/);
assert.match(source['sw.js'],/addEventListener\('notificationclick'/);
assert.match(source['app-nav.js'],/e\.clientY>r\.bottom/,'mobile menu backdrop must close below sheet too');
JSON.parse(source['manifest.webmanifest']);

// iPhone safe-area support on interactive pages.
for(const p of ['index.html','car.html','salary.html'])assert.match(source[p],/viewport-fit=cover/,p+' missing viewport-fit=cover');

// Car styles live in one page-specific stylesheet and keep mobile content above the bottom nav.
assert.equal(source['car.html'].includes('<style>'),false,'car.html must not contain inline styles');
assert.match(source['car.html'],/car\.css\?v=/,'car.html must load car.css');
assert.match(source['car.css'],/padding:16px 10px calc\(190px \+ env\(safe-area-inset-bottom,0px\)\)/,'car mobile padding must clear bottom navigation');
assert.match(source['car.js'],/td\.dataset\.label=/,'Mobile car rows need data-labels');
assert.match(source['car.html'],/id="carExpenseList"/,'car expense list missing');
assert.match(source['car.js'],/from\('car_expenses'\)/,'car expense data source missing');
assert.match(source['app.js'],/carExpenseTxIds/,'linked car transactions must be protected in the main editor');
assert.match(source['app.js'],/pendingRealtime/,'realtime refresh must defer while editors are open');
assert.match(source['car.css'],/\/\* Mobile car installment cards \*\//,'mobile car card layout missing');
assert.match(source['app.js'],/fetchFinanceData/,'main app must use shared data loader');
assert.match(source['app.js'],/createRefreshCoordinator/,'main app must use shared refresh coordinator');

console.log('PASS static audit: asset versions, DOM ids, keyboard regression, navigation, PWA, manifest, safe areas');
