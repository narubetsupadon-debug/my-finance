export const rentCategories=['ห้องเช่า','ค่าห้องเช่า','ค่าเช่า','ค่าห้อง','ที่พัก','บ้าน'];
export function rentAmounts(full,my){
 const fullCents=Math.round(Number(full)*100),myCents=Math.round(Number(my)*100);
 if(full===''||my===''||!Number.isSafeInteger(fullCents)||!Number.isSafeInteger(myCents)||fullCents<=0||fullCents>99999999999999||myCents<0||myCents>fullCents)throw new Error('ยอดบิลต้องมากกว่า 0 และส่วนมิวต้องอยู่ระหว่าง 0 ถึงยอดบิล');
 return {full_amount:fullCents/100,my_amount:myCents/100};
}
export function duplicateRentMonth(rows,month,id=null){return rows.find(r=>r.bill_month.slice(0,7)===month&&r.id!==id);}
export function availableRentPayments(transactions,rows){
 const linked=new Set(rows.map(r=>r.transaction_id));
 return transactions.filter(t=>t.type==='expense'&&t.status==='paid'&&['web','app'].includes(t.source)&&rentCategories.includes(t.categories?.name)&&!linked.has(t.id));
}
