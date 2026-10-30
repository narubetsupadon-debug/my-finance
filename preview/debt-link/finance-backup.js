const financialBackupTables=['categories','accounts','transactions','bills','debts','budgets','salary_records','car_installments','car_expenses','rent_records'];
function serializeFinanceBackup(backup){
 if(backup?.format!=='my-finance-backup'||backup.version!==1||!backup.owner_id||!Number.isFinite(Date.parse(backup.exported_at))||!backup.data)throw new Error('รูปแบบสำรองข้อมูลไม่ครบ');
 if(Object.keys(backup.data).length!==financialBackupTables.length)throw new Error('ตารางสำรองข้อมูลไม่ครบ');
 for(const table of financialBackupTables){const rows=backup.data[table];if(!Array.isArray(rows)||rows.some(row=>!row?.id||row.user_id!==backup.owner_id)||new Set(rows.map(r=>r.id)).size!==rows.length)throw new Error('ข้อมูลสำรองไม่ครบหรือเจ้าของข้อมูลไม่ตรง: '+table);}
 return JSON.stringify(backup,null,2);
}


// Read-only recovery rehearsal: validates cross-table identity and references.
// This does not import, merge or overwrite live financial data.
function verifyFinanceBackup(backup,expectedOwner=backup?.owner_id){
 serializeFinanceBackup(backup);
 if(backup.owner_id!==expectedOwner)throw new Error('เจ้าของไฟล์สำรองไม่ตรงกับบัญชี');
 const ids=Object.fromEntries(financialBackupTables.map(t=>[t,new Set(backup.data[t].map(r=>r.id))]));
 const counts={};
 for(const table of financialBackupTables){counts[table]=backup.data[table].length;
  for(const row of backup.data[table]){
   for(const [field,target] of [['category_id','categories'],['account_id','accounts'],['debt_id','debts'],['transaction_id','transactions']]){
    if(row[field]!=null&&!ids[target].has(row[field]))throw new Error('ลิงก์ในไฟล์สำรองไม่ครบ: '+table+' / '+field);
   }
  }
 }
 const links=[...backup.data.salary_records,...backup.data.car_expenses,...backup.data.car_installments,...backup.data.rent_records].map(r=>r.transaction_id).filter(Boolean);
 if(new Set(links).size!==links.length)throw new Error('รายการจ่ายเชื่อมหลายเรื่องในไฟล์สำรอง');
 // Separate JSON instances prove the serialized snapshot round trips losslessly.
 const restored=JSON.parse(serializeFinanceBackup(backup));
 return {ok:true,owner:expectedOwner,counts,totalRows:Object.values(counts).reduce((s,n)=>s+n,0),restored};
}
