import test from 'node:test';
import assert from 'node:assert/strict';
import {bindDialogFocusCycle} from '../akronikl/ui/focus-cycle.js';
function fixture(){
 let handler;const doc={activeElement:null,defaultView:{getComputedStyle:()=>({visibility:'visible'})}};
 const node=(props={})=>({tabIndex:0,disabled:false,parentElement:null,getClientRects:()=>[{}],closest:()=>null,focus(){doc.activeElement=this},...props});
 const first=node(),summary=node(),hidden=node();const details={tagName:'DETAILS',open:false,parentElement:null,children:[summary,hidden]};summary.tagName='SUMMARY';summary.parentElement=details;hidden.parentElement=details;
 const dialog={ownerDocument:doc,querySelectorAll:()=>[first,summary,hidden],addEventListener(_,fn){handler=fn;}};
 bindDialogFocusCycle(dialog);
 return{doc,first,summary,hidden,details,press(shiftKey=false){let prevented=false;handler({key:'Tab',shiftKey,defaultPrevented:false,preventDefault(){prevented=true}});return prevented}};
}
test('закрытый details: последний summary замыкает Tab, скрытый input не считается последним',()=>{const f=fixture();f.doc.activeElement=f.summary;assert.equal(f.press(),true);assert.equal(f.doc.activeElement,f.first)});
test('закрытый details: обратный обход возвращается на summary, не скрытый input',()=>{const f=fixture();f.doc.activeElement=f.first;assert.equal(f.press(true),true);assert.equal(f.doc.activeElement,f.summary)});
test('открытый details: input снова участвует в обходе',()=>{const f=fixture();f.details.open=true;f.doc.activeElement=f.first;f.press(true);assert.equal(f.doc.activeElement,f.hidden)});
test('открытый details внутри закрытого предка не раскрывает фокусируемые элементы',()=>{const f=fixture();f.details.open=true;f.details.parentElement={tagName:'DETAILS',open:false,parentElement:null,children:[]};f.doc.activeElement=f.first;f.press(true);assert.equal(f.doc.activeElement,f.first)});
