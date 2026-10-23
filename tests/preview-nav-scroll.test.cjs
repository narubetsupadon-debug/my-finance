const fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path');const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const css=read('nav-unified.css'),script=read('preview/nav-scroll.js');
assert.match(css,/\.mobile-app-nav\.is-scroll-hidden/);
assert.match(css,/translateY\(calc\(100% \+ 24px \+ env\(safe-area-inset-bottom/);
assert.match(css,/opacity:0!important/);
assert.match(css,/pointer-events:none!important/);
assert.match(css,/\.mobile-app-nav:not\(\.is-scroll-hidden\)/);
assert.doesNotMatch(css,/transition:none!important;\s*z-index/,'Do not suppress sliding');
assert.match(script,/scroller\.addEventListener\('scroll'/);
assert.match(script,/distance>=24/);
assert.match(script,/distance<=-12/);
for(const f of ['index','test','rent','car','salary']){
 const html=read('preview/'+f+'.html');
 assert.match(html,/\.\/nav-scroll\.js\?v=20261023-scroll01/,'Scroll sync module missing '+f);
 assert.match(html,/PREVIEW_READ_ONLY/,'Preview guard missing '+f);
}
for(const f of ['index','rent','car','salary'])assert.doesNotMatch(read(f+'.html'),/nav-scroll\.js/,'Production must stay unchanged');
console.log('PASS preview adaptive nav: hide on scroll down, reveal on scroll up; five screens guarded');
assert.match(css,/body:has\(\.finance-detail-page\) \.mobile-app-nav\.is-scroll-hidden/,'Car and salary must hide menu on downward scroll');
assert.match(css,/body:has\(\.finance-detail-page\) \.mobile-app-nav:not\(\.is-scroll-hidden\)/,'Car and salary must reveal on upward scroll');
assert.match(script,/if\(rent\)rent\.addEventListener/,'Inner scroll only needs rent listener');
assert.doesNotMatch(script,/window\.addEventListener\('scroll'/,'Do not add duplicate window scroll listeners');
