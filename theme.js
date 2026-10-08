(function(){
  const UI_KEY='my-finance-ui-settings-v1';
  function applyUiPreferences(){
    let s={};try{const saved=JSON.parse(localStorage.getItem(UI_KEY)||'{}');if(saved&&typeof saved==='object'&&!Array.isArray(saved))s=saved;}catch{}
    const palettes={purple:['#7c3aed','#a78bfa'],blue:['#2563eb','#60a5fa'],green:['#059669','#34d399'],pink:['#db2777','#f472b6']};
    const accent=palettes[s.accent]||palettes.purple;
    document.documentElement.dataset.accent=s.accent||'purple';
    document.documentElement.style.setProperty('--primary',accent[0]);
    document.documentElement.style.setProperty('--primary2',accent[1]);
    if(document.body)document.body.classList.toggle('privacy-mode',!!s.privacy);
  }
  const KEY='my-finance-theme';
  const allowed=new Set(['system','light','dark']);
  const mq=window.matchMedia('(prefers-color-scheme: dark)');
  function getMode(){
    let saved=null;try{saved=localStorage.getItem(KEY)}catch{}
    return allowed.has(saved)?saved:'system';
  }
  function apply(mode){
    if(!allowed.has(mode))mode='system';
    try{localStorage.setItem(KEY,mode)}catch{}
    const link=document.getElementById('darkThemeStylesheet');
    if(link){
      link.media=mode==='dark'?'all':mode==='light'?'not all':'(prefers-color-scheme: dark)';
    }
    document.documentElement.dataset.themeMode=mode;
    document.documentElement.dataset.resolvedTheme=mode==='system'?(mq.matches?'dark':'light'):mode;
    const resolved=document.documentElement.dataset.resolvedTheme;
    document.documentElement.style.colorScheme=resolved;
    let meta=document.querySelector('meta[name="theme-color"]');
    if(!meta){meta=document.createElement('meta');meta.name='theme-color';document.head.append(meta);}
    meta.content=resolved==='dark'?'#0d1017':'#f6f7fb';
    document.querySelectorAll('[data-theme-option]').forEach(btn=>{
      const active=btn.dataset.themeOption===mode;
      btn.classList.toggle('active',active);
      btn.setAttribute('aria-pressed',String(active));
    });
    const label=document.getElementById('themeCurrentLabel');
    if(label){
      label.textContent=mode==='system'?'ตามเครื่อง':mode==='dark'?'มืด':'สว่าง';
    }
    window.dispatchEvent(new CustomEvent('finance:theme',{detail:{mode,resolved:document.documentElement.dataset.resolvedTheme}}));
  }
  function bind(){
    apply(getMode());
    applyUiPreferences();
    document.querySelectorAll('[data-theme-option]').forEach(btn=>{
      btn.addEventListener('click',()=>apply(btn.dataset.themeOption));
    });
  }
  mq.addEventListener?.('change',()=>{if(getMode()==='system')apply('system')});
  window.financeTheme={get:getMode,set:apply,applyUiPreferences};
  apply(getMode());
  applyUiPreferences();
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
})();