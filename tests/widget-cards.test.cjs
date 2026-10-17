const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
class Color{constructor(value){this.value=value}}class Size{constructor(width,height){Object.assign(this,{width,height})}}class Rect{constructor(x,y,width,height){Object.assign(this,{x,y,width,height})}}class DrawContext{constructor(){this.dots=[]}setFillColor(color){this.color=color.value}fillEllipse(rect){this.dots.push({...rect,color:this.color})}setFont(){}setTextColor(){}setTextAlignedCenter(){}drawTextInRect(value){this.text=value}getImage(){return this}}
class Stack{constructor(){this.items=[]}addText(value){const item={value};this.items.push(item);return item}addSpacer(){}addStack(){const item=new Stack();this.items.push(item);return item}addImage(value){const item={image:value};this.items.push(item);return item}layoutHorizontally(){}layoutVertically(){}centerAlignContent(){}setPadding(){}}
class ListWidget extends Stack{}
const sandbox={Color,Size,Rect,DrawContext,ListWidget,Font:{semiboldSystemFont:()=>null,systemFont:()=>null},Keychain:{contains:()=>false,set(){}},DateFormatter:class{string(){return '14/10 10:30'}},config:{runsInWidget:true,widgetFamily:'medium'},Script:{setWidget(widget){sandbox.result=widget},complete(){}}};vm.createContext(sandbox);vm.runInContext(fs.readFileSync(require('path').join(__dirname,'../My-Finance-Cards.js'),'utf8').replace(/await main\(\);\s*$/,''),sandbox);

(async()=>{
 for(const inWidget of [false,true])for(const family of ['small','medium','large']){
 sandbox.config.runsInWidget=inWidget;sandbox.config.widgetFamily=family;
 ListWidget.prototype.presentMedium=async function(){sandbox.preview=true;};sandbox.preview=false;
 await vm.runInContext("getSession=async()=>({user_id:'owner'});readAll=async(table,query)=>{if(table!=='debts')throw Error('Must only read cards');return [{id:'c1',name:'Test Card',debt_type:'credit_card',original_amount:10000,outstanding_amount:1234.56}];};main();",sandbox);
 const texts=[];function walk(stack){for(const item of stack.items){if(item instanceof Stack)walk(item);else if(item.value)texts.push(item.value)}}walk(sandbox.result);
 assert(texts.includes('Test Card'));assert(texts.includes('เหลือ ฿8,765.44'));assert(!texts.includes('วันนี้ใช้ไป'));assert.equal(sandbox.preview,!inWidget);
 }
 console.log('PASS dedicated card widget: no Parameter, app preview and all widget sizes, card-only query, exact available credit');
})().catch(e=>{console.error(e);process.exit(1)});
