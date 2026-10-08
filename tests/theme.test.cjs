const {JSDOM}=require('jsdom'),fs=require('node:fs'),assert=require('node:assert/strict');
const source=fs.readFileSync(require('node:path').join(__dirname,'../theme.js'),'utf8');
for(const [mode,systemDark] of [['light',true],['dark',false],['system',true],['system',false]]){
 const dom=new JSDOM('<link id="darkThemeStylesheet"><button data-theme-option="light"></button><button data-theme-option="dark"></button>',{url:'https://fixture.invalid',runScripts:'outside-only'}),w=dom.window;
 let changed;const mq={matches:systemDark,addEventListener:(name,fn)=>changed=fn};w.matchMedia=()=>mq;
 w.localStorage.setItem('my-finance-theme',mode);w.localStorage.setItem('my-finance-ui-settings-v1','null');w.eval(source);
 const resolved=mode==='system'?(systemDark?'dark':'light'):mode;
 assert.equal(w.document.documentElement.dataset.resolvedTheme,resolved,'theme must apply before DOMContentLoaded');
 assert.equal(w.document.documentElement.style.colorScheme,resolved);
 assert.equal(w.document.querySelector('meta[name="theme-color"]').content,resolved==='dark'?'#0d1017':'#f6f7fb');
 w.document.dispatchEvent(new w.Event('DOMContentLoaded'));w.financeTheme.set('light');assert.equal(w.document.getElementById('darkThemeStylesheet').media,'not all');
 mq.matches=true;changed();assert.equal(w.document.documentElement.dataset.resolvedTheme,'light','explicit theme must ignore system changes');
 w.financeTheme.set('system');assert.equal(w.document.documentElement.dataset.resolvedTheme,'dark');mq.matches=false;changed();assert.equal(w.document.documentElement.dataset.resolvedTheme,'light');
 w.localStorage.setItem('my-finance-ui-settings-v1','{broken');w.financeTheme.applyUiPreferences();dom.window.close();
}
console.log('PASS theme: initial saved theme, light/dark/system switching, browser color and corrupt preferences');
