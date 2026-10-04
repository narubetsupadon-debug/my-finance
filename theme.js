(function(){
  const UI_KEY='my-finance-ui-settings-v1';
  function applyUiPreferences(){
    let s={};try{s=JSON.parse(localStorage.getItem(UI_KEY)||'{}')}catch{}
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
    const saved=localStorage.getItem(KEY);
    return allowed.has(saved)?saved:'system';
  }
  function apply(mode){
    if(!allowed.has(mode))mode='system';
    localStorage.setItem(KEY,mode);
    const link=document.getElementById('darkThemeStylesheet');
    if(link){
      link.media=mode==='dark'?'all':mode==='light'?'not all':'(prefers-color-scheme: dark)';
    }
    document.documentElement.dataset.themeMode=mode;
    document.documentElement.dataset.resolvedTheme=mode==='system'?(mq.matches?'dark':'light'):mode;
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
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
})();