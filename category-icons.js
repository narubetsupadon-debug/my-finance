// Original, locally rendered SVGs. Only allowlisted paths enter the markup.
export const iconChoices=[
 ['food','อาหาร','#b86527','#fff0dc','<path d="M5 4v6m3-6v6M4 7h5v3a2.5 2.5 0 0 1-5 0V4m2.5 8.5V21M17 4c-3 3-4 7-1 9h2V4h-1Zm1 9v8"/>'],
 ['coffee','เครื่องดื่ม','#956047','#f6e9df','<path d="M4 9h12v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V9Z" fill="currentColor" fill-opacity=".18"/><path d="M16 10h2a3 3 0 0 1 0 6h-2M7 3v2m5-2v2M3 21h15"/>'],
 ['home','ที่พัก','#7664bb','#eeebfc','<path d="m3 11 9-8 9 8M5 10v11h14V10" fill="currentColor" fill-opacity=".15"/><path d="M9 21v-7h6v7"/>'],
 ['car','รถยนต์','#477fc0','#e7f0ff','<path d="m5 9 2-5h10l2 5M4 9h16v9H4V9Z" fill="currentColor" fill-opacity=".18"/><path d="M6 18v3m12-3v3M7 13h2m6 0h2"/>'],
 ['travel','เดินทาง','#438e87','#e4f4ef','<rect x="6" y="3" width="12" height="15" rx="3" fill="currentColor" fill-opacity=".17"/><path d="M6 10h12m-9 4h.01M15 14h.01M9 18l-3 3m9-3 3 3"/>'],
 ['bill','บิลประจำ','#ba882b','#fff5d9','<path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" fill="currentColor" fill-opacity=".15"/><path d="M9 7h6M9 11h6m-6 4h3"/>'],
 ['card','บัตร / สินเชื่อ','#6b6bc3','#ededff','<rect x="3" y="5" width="18" height="14" rx="3" fill="currentColor" fill-opacity=".18"/><path d="M3 10h18M7 15h4"/>'],
 ['shopping','ช้อปปิ้ง','#bd668e','#fbe9f2','<path d="M5 8h14l1 13H4L5 8Z" fill="currentColor" fill-opacity=".17"/><path d="M9 9V6a3 3 0 0 1 6 0v3"/>'],
 ['health','สุขภาพ','#cd7374','#fceced','<rect x="4" y="6" width="16" height="15" rx="3" fill="currentColor" fill-opacity=".16"/><path d="M9 6V3h6v3m-3 4v7m-3-3.5h6"/>'],
 ['fun','บันเทิง','#9a68b8','#f3eafa','<rect x="3" y="6" width="18" height="15" rx="2" fill="currentColor" fill-opacity=".17"/><path d="M3 10h18M6 3l3 3m3-3 3 3m3-3 3 3m-11 7 5 3-5 3v-6Z"/>'],
 ['saving','เงินออม','#b67591','#f8e9f0','<path d="M4 10c1-3 5-5 9-4l4-2v4l3 3h1v5h-3l-2 3v2h-3v-2H9v2H6v-3l-3-3V11H2" fill="currentColor" fill-opacity=".16"/><path d="M10 9h3m3 3h.01"/>'],
 ['income','รายรับ','#448c68','#e6f5eb','<rect x="3" y="6" width="18" height="14" rx="3" fill="currentColor" fill-opacity=".17"/><path d="M3 10h18m-5 5h2M8 3h8"/>'],
 ['other','อื่น ๆ','#718197','#edf1f6','<rect x="4" y="4" width="6" height="6" rx="2" fill="currentColor" fill-opacity=".2"/><rect x="14" y="4" width="6" height="6" rx="2" fill="currentColor" fill-opacity=".2"/><rect x="4" y="14" width="6" height="6" rx="2" fill="currentColor" fill-opacity=".2"/><rect x="14" y="14" width="6" height="6" rx="2" fill="currentColor" fill-opacity=".2"/>']
];
export function categoryIcon(category={}){
 const token=String(category.icon||'').replace(/^icon:/,'');
 if(iconChoices.some(i=>i[0]===token))return token;
 const name=category.name||'';
 const groups=[['coffee',/กาแฟ|เครื่องดื่ม/],['food',/อาหาร/],['home',/ที่พัก|ค่าห้อง|บ้าน/],['car',/รถยนต์|ผ่อนรถ/],['travel',/เดินทาง/],['bill',/บิล|สาธารณูปโภค/],['card',/หนี้|บัตร|สินเชื่อ|ผ่อน/],['shopping',/ช้อป|ซื้อของ/],['health',/สุขภาพ|ยา|รักษา/],['fun',/บันเทิง/],['saving',/ออม/],['income',/เงินเดือน|รายรับ/]];
 return groups.find(([,re])=>re.test(name))?.[0]||({'🍜':'food','☕':'coffee','🏠':'home','🚗':'car','🚆':'travel','💡':'bill','💳':'card','🛍️':'shopping','❤️':'health','🎮':'fun','🏦':'saving','💰':'income'}[category.icon])||(category.type==='income'?'income':'other');
}
export function iconMarkup(key){
 const item=iconChoices.find(i=>i[0]===key)||iconChoices.at(-1);
 return '<span class="category-symbol" style="--icon-ink:'+item[2]+';--icon-paper:'+item[3]+'" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" focusable="false">'+item[4]+'</svg></span>';
}
