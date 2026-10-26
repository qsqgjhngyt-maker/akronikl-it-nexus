import test from 'node:test';
import assert from 'node:assert/strict';
import {readWorkerConfiguration as read} from '../tools/published-worker-configuration.mjs';
const config=value=>'var define_NEXUS_PWA_CONFIG_default = '+value+';';
test('Снимок принимает JSON числа, строки и вложенные данные без выполнения JS',()=>{
 assert.deepEqual(read(config('{bytes:1e3, negative:-1.25e-2, zero:0, valid:true, items:[{name:"e3 braces { }", n:null}]}')),{bytes:1000,negative:-0.0125,zero:0,valid:true,items:[{name:'e3 braces { }',n:null}]});
});
test('Снимок отклоняет выражения, исполняемый код и некорректные литералы',()=>{
 for(const value of ['NaN','Infinity','process.exit()','1e3+1','undefined','(()=>1)()','01','1e','+1','0x10'])assert.throws(()=>read(config('{bytes:'+value+'}')),value);
 assert.throws(()=>read(config('{}')+config('{}')));
 assert.throws(()=>read('var define_NEXUS_PWA_CONFIG_default = {broken:true'));
});
