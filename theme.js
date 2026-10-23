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
/* Settings navigation: move actual nodes, preserving listeners and input state. */
(function(){
  function arrangeSettings(){
    const page=document.getElementById('settingsPage');
    const grid=page?.querySelector(':scope > .settings-grid');
    const about=page?.querySelector(':scope > section[aria-labelledby="appVersionTitle"]');
    const guide=page?.querySelector(':scope > #appUsageGuide');
    if(!page||!grid||!about||!guide||page.dataset.settingsArranged==='yes')return;
    page.append(about,guide);
    page.dataset.settingsArranged='yes';
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',arrangeSettings,{once:true});
  else arrangeSettings();
})();

/* Progressive settings sections: headings act as accessible collapse controls. */
(function(){
 function initSettingsSections(){
  const grid=document.querySelector('#settingsPage>.settings-grid');
  if(!grid||grid.dataset.collapsible==='true')return;
  grid.dataset.collapsible='true';
  let section=null;
  for(const node of [...grid.children]){
   if(node.classList.contains('settings-group-heading')){
    section=node;
    const id=(node.id||node.textContent.trim()).replace(/[^a-zA-Z0-9\u0E00-\u0E7F]/g,'-');
    const storageKey='finance-settings-open-'+id;
    const stored=(()=>{try{return localStorage.getItem(storageKey)}catch{return null}})();
    const expanded=stored===null?true:stored==='true';
    node.dataset.expanded=String(expanded);
    node.setAttribute('role','button');
    node.setAttribute('tabindex','0');
    node.setAttribute('aria-expanded',String(expanded));
    node.setAttribute('title','แตะเพื่อยุบหรือขยายหมวด');
    const toggle=()=>{
      const next=node.dataset.expanded!=='true';
      node.dataset.expanded=String(next);
      node.setAttribute('aria-expanded',String(next));
      let item=node.nextElementSibling;
      while(item&&!item.classList.contains('settings-group-heading')){
       item.hidden=!next;
       item=item.nextElementSibling;
      }
      try{localStorage.setItem(storageKey,String(next))}catch{}
    };
    node.addEventListener('click',toggle);
    node.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();toggle()}});
   } else if(section?.dataset.expanded==='false'){node.hidden=true;}
  }
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initSettingsSections,{once:true});else initSettingsSections();
})();
