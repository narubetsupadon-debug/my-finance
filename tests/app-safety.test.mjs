import assert from 'node:assert/strict';
import {findDuplicateCandidates} from '../app-safety.js';

const existing=[
 {id:'a',transaction_date:'2026-10-05',type:'expense',amount:85,description:'อาหารกลางวัน',category_id:'food',status:'paid'},
 {id:'b',transaction_date:'2026-10-05',type:'expense',amount:85,description:'กาแฟ',category_id:'coffee',status:'paid'},
 {id:'c',transaction_date:'2026-10-04',type:'expense',amount:85,description:'อาหารกลางวัน',category_id:'food',status:'paid'}
];
const exact=findDuplicateCandidates({transaction_date:'2026-10-05',type:'expense',amount:85,description:'อาหารกลางวัน',category_id:'food'},existing);
assert.equal(exact.length,1);
assert.equal(exact[0].id,'a');

const sameCategory=findDuplicateCandidates({transaction_date:'2026-10-05',type:'expense',amount:85,description:'ข้าวกลางวัน',category_id:'food'},existing);
assert.equal(sameCategory.length,1);
assert.equal(sameCategory[0].id,'a');

const none=findDuplicateCandidates({transaction_date:'2026-10-05',type:'expense',amount:90,description:'อาหารกลางวัน',category_id:'food'},existing);
assert.equal(none.length,0);

console.log('PASS app-safety: duplicate candidates are high-confidence and non-blocking');
