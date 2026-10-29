import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../akronikl/experience/piper-runtime-prosody.js',import.meta.url),'utf8');
const start=source.indexOf('  async predict(text, phonemeTransform) {'),end=source.indexOf('    const speakerId = 0;',start);
assert.ok(start>=0&&end>start);
// Exercise the actual shipped phonemization body, without an acoustic model or network.
const body=source.slice(source.indexOf('{',start)+1,end)+'return phonemeIds;';
const create=new Function('__privateGet','_createPiperPhonemize','_wasmPaths','_modelConfig','return async function(text,phonemeTransform){'+body+'}');
async function predict(factory){return create((o,k)=>o[k],'factory','paths','config').call({waitReady:Promise.resolve(),factory,paths:{},config:{espeak:{voice:'ru'},phoneme_id_map:{},num_symbols:256}},'Проверка.');}
test('real runtime rejects failed WASM loading, callMain and diagnostics without a hanging promise',async()=>{
 for(const factory of [async()=>{throw Error('load failed')},async()=>({callMain(){throw Error('main failed')}}),async options=>({callMain(){options.printErr('diagnostic failure')}})]){
  let timer;try{await assert.rejects(Promise.race([predict(factory),new Promise((_,reject)=>timer=setTimeout(()=>reject(Error('HUNG')),1000))]),error=>error.message!=='HUNG');}finally{clearTimeout(timer);}
 }
});
