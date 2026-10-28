import {createInferenceMeter} from '../experience/metrics.js';
import {localLoadOptions} from '../connections/profiles.js';
import {probeWebGPU,checkSignal} from '../connections/probe.js';
import {rankTutorQuotes} from './retrieval.js';
// Только доверенный in-process runtime. Внешнего URL/API/ключей здесь нет.
export const LOCAL_MODEL=Object.freeze({id:'qwen3-0.6b-q8_0',filename:'Qwen3-0.6B-Q8_0.gguf',maxBytes:700000000,sha256:'9465e63a22add5354d9bb4b99e90117043c7124007664907259bd16d043bb031',runtime:'@wllama/wllama',runtimeVersion:'3.8.1'});
export function evidenceQuoteCandidates(source){
  const quotes=[];
  for(const line of source.text.split(/\n+/u)){
    if(!line.trim())continue;
    if(/^[CD]/u.test(source.label)&&line.length>=12&&line.length<=160){quotes.push(line);continue;}
    const sentences=line.match(/.*?[.!?。！？](?=\s|$)|.+$/gu)||[];
    for(const sentence of sentences){const q=sentence.trim();if(q.length>=12&&q.length<=160&&source.text.includes(q)&&(/^[CD]/u.test(source.label)||/[.!?。！？]$/u.test(q)))quotes.push(q);}
  }
  return [...new Set(quotes)].slice(0,16);
}
export function createWllamaProvider(engine,{recreate=null,onOutcome=null}={}) {
  if(!engine||typeof engine.createChatCompletion!=='function'||typeof engine.exit!=='function')throw Error('LOCAL_ENGINE_INVALID');
  if(recreate!==null&&typeof recreate!=='function'||onOutcome!==null&&typeof onOutcome!=='function')throw Error('LOCAL_ENGINE_INVALID');
  let current=engine,disposed=false,busy=false,lastMeasurement=null,cancelActive=null,idle=Promise.resolve(),epoch=1,forcedStops=0,cleanupFailed=false,disposal=null;
  const exits=new WeakMap();
  function close(value){
    if(!value)return Promise.resolve();
    if(current===value)current=null;
    if(!exits.has(value))exits.set(value,Promise.resolve().then(()=>value.exit()).catch(()=>{cleanupFailed=true;throw Error('LOCAL_CLEANUP_FAILED');}));
    return exits.get(value);
  }
  return Object.freeze({kind:'local',transport:'in-process',modelId:LOCAL_MODEL.id,
    async generate({messages,evidencePacket,allowedCitations,signal,onProgress}){
      if(disposed||busy||cleanupFailed||signal?.aborted)throw Error('LOCAL_ENGINE_UNAVAILABLE');
      busy=true;lastMeasurement=null;const meter=createInferenceMeter();let success=false,releaseIdle,aborted=false;
      idle=new Promise(resolve=>releaseIdle=resolve);
      let content='',finish=null,pieces=0,reasoningPieces=0,basisVerified=false;
      let rejectAbort,cancelCleanup=Promise.resolve();const cancellation=new Promise((_,reject)=>rejectAbort=reject);
      cancellation.catch(()=>{}); // A cancelled reload may exit before the inference race is installed.
      // Wllama 3.8.1 polls abortSignal after get_result. exit() terminates its
      // worker immediately; race also settles JS when the terminated worker's
      // pending RPC never resolves. The next request opens the same verified Blob.
      const abort=()=>{if(aborted)return;aborted=true;forcedStops++;cancelCleanup=close(current);cancelCleanup.then(()=>rejectAbort(Error('LOCAL_REQUEST_CANCELLED')),rejectAbort);};
      cancelActive=abort;signal?.addEventListener('abort',abort,{once:true});
      try{
        if(!current){
          if(!recreate)throw Error('LOCAL_ENGINE_UNAVAILABLE');
          // Keep ownership while reloading: do not claim drained until a late
          // loader has returned and its engine has been closed on cancellation.
          current=await recreate();epoch++;
          if(disposed||aborted||signal?.aborted){await close(current);throw Error('LOCAL_REQUEST_CANCELLED');}
        }
        if(signal?.aborted)abort();
        const selected=current;
        const evidence=evidencePacket?.evidence;
        const grounded=Array.isArray(evidence)&&evidence.length>0;
        const diagnosticLabels=allowedCitations.filter(label=>label.startsWith('D'));
        const basisLabels=diagnosticLabels.length?diagnosticLabels:allowedCitations;
        const quoteChoices=grounded?new Map(evidence.filter(s=>basisLabels.includes(s.label)).map(s=>[s.label,evidenceQuoteCandidates(s)])):null;
        // Select the closest literal sentence as retrieval context, not an
        // expected answer. Otherwise a small model picked a nearby no-throw
        // definition for a question about state after a failure.
        if(grounded){
          const query=evidencePacket.topic||evidencePacket.question||'';
          const ranked=[...quoteChoices.entries()].flatMap(([label,quotes])=>rankTutorQuotes(quotes,query).map(q=>({...q,label})));
          ranked.sort((a,b)=>b.score-a.score||a.order-b.order);
          if(ranked[0]?.score>0)for(const label of quoteChoices.keys())quoteChoices.set(label,label===ranked[0].label?[ranked[0].text]:[]);
        }
        const allQuotes=quoteChoices?[...new Set([...quoteChoices.values()].flat())]:[];
        if(grounded&&!allQuotes.length)throw Error('LOCAL_EVIDENCE_INSUFFICIENT');
        const quoteLabels=quoteChoices?[...quoteChoices.entries()].filter(([,q])=>q.length).map(([label])=>label):basisLabels;
        const properties={...(grounded?{basis:{type:'object',properties:{label:{type:'string',enum:quoteLabels},quote:{type:'string',enum:allQuotes}},required:['label','quote'],additionalProperties:false}}:{}),answer:{type:'string'},citations:{type:'array',items:{type:'string',enum:allowedCitations}}};
        const started=performance.now();
        // Сырые фрагменты/рассуждения не выводятся: наружу только числовой прогресс.
        // Итоговый текст появляется лишь после полного JSON и проверки цитат сессией.
        await Promise.race([selected.createChatCompletion({messages,abortSignal:signal,stream:true,cache_prompt:false,max_tokens:192,
          temperature:0.2,seed:42,chat_template_kwargs:{enable_thinking:false},return_progress:true,timings_per_token:true,
          response_format:{type:'json_schema',json_schema:{name:'nexus_tutor_answer',strict:true,schema:{type:'object',properties,required:Object.keys(properties),additionalProperties:false}}},
          onData(chunk){
            if(disposed||aborted||signal?.aborted||current!==selected)return;
            meter.observe(chunk);const choice=chunk?.choices?.[0],delta=choice?.delta;
            if(delta?.tool_calls?.length)throw Error('LOCAL_ANSWER_INVALID');
            if(typeof delta?.reasoning_content==='string'&&delta.reasoning_content)reasoningPieces++;
            if(typeof delta?.content==='string'){content+=delta.content;if(delta.content)pieces++;}
            if(content.length>10000)throw Error('LOCAL_ANSWER_INVALID');
            if(choice?.finish_reason)finish=choice.finish_reason;
            const p=chunk?.prompt_progress;
            try{onProgress?.(Object.freeze({phase:pieces?'generation':'prompt',elapsedMs:Math.round(performance.now()-started),pieces,reasoningPieces,
              processed:Number.isSafeInteger(p?.processed)?p.processed:0,total:Number.isSafeInteger(p?.total)?p.total:0,metrics:meter.snapshot()}));}catch{}
          }}),cancellation]);
        if(disposed||aborted||signal?.aborted)throw Error('LOCAL_ENGINE_UNAVAILABLE');
        if(finish!=='stop'||!content||reasoningPieces)throw Error('LOCAL_ANSWER_INVALID');
        const response=JSON.parse(content);
        if(grounded){
          const basis=response.basis,source=evidence.find(s=>s.label===basis?.label);
          if(!basis||!basisLabels.includes(basis.label)||!quoteChoices.get(basis.label)?.includes(basis.quote)||!source?.text.includes(basis.quote)||!response.citations?.includes(basis.label))throw Error('LOCAL_GROUNDING_INVALID');
          basisVerified=true;delete response.basis;
        }
        success=true;return response;
      }finally{signal?.removeEventListener('abort',abort);cancelActive=null;try{if(aborted)await cancelCleanup;}finally{lastMeasurement=Object.freeze({...meter.finish(success?'complete':aborted||signal?.aborted?'cancelled':'error'),engineEpoch:epoch,forcedStops,cancelStrategy:aborted?'terminate-runtime-worker':null});try{onOutcome?.(Object.freeze({status:lastMeasurement.status,rawContent:!reasoningPieces&&content?content:null,finishReason:finish,basisVerified,reasoningRedacted:reasoningPieces>0}));}catch{}busy=false;releaseIdle();}}
    },
    measurements(){return lastMeasurement;},
    lifecycle(){return Object.freeze({resident:!!current,busy,epoch,forcedStops,cleanupFailed,disposed});},
    dispose(){if(disposal)return disposal;disposed=true;cancelActive?.();disposal=(async()=>{await idle;await close(current);})();return disposal;}
  });
}
export async function loadLocalModel(file,{signal,profile='local-cpu',loadRuntime=()=>import('./runtime/index.js'),onOutcome=null}={}) {
  checkSignal(signal);const loadOptions=localLoadOptions(profile);
  if(!(file instanceof Blob)||file.size<1024||file.size>LOCAL_MODEL.maxBytes)throw Error('LOCAL_FILE_REJECTED');
  signal?.throwIfAborted();
  if(profile==='local-webgpu'&&await probeWebGPU({signal})!=='available')throw Error('LOCAL_GPU_UNAVAILABLE');
  const hash=await crypto.subtle.digest('SHA-256',await file.arrayBuffer());signal?.throwIfAborted();
  if([...new Uint8Array(hash)].map(b=>b.toString(16).padStart(2,'0')).join('')!==LOCAL_MODEL.sha256)throw Error('LOCAL_FILE_REJECTED');
  const {Wllama}=await loadRuntime();signal?.throwIfAborted();
  async function openEngine(initialSignal){
    initialSignal?.throwIfAborted();
    const engine=new Wllama({default:new URL('./runtime/wasm/wllama.wasm',import.meta.url).href},{logger:{debug(){},log(){},warn(){},error(){}},suppressNativeLog:true});
    try{
    // Запрещён скрытый CDN fallback runtime. Неподдерживаемый браузер получает отказ.
    engine.setCompat(null);
    // n_parallel:1, jinja:true, reasoning_budget_tokens:0 заданы фиксированным профилем.
    // Не меняем COOP/COEP. Запрос WebGPU не считается доказательством offload/скорости.
    if(profile==='local-webgpu'&&engine.isSupportWebGPU?.()!==true)throw Error('LOCAL_GPU_UNAVAILABLE');
    await engine.loadModel([file],loadOptions);
      initialSignal?.throwIfAborted();return engine;
    }catch(error){await engine.exit().catch(()=>{});throw Error('LOCAL_MODEL_UNAVAILABLE');}
  }
  const engine=await openEngine(signal);
  return createWllamaProvider(engine,{recreate:()=>openEngine(),onOutcome});
}
