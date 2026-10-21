const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
class Color{constructor(value){this.value=value}}class Size{constructor(width,height){Object.assign(this,{width,height})}}class Rect{constructor(x,y,width,height){Object.assign(this,{x,y,width,height})}}class DrawContext{constructor(){this.dots=[]}setFillColor(color){this.color=color.value}fillEllipse(rect){this.dots.push({...rect,color:this.color})}setFont(){}setTextColor(){}setTextAlignedCenter(){}drawTextInRect(value){this.text=value}getImage(){return this}}
class Stack{constructor(){this.items=[]}addText(value){const item={value};this.items.push(item);return item}addSpacer(){}addStack(){const item=new Stack();this.items.push(item);return item}addImage(value){const item={image:value};this.items.push(item);return item}layoutHorizontally(){}layoutVertically(){}centerAlignContent(){}setPadding(){}}
class ListWidget extends Stack{}
const sandbox={Color,Size,Rect,DrawContext,ListWidget,Font:{semiboldSystemFont:()=>null,systemFont:()=>null},Keychain:{contains:()=>false,set(){}},DateFormatter:class{string(){return '14/10 10:30'}},config:{runsInWidget:true,widgetFamily:'medium'},Script:{setWidget(widget){sandbox.result=widget},complete(){}}};vm.createContext(sandbox);vm.runInContext(fs.readFileSync(require('path').join(__dirname,'../My-Finance-Cards.js'),'utf8').replace(/await main\(\);\s*$/,''),sandbox);

assert.equal(sandbox.cardBalances([{id:'a',name:'A',debt_type:'credit_card',original_amount:1000,outstanding_amount:10},{id:'z',name:'Z',debt_type:'credit_card',original_amount:1000,outstanding_amount:100}])[0].id,'z');
assert.equal(sandbox.cardBalances([{id:'off',debt_type:'credit_card',is_active:false,original_amount:1000,outstanding_amount:100}]).length,0);
(async()=>{
 for(const inWidget of [false,true])for(const family of ['small','medium','large']){
 sandbox.config.runsInWidget=inWidget;sandbox.config.widgetFamily=family;
 ListWidget.prototype.presentMedium=async function(){sandbox.preview=true;};sandbox.preview=false;
 await vm.runInContext("getSession=async()=>({user_id:'owner'});readAll=async(table,query)=>{if(table!=='debts')throw Error('Must only read cards');if(!query.includes('is_active=eq.true'))throw Error('Must exclude inactive cards');return [{id:'c1',name:'Test Card',debt_type:'credit_card',original_amount:10000,outstanding_amount:1234.56}];};main();",sandbox);
 const texts=[];function walk(stack){for(const item of stack.items){if(item instanceof Stack)walk(item);else if(item.value)texts.push(item.value)}}walk(sandbox.result);
 assert(Math.abs(sandbox.result.refreshAfterDate.getTime()-Date.now()-600000)<2000);assert(texts.includes('Test Card'));assert(texts.includes('เหลือ ฿8,765.44'));assert(!texts.includes('วันนี้ใช้ไป'));assert(texts.includes('฿1,234.56'));assert(texts.includes('ใช้ 12% · วงเงิน ฿10,000.00'));assert(texts.some(x=>x.includes('สำเร็จ')));assert.equal(sandbox.preview,!inWidget);
 }
 sandbox.config.widgetFamily='large';const large=new ListWidget();sandbox.renderCards(large,Array.from({length:5},(_,i)=>({name:'Card '+i,remaining:876544,spent:123456,limit:1000000,over:0})),new Date(),false);const labels=[];function collect(s){for(const i of s.items){if(i instanceof Stack)collect(i);else if(i.value)labels.push(i.value)}}collect(large);assert.equal(labels.filter(x=>x.startsWith('Card ')).length,4);assert(labels.includes('อีก 1 บัตร · แตะดูทั้งหมด'));
 let checkedWrites=0;sandbox.Keychain.set=()=>checkedWrites++;sandbox.config.runsInWidget=true;
 await vm.runInContext("readAll=async()=>{throw Error('offline')};main();",sandbox);
 const failed=[];function failWalk(s){for(const i of s.items){if(i instanceof Stack)failWalk(i);else if(i.value)failed.push(i.value)}}failWalk(sandbox.result);
 assert.equal(checkedWrites,0,'Offline attempt must not overwrite last-success time');
 assert(failed.some(x=>x.includes('อัปเดตไม่สำเร็จ')));assert(!failed.includes('เหลือ ฿0.00'),'Offline must not pretend zero balance');
 console.log('PASS dedicated card widget: no Parameter, app preview and all widget sizes, card-only query, exact available credit');
})().catch(e=>{console.error(e);process.exit(1)});
