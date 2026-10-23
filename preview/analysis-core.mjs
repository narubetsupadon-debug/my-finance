export const money=value=>'฿'+Number(value||0).toLocaleString('th-TH',{minimumFractionDigits:2,maximumFractionDigits:2});
export function category(row){
 if(row.source==='rent')return 'ค่าห้องเช่า';
 const name=row.categories?.name||'อื่น ๆ',text=((row.description||'')+' '+(row.note||'')).toLowerCase();
 if(['ที่พัก','ห้องเช่า','บ้าน','ค่าห้องเช่า','ค่าห้อง','ค่าเช่า'].includes(name))return 'ค่าห้องเช่า';
 if(name==='หนี้/ผ่อน')return 'ชำระบัตร/สินเชื่อ';
 if(name==='บิล/สาธารณูปโภค')return 'รายจ่ายประจำ';
 if(name==='รถยนต์'){
  if(/ค่างวด|ผ่อนรถ|รถ – มิว|รถ - มิว/.test(text))return 'ค่างวดรถ';
  if(/น้ำมัน/.test(text))return 'น้ำมันรถ';
  if(/ซ่อม|ประกัน|ภาษี|พ\.ร\.บ|เช็กระยะ|เช็คระยะ|บำรุง/.test(text))return 'ซ่อม/ประกัน/ภาษีรถ';
  if(/ทางด่วน|ที่จอด|ล้างรถ/.test(text))return 'ค่าใช้รถอื่น ๆ';
  return 'รถยนต์อื่น ๆ';
 }
 return name;
}
const cents=row=>Math.round(Number(row.amount||0)*100);
const sum=rows=>rows.reduce((total,row)=>total+cents(row),0);
export function analyze(rows,month,today){
 if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))throw Error('เดือนที่เลือกไม่ถูกต้อง');
 const [year,m]=month.split('-').map(Number),days=new Date(Date.UTC(year,m,0)).getUTCDate();
 const prevDate=new Date(Date.UTC(year,m-2,1)),previous=prevDate.toISOString().slice(0,7),prevDays=new Date(Date.UTC(year,m-1,0)).getUTCDate();
 const current=month===today.slice(0,7),cutoff=current?Number(today.slice(8,10)):days,previousCutoff=current?Math.min(cutoff,prevDays):prevDays;
 const valid=rows.filter(row=>row.type==='expense'&&(row.status||'paid')==='paid'&&/^\d{4}-\d{2}-\d{2}$/.test(String(row.transaction_date))&&row.transaction_date<=today&&Number.isFinite(Number(row.amount))&&Number(row.amount)>=0);
 const selected=valid.filter(row=>row.transaction_date.slice(0,7)===month),prior=valid.filter(row=>row.transaction_date.slice(0,7)===previous&&Number(row.transaction_date.slice(8,10))<=previousCutoff);
 const totalCents=sum(selected),priorCents=sum(prior),map=new Map();
 for(const row of selected){const key=category(row);const entry=map.get(key)||{name:key,cents:0,rows:[],icon:row.categories?.icon||'▦'};entry.cents+=cents(row);entry.rows.push(row);map.set(key,entry);}
 const categories=[...map.values()].sort((a,b)=>b.cents-a.cents||a.name.localeCompare(b.name,'th'));
 const weeks=Array.from({length:Math.ceil(Math.min(days,cutoff)/7)},(_,i)=>({start:i*7+1,end:Math.min((i+1)*7,days,cutoff),cents:0}));
 for(const row of selected){const index=Math.floor((Number(row.transaction_date.slice(8,10))-1)/7);if(weeks[index])weeks[index].cents+=cents(row);}
 let insight=null;
 if(categories.length){const top=categories[0];insight={title:top.name+' เป็นรายจ่ายหลัก',body:money(top.cents/100)+' · '+(totalCents?top.cents/totalCents*100:0).toFixed(1)+'% ของรายจ่ายที่จ่ายแล้ว'};}
 return {month,previous,current,previousCutoff,selected,totalCents,priorCents,categories,weeks,delta:priorCents>0?(totalCents-priorCents)/priorCents*100:null,insight};
}
