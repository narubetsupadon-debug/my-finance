export const financialBackupTables=['categories','accounts','transactions','bills','debts','budgets','salary_records','car_installments','car_expenses','rent_records'];
export function serializeFinanceBackup(backup){
 if(backup?.format!=='my-finance-backup'||backup.version!==1||!backup.owner_id||!Number.isFinite(Date.parse(backup.exported_at))||!backup.data)throw new Error('รูปแบบสำรองข้อมูลไม่ครบ');
 if(Object.keys(backup.data).length!==financialBackupTables.length)throw new Error('ตารางสำรองข้อมูลไม่ครบ');
 for(const table of financialBackupTables){const rows=backup.data[table];if(!Array.isArray(rows)||rows.some(row=>!row?.id||row.user_id!==backup.owner_id)||new Set(rows.map(r=>r.id)).size!==rows.length)throw new Error('ข้อมูลสำรองไม่ครบหรือเจ้าของข้อมูลไม่ตรง: '+table);}
 return JSON.stringify(backup,null,2);
}

