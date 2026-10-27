import {localLoadOptions} from '../connections/profiles.js';
import {probeWebGPU,checkSignal} from '../connections/probe.js';
// Только доверенный in-process runtime. Внешнего URL/API/ключей здесь нет.
export const LOCAL_MODEL=Object.freeze({id:'qwen3-0.6b-q8_0',filename:'Qwen3-0.6B-Q8_0.gguf',maxBytes:700000000,sha256:'9465e63a22add5354d9bb4b99e90117043c7124007664907259bd16d043bb031',runtime:'@wllama/wllama',runtimeVersion:'3.8.1'});
export function createWllamaProvider(engine) {
  if(!engine||typeof engine.createChatCompletion!=='function'||typeof engine.exit!=='function')throw Error('LOCAL_ENGINE_INVALID');
  const generate=engine.createChatCompletion.bind(engine),exit=engine.exit.bind(engine);let disposed=false,busy=false;
  return Object.freeze({kind:'local',transport:'in-process',modelId:LOCAL_MODEL.id,
    async generate({messages,allowedCitations,signal,onProgress}){
      if(disposed||busy||signal?.aborted)throw Error('LOCAL_ENGINE_UNAVAILABLE');busy=true;
      try{
        let content='',finish=null,pieces=0,reasoningPieces=0;
        const started=performance.now();
        // Сырые фрагменты/рассуждения не выводятся: наружу только числовой прогресс.
        // Итоговый текст появляется лишь после полного JSON и проверки цитат сессией.
        await generate({messages,abortSignal:signal,stream:true,cache_prompt:false,max_tokens:192,
          temperature:0.2,seed:42,chat_template_kwargs:{enable_thinking:false},return_progress:true,timings_per_token:true,
          response_format:{type:'json_schema',json_schema:{name:'nexus_tutor_answer',strict:true,schema:{type:'object',properties:{answer:{type:'string'},citations:{type:'array',items:{type:'string',enum:allowedCitations}}},required:['answer','citations'],additionalProperties:false}}},
          onData(chunk){
            if(disposed||signal?.aborted)return;
            const choice=chunk?.choices?.[0],delta=choice?.delta;
            if(delta?.tool_calls?.length)throw Error('LOCAL_ANSWER_INVALID');
            if(typeof delta?.reasoning_content==='string'&&delta.reasoning_content)reasoningPieces++;
            if(typeof delta?.content==='string'){content+=delta.content;if(delta.content)pieces++;}
            if(content.length>10000)throw Error('LOCAL_ANSWER_INVALID');
            if(choice?.finish_reason)finish=choice.finish_reason;
            const p=chunk?.prompt_progress;
            try{onProgress?.(Object.freeze({phase:pieces?'generation':'prompt',elapsedMs:Math.round(performance.now()-started),pieces,reasoningPieces,
              processed:Number.isSafeInteger(p?.processed)?p.processed:0,total:Number.isSafeInteger(p?.total)?p.total:0}));}catch{}
          }});
        if(disposed||signal?.aborted)throw Error('LOCAL_ENGINE_UNAVAILABLE');
        if(finish!=='stop'||!content||reasoningPieces)throw Error('LOCAL_ANSWER_INVALID');
        return JSON.parse(content);
      }finally{busy=false;}
    },
    async dispose(){if(disposed)return;disposed=true;await exit();}
  });
}
export async function loadLocalModel(file,{signal,profile='local-cpu',loadRuntime=()=>import('./runtime/index.js')}={}) {
  checkSignal(signal);const loadOptions=localLoadOptions(profile);
  if(!(file instanceof Blob)||file.size<1024||file.size>LOCAL_MODEL.maxBytes)throw Error('LOCAL_FILE_REJECTED');
  signal?.throwIfAborted();
  if(profile==='local-webgpu'&&await probeWebGPU({signal})!=='available')throw Error('LOCAL_GPU_UNAVAILABLE');
  const hash=await crypto.subtle.digest('SHA-256',await file.arrayBuffer());signal?.throwIfAborted();
  if([...new Uint8Array(hash)].map(b=>b.toString(16).padStart(2,'0')).join('')!==LOCAL_MODEL.sha256)throw Error('LOCAL_FILE_REJECTED');
  const {Wllama}=await loadRuntime();signal?.throwIfAborted();
  const engine=new Wllama({default:new URL('./runtime/wasm/wllama.wasm',import.meta.url).href},{logger:{debug(){},log(){},warn(){},error(){}},suppressNativeLog:true});
  try{
    // Запрещён скрытый CDN fallback runtime. Неподдерживаемый браузер получает отказ.
    engine.setCompat(null);
    // n_parallel:1, jinja:true, reasoning_budget_tokens:0 заданы фиксированным профилем.
    // Не меняем COOP/COEP. Запрос WebGPU не считается доказательством offload/скорости.
    if(profile==='local-webgpu'&&engine.isSupportWebGPU?.()!==true)throw Error('LOCAL_GPU_UNAVAILABLE');
    await engine.loadModel([file],loadOptions);
    signal?.throwIfAborted();return createWllamaProvider(engine);
  }catch(error){await engine.exit().catch(()=>{});throw Error('LOCAL_MODEL_UNAVAILABLE');}
}
