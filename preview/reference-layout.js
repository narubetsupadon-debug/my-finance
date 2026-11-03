/* Reference V5 enhancements are contained inside the read-only Preview.
   Never writes finance data. All navigation and card values use the current app. */
(function(){
  const root=document.documentElement;
  function ready(){
    if(!root.classList.contains('soft-minimal-preview'))return;
    const hasApp=!!document.getElementById('dashboardPage');
    const nav=document.createElement('nav');
    nav.className='reference-tabbar';
    nav.setAttribute('aria-label','เมนูหลักแบบ Soft Minimal Preview');
    const tabs=[
      ['dashboard','⌂','หน้าแรก'],['summary','▥','สรุป'],
      ['capture','+','บันทึก'],['debts','▤','บัตร'],['settings','⚙','ตั้งค่า']
    ];
    const buttons=new Map();
    function setActive(page){
      for(const [target,b] of buttons)b.setAttribute('aria-current',page===target?'page':'false');
    }
    function navigate(target){
      if(target==='capture'){
        if(hasApp&&typeof window.openTx==='function')window.openTx();
        else location.href='./index.html#capture-expense';
        return;
      }
      if(hasApp)window.dispatchEvent(new CustomEvent('finance:navigate',{detail:target}));
      else location.href='./index.html#'+target;
      setActive(target);
    }
    for(const [target,symbol,label] of tabs){
      const b=document.createElement('button');
      b.type='button';b.dataset.target=target;
      const ico=document.createElement('span');ico.className='ref-tab-icon';ico.textContent=symbol;ico.setAttribute('aria-hidden','true');
      const txt=document.createElement('span');txt.textContent=label;
      b.append(ico,txt);b.addEventListener('click',()=>navigate(target));
      nav.append(b);buttons.set(target,b);
    }
    (document.getElementById('app')||document.body).append(nav);
    root.classList.add('reference-nav-ready');
    window.addEventListener('finance:page',e=>setActive(e.detail));
    const selected=hasApp?(location.hash.slice(1).split('-')[0]||'dashboard'):
      location.pathname.includes('rent')||location.pathname.includes('salary')||location.pathname.includes('car')?'settings':'dashboard';
    setActive(selected);
    if(!hasApp)return;
    const list=document.getElementById('debtList');
    const bar=document.querySelector('.reference-debt-tabs');
    if(!list||!bar)return;
    let mode='cards';
    const switches=[...bar.querySelectorAll('[data-ref-debt-tab]')];
    function refresh(){
      const sections=[...list.children].filter(x=>x.classList.contains('wallet-section'));
      sections.slice(0,2).forEach((section,i)=>{
        const visible=(mode==='cards'?i===0:i===1);
        if(section.hidden===visible)section.hidden=!visible;
        const grid=section.nextElementSibling;
        if(grid&&grid.classList.contains('wallet-grid')&&grid.hidden===visible)grid.hidden=!visible;
        const btn=switches[i];
        if(btn){
          const count=section.querySelector('span')?.textContent?.trim()||'0 รายการ';
          const label=(i===0?'บัตรเครดิต':'หนี้/สินเชื่อ')+' · '+count;
          if(btn.textContent!==label)btn.textContent=label;
          if(btn.getAttribute('aria-selected')!==String(visible))btn.setAttribute('aria-selected',String(visible));
        }
      });
      list.querySelectorAll('.wallet-card').forEach(card=>{
        if(card.querySelector('.reference-pay-action'))return;
        const edit=card.querySelector('[data-edit="debt"][data-id]'),footer=card.querySelector('.wallet-footer');
        if(!edit||!footer)return;
        const btn=document.createElement('button');
        btn.type='button';btn.className='reference-pay-action';btn.textContent='บันทึกชำระ';
        btn.dataset.payDebt=edit.dataset.id;
        btn.title='เปิดฟอร์มบันทึกชำระในโหมด Preview (ไม่สามารถบันทึกเงินจริง)';
        footer.append(btn);
      });
    }
    switches.forEach(btn=>btn.addEventListener('click',()=>{
      mode=btn.dataset.refDebtTab;
      refresh();
    }));
    list.addEventListener('click',e=>{
      const btn=e.target.closest('.reference-pay-action');
      if(!btn)return;
      if(typeof window.openTx==='function')window.openTx();
      // Preview opens the existing form; it does not assume the source card was pre-selected.
    },true);
    let scheduled=false;
    const observer=new MutationObserver(mutations=>{
      // The renderer replaces cards; our own inserted payment button must not trigger a mutation loop.
      if(!mutations.some(m=>[...m.addedNodes].some(node=>node.nodeType===1&&node.classList?.contains('wallet-section'))))return;
      if(scheduled)return;scheduled=true;
      queueMicrotask(()=>{scheduled=false;refresh()});
    });
    observer.observe(list,{childList:true});
    refresh();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});
  else ready();
})();
