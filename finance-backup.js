export const financialBackupTables=['categories','accounts','transactions','bills','debts','budgets','salary_records','car_installments','car_expenses','rent_records'];
export function serializeFinanceBackup(backup){
 if(backup?.format!=='my-finance-backup'||backup.version!==1||!backup.owner_id||!Number.isFinite(Date.parse(backup.exported_at))||!backup.data)throw new Error('รูปแบบสำรองข้อมูลไม่ครบ');
 if(Object.keys(backup.data).length!==financialBackupTables.length)throw new Error('ตารางสำรองข้อมูลไม่ครบ');
 for(const table of financialBackupTables){const rows=backup.data[table];if(!Array.isArray(rows)||rows.some(row=>!row?.id||row.user_id!==backup.owner_id)||new Set(rows.map(r=>r.id)).size!==rows.length)throw new Error('ข้อมูลสำรองไม่ครบหรือเจ้าของข้อมูลไม่ตรง: '+table);}
 return JSON.stringify(backup,null,2);
}

// Prepare an owner-validated snapshot for Excel. Dimensions stay complete so IDs
// in a selected period can still be resolved; dated sheets use real event dates.
export function financeExcelSheets(backup,{from='',to=''}={}){
 serializeFinanceBackup(backup);
 const validDate=s=>/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s+'T00:00:00Z'))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
 if((from&&!validDate(from))||(to&&!validDate(to))||(from&&to&&from>to))throw Error('ช่วงวันที่ไม่ถูกต้อง');
 const included=date=>(!from||date>=from)&&(!to||date<=to);
 const dates={transactions:'transaction_date',salary_records:'payment_date',car_installments:'payment_date',car_expenses:'expense_date',rent_records:'payment_date'};
 const titles={categories:'หมวดหมู่',accounts:'บัญชี',transactions:'รายการ',bills:'บิลประจำ',debts:'บัตรและสินเชื่อ',budgets:'งบประมาณ',salary_records:'เงินเดือน',car_installments:'งวดรถ',car_expenses:'ค่าใช้รถ',rent_records:'ค่าห้องเช่า'};
 const labels={id:'รหัสรายการ',user_id:'รหัสเจ้าของ',transaction_date:'วันที่',type:'ประเภท',category_id:'รหัสหมวด',account_id:'รหัสบัญชี',description:'รายละเอียด',amount:'จำนวนเงิน',status:'สถานะ',note:'หมายเหตุ',source:'ที่มา',payment_date:'วันจ่ายหรือรับ',bill_month:'เดือนบิล',salary_month:'เดือนเงินเดือน',full_amount:'ยอดเต็ม',my_amount:'ส่วนมิว',name:'ชื่อ',transaction_id:'รหัสรายการที่เชื่อม'};
 const selected={};
 for(const table of financialBackupTables)selected[table]=backup.data[table].filter(row=>!dates[table]||(!from&&!to)||!!row[dates[table]]&&included(String(row[dates[table]]).slice(0,10)));
 const months=new Map();
 for(const row of selected.transactions){if(row.status==='cancelled')continue;const key=row.transaction_date.slice(0,7),m=months.get(key)||{income:0,expense:0,count:0};m[row.type==='income'?'income':'expense']+=Math.round(Number(row.amount)*100);m.count++;months.set(key,m);}
 const sheets=[{name:'สรุป',rows:[['เดือน','รายรับ','รายจ่าย','สุทธิ','จำนวนรายการ'],...[...months].sort(([a],[b])=>a.localeCompare(b)).map(([m,v])=>[m,v.income/100,v.expense/100,(v.income-v.expense)/100,v.count])],keys:['month','amount','amount','amount','count']},
 {name:'ข้อมูลการส่งออก',rows:[['รายการ','รายละเอียด'],['ส่งออกเมื่อ',backup.exported_at],['ช่วงวันที่',from||to?(from||'ตั้งแต่เริ่ม')+' ถึง '+(to||'ล่าสุด'):'ทั้งหมด'],['ยอดสรุป','รวมรายการที่ไม่ยกเลิก รวมรอดำเนินการและวันที่อนาคต'],['ข้อมูลตามช่วง','เงินเดือน ห้อง และงวดรถกรองตามวันรับหรือจ่าย ไม่ใช่เดือนบิล; ถ้าเลือกช่วงจะไม่รวมรายการที่ยังไม่มีวันจ่าย'],['ข้อมูลตั้งต้น','บัญชี หมวด บิล บัตร และงบเป็นสถานะปัจจุบัน ส่งออกทั้งหมดทุกครั้ง'],['หมายเหตุ','ไฟล์สำหรับอ่านและเก็บข้อมูล ไม่ใช่ไฟล์นำกลับระบบ; เก็บ JSON คู่กัน']],keys:['text','text']}];
 for(const table of financialBackupTables){
  const rows=selected[table],keys=[...new Set(backup.data[table].flatMap(row=>Object.keys(row)))];if(!keys.length)keys.push('id');
  sheets.push({name:titles[table],keys,rows:[keys.map(k=>labels[k]||k),...rows.map(row=>keys.map(k=>{const v=row[k];if(v==null)return '';if(typeof v==='object')return JSON.stringify(v);if(typeof v==='boolean')return v?'ใช่':'ไม่';if(typeof v==='string'&&/amount|salary|overtime|allowance|bonus|security|tax|fund|deduction|balance|limit|liters|km/.test(k)&&v.trim()!==''&&Number.isFinite(Number(v)))return Number(v);return v;}))]});
 }
 return sheets;
}
export function createFinanceWorkbook(XLSX,backup,range){
 const workbook=XLSX.utils.book_new();
 for(const data of financeExcelSheets(backup,range)){
  const sheet=XLSX.utils.aoa_to_sheet(data.rows);
  sheet['!cols']=data.keys.map(k=>({wch:/note|description/.test(k)?60:/id/.test(k)?38:22}));
  sheet['!autofilter']={ref:sheet['!ref']};
  for(let r=1;r<data.rows.length;r++)for(let c=0;c<data.keys.length;c++){
   const cell=sheet[XLSX.utils.encode_cell({r,c})];if(!cell)continue;
   if(cell.t==='n')cell.z=Number.isInteger(cell.v)&&!/amount|salary|balance|limit/.test(data.keys[c])?'#,##0':'#,##0.00';
   if(typeof cell.v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(cell.v)&&/(date|month)$/.test(data.keys[c])){cell.v=(Date.parse(cell.v+'T00:00:00Z')-Date.UTC(1899,11,30))/86400000;cell.t='n';cell.z='dd/mm/yyyy';}
  }
  XLSX.utils.book_append_sheet(workbook,sheet,data.name);
 }
 return workbook;
}
