// Регрессия: новый экземпляр редактора не продолжает полномочия старого host.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createUiHost} from '../akronikl/ui/nexus-host.js';
import {createAssistantCore} from '../akronikl/core/index.js';
import {createCodeWorkspace} from '../sandbox/code-workspace.js';
function fixture(){
 const identity={},root={isConnected:true};
 const make=()=>createCodeWorkspace({files:[{path:'main.cpp',content:'SYNTHETIC',languageId:'cpp'}]});
 const editor={isConnected:true,value:'SYNTHETIC',selectionStart:0,selectionEnd:9,__nexusCodeStudio:{workspace:make()}};
 const host=createUiHost({root,readIdentity:()=>identity,readRoute:()=>({view:'code-studio',project:'synthetic'}),readLocale:()=> 'ru',readCourseLocale:()=> 'ru',readEditor:()=>editor});
 return{host,editor,make};
}
test('повторный bind на том же textarea с другой workspace закрывает прежний host',()=>{
 const{host,editor,make}=fixture();assert.equal(host.current(),true);
 editor.__nexusCodeStudio={workspace:make()};assert.equal(host.current(),false);host.dispose();
});
test('новый экземпляр Studio даже с прежней workspace меняет границу контекста',()=>{
 const{host,editor}=fixture();editor.__nexusCodeStudio={workspace:editor.__nexusCodeStudio.workspace};assert.equal(host.current(),false);host.dispose();
});
test('удалённый binding Studio запрещает чтение прежней selection',()=>{
 const{host,editor}=fixture();delete editor.__nexusCodeStudio;assert.equal(host.current(),false);host.dispose();
});

test('замена workspace внутри прежнего Studio не раскрывает сохранённую selection',async()=>{
 const{host,editor,make}=fixture();const core=createAssistantCore({host:host.adapter,policy:{selection:true}});
 const request={capability:'context.current',input:{include:['selection']}};
 assert.equal((await core.invoke(request)).data.selection.code,'SYNTHETIC');
 editor.__nexusCodeStudio.workspace=make();assert.equal(host.current(),false);
 const result=await core.invoke(request);assert.notEqual(result.status,'ok');assert.equal(JSON.stringify(result).includes('SYNTHETIC'),false);
 core.dispose();host.dispose();
});
