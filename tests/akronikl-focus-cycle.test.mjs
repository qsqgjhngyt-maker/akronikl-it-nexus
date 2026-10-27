import test from 'node:test';
import assert from 'node:assert/strict';
import {bindDialogFocusCycle} from '../akronikl/ui/focus-cycle.js';
function fixture(){
 let listener,aborted=false,prevented=false;
 const doc={activeElement:null,defaultView:{getComputedStyle:n=>({visibility:n.hidden?'hidden':'visible'})}};
 const node=(props={})=>({tabIndex:0,disabled:false,hidden:false,getClientRects(){return this.noRect?[]:[{}]},closest(){return this.inert?{}:null},focus(){doc.activeElement=this},...props});
 const first=node(),middle=node(),last=node();let items=[first,middle,last];
 const dialog={ownerDocument:doc,querySelectorAll:()=>items,focus(){doc.activeElement=dialog},addEventListener(type,fn,{signal}){listener=fn;signal.addEventListener('abort',()=>aborted=true)}};
 const release=bindDialogFocusCycle(dialog);
 return {doc,first,middle,last,dialog,node,release,setItems:x=>items=x,get aborted(){return aborted},press(key='Tab',shiftKey=false,defaultPrevented=false){prevented=false;listener({key,shiftKey,defaultPrevented,preventDefault(){prevented=true}});return prevented}};
}
test('Tab последнего элемента возвращает фокус к первому',()=>{const f=fixture();f.doc.activeElement=f.last;assert.equal(f.press(),true);assert.equal(f.doc.activeElement,f.first)});
test('Shift+Tab первого возвращает фокус к последнему',()=>{const f=fixture();f.doc.activeElement=f.first;assert.equal(f.press('Tab',true),true);assert.equal(f.doc.activeElement,f.last)});
test('обычный Tab внутри группы остаётся браузеру',()=>{const f=fixture();f.doc.activeElement=f.middle;assert.equal(f.press(),false)});
test('hidden, disabled, inert и отрицательный tabindex не участвуют',()=>{const f=fixture();f.setItems([f.node({disabled:true}),f.first,f.middle,f.last,f.node({hidden:true}),f.node({inert:true}),f.node({tabIndex:-1}),f.node({noRect:true})]);f.doc.activeElement=f.last;assert.equal(f.press(),true);assert.equal(f.doc.activeElement,f.first)});
test('прочие и уже обработанные клавиши не перехватываются',()=>{const f=fixture();f.doc.activeElement=f.last;assert.equal(f.press('Escape'),false);assert.equal(f.press('Tab',false,true),false)});
test('пустое окно фокусируется само и освобождает обработчик',()=>{const f=fixture();f.setItems([]);assert.equal(f.press(),true);assert.equal(f.doc.activeElement,f.dialog);assert.equal(f.dialog.tabIndex,-1);f.release();assert.equal(f.aborted,true)});
