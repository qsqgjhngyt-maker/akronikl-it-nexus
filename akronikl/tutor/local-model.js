// Только доверенный in-process runtime. Внешнего URL/API/ключей здесь нет.
export const LOCAL_MODEL=Object.freeze({id:'qwen3-0.6b-q8_0',filename:'Qwen3-0.6B-Q8_0.gguf',maxBytes:700000000,sha256:'9465e63a22add5354d9bb4b99e90117043c7124007664907259bd16d043bb031',runtime:'@wllama/wllama',runtimeVersion:'3.8.1'});
export function createWllamaProvider(engine) {
  if(!engine||typeof engine.createChatCompletion!=='function'||typeof engine.exit!=='function')throw Error('LOCAL_ENGINE_INVALID');
  const generate=engine.createChatCompletion.bind(engine),exit=engine.exit.bind(engine);let disposed=false,busy=false;
  return Object.freeze({kind:'local',transport:'in-process',modelId:LOCAL_MODEL.id,
    async generate({messages,allowedCitations,signal}){
      if(disposed||busy||signal?.aborted)throw Error('LOCAL_ENGINE_UNAVAILABLE');busy=true;
      try{
        const response=await generate({messages,abortSignal:signal,stream:false,cache_prompt:false,max_tokens:192,temperature:0.2,seed:42,chat_template_kwargs:{enable_thinking:false},
          response_format:{type:'json_schema',json_schema:{name:'nexus_tutor_answer',strict:true,schema:{type:'object',properties:{answer:{type:'string'},citations:{type:'array',items:{type:'string',enum:allowedCitations}}},required:['answer','citations'],additionalProperties:false}}}});
        if(disposed||signal?.aborted)throw Error('LOCAL_ENGINE_UNAVAILABLE');
        const choice=response?.choices?.[0];
        if(choice?.finish_reason==='length'||typeof choice?.message?.content!=='string'||choice.message.content.length>10000)throw Error('LOCAL_ANSWER_INVALID');
        return JSON.parse(choice.message.content);
      }finally{busy=false;}
    },
    async dispose(){if(disposed)return;disposed=true;await exit();}
  });
}
export async function loadLocalModel(file,{signal,loadRuntime=()=>import('./runtime/index.js')}={}) {
  if(!(file instanceof Blob)||file.size<1024||file.size>LOCAL_MODEL.maxBytes)throw Error('LOCAL_FILE_REJECTED');
  signal?.throwIfAborted();
  const hash=await crypto.subtle.digest('SHA-256',await file.arrayBuffer());signal?.throwIfAborted();
  if([...new Uint8Array(hash)].map(b=>b.toString(16).padStart(2,'0')).join('')!==LOCAL_MODEL.sha256)throw Error('LOCAL_FILE_REJECTED');
  const {Wllama}=await loadRuntime();signal?.throwIfAborted();
  const engine=new Wllama({default:new URL('./runtime/wasm/wllama.wasm',import.meta.url).href},{logger:{debug(){},log(){},warn(){},error(){}},suppressNativeLog:true});
  try{
    // Single thread intentionally avoids changing Nexus COOP/COEP or auth headers.
    await engine.loadModel([file],{n_threads:1,n_gpu_layers:0,n_ctx:4096,n_batch:128,n_ubatch:128,cache_idle_slots:false,reasoning:false});
    signal?.throwIfAborted();return createWllamaProvider(engine);
  }catch(error){await engine.exit().catch(()=>{});throw Error('LOCAL_MODEL_UNAVAILABLE');}
}
