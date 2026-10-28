// Server-only API client. The key is a closure argument; never in client code,
// model messages, exceptions, telemetry, logs or evidence.
export const QWEN_UPSTREAM=Object.freeze({model:'qwen3.7-plus',base:'https://ws-xoczzsb7am4cyl8c.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1/',region:'ap-southeast-1'});
const exact=(o,keys)=>o&&Object.getPrototypeOf(o)===Object.prototype&&Object.keys(o).length===keys.length&&Object.keys(o).every(k=>keys.includes(k));
export function validateCloudRequest(data){
  if(!exact(data,['messages','allowedCitations'])||!Array.isArray(data.messages)||data.messages.length<2||data.messages.length>4||data.messages[0]?.role!=='system'||data.messages.at(-1)?.role!=='user'||JSON.stringify(data.messages).length>10000||data.messages.some((m,i)=>!exact(m,['role','content'])||!['system','user','assistant'].includes(m.role)||i>0&&m.role==='system'||typeof m.content!=='string'||!m.content.trim())||!Array.isArray(data.allowedCitations)||!data.allowedCitations.length||data.allowedCitations.length>5||new Set(data.allowedCitations).size!==data.allowedCitations.length||data.allowedCitations.some(s=>typeof s!=='string'||!/^S[1-3]$|^C1$|^D[12]$/u.test(s)))throw Error('CLOUD_REQUEST_INVALID');
  return data;
}
export function createQwenUpstream({apiKey,fetchUpstream=globalThis.fetch,onOutcome=null,timeoutMs=45000}={}){
  if(typeof apiKey!=='string'||!/^sk-[A-Za-z0-9._~+\/=-]{16,1024}$/u.test(apiKey)||typeof fetchUpstream!=='function'||!Number.isSafeInteger(timeoutMs)||timeoutMs<20||timeoutMs>45000)throw Error('CLOUD_KEY_REQUIRED');
  let busy=false;
  return async function complete(data,{signal}={}){
    validateCloudRequest(data);signal?.throwIfAborted();if(busy)throw Error('CLOUD_BUSY');busy=true;
    const started=performance.now(),controller=new AbortController(),combined=signal?AbortSignal.any([signal,controller.signal]):controller.signal;
    const timer=setTimeout(()=>controller.abort(),timeoutMs);let rawFinal='',reader=null,firstOutputChunkMs=null,finish=null,usage=null,requestId=null,upstreamHttpStatus=null,status='error',reasoningPieces=0;
    try{
      const labels=data.allowedCitations;
      const upstream=await fetchUpstream(new URL('chat/completions',QWEN_UPSTREAM.base),{method:'POST',redirect:'error',cache:'no-store',signal:combined,headers:{Authorization:'Bearer '+apiKey,'Content-Type':'application/json'},body:JSON.stringify({model:QWEN_UPSTREAM.model,messages:data.messages,enable_thinking:false,stream:true,stream_options:{include_usage:true},max_tokens:192,temperature:0.2,response_format:{type:'json_schema',json_schema:{name:'akronikl_tutor_answer',strict:true,schema:{type:'object',properties:{answer:{type:'string'},citations:{type:'array',items:{type:'string',enum:labels},minItems:1,maxItems:labels.length,uniqueItems:true}},required:['answer','citations'],additionalProperties:false}}}})});
      upstreamHttpStatus=upstream.status;
      if(!upstream.ok||upstream.redirected||!upstream.headers.get('content-type')?.startsWith('text/event-stream')||!upstream.body)throw Error('CLOUD_UPSTREAM_UNAVAILABLE');
      reader=upstream.body.getReader();const decoder=new TextDecoder('utf-8',{fatal:true});let pending='',bytes=0,done=false;
      while(!done){
        combined.throwIfAborted();const part=await reader.read();if(part.done)break;bytes+=part.value.byteLength;if(bytes>65536)throw Error('CLOUD_RESPONSE_INVALID');pending+=decoder.decode(part.value,{stream:true});
        const lines=pending.split(/\r?\n/u);pending=lines.pop();
        for(const line of lines){
          if(!line.startsWith('data:'))continue;const value=line.slice(5).trim();if(value==='[DONE]'){done=true;break;}if(!value)continue;
          let chunk;try{chunk=JSON.parse(value);}catch{throw Error('CLOUD_RESPONSE_INVALID');}
          if(chunk.error)throw Error('CLOUD_UPSTREAM_UNAVAILABLE');
          if(typeof chunk.id==='string'&&/^[\w-]{1,160}$/u.test(chunk.id))requestId=chunk.id;
          const choice=chunk.choices?.[0],delta=choice?.delta;
          // Discard internal reasoning even if a provider unexpectedly emits it.
          if(delta?.reasoning_content)reasoningPieces++;
          if(delta?.tool_calls?.length)throw Error('CLOUD_RESPONSE_INVALID');
          if(typeof delta?.content==='string'&&delta.content){firstOutputChunkMs??=performance.now()-started;rawFinal+=delta.content;if(rawFinal.length>10000)throw Error('CLOUD_RESPONSE_INVALID');}
          if(choice?.finish_reason)finish=choice.finish_reason;
          if(chunk.usage){usage={};for(const k of ['prompt_tokens','completion_tokens','total_tokens'])if(Number.isSafeInteger(chunk.usage[k])&&chunk.usage[k]>=0)usage[k]=chunk.usage[k];}
        }
      }
      combined.throwIfAborted();if(!done||finish!=='stop'||/<\/?think(?:ing)?>/iu.test(rawFinal))throw Error('CLOUD_RESPONSE_INVALID');
      let response;try{response=JSON.parse(rawFinal);}catch{throw Error('CLOUD_RESPONSE_INVALID');}
      if(!exact(response,['answer','citations'])||typeof response.answer!=='string'||!response.answer.trim()||response.answer.length>6000||!Array.isArray(response.citations)||!response.citations.length||response.citations.some(c=>!labels.includes(c))||new Set(response.citations).size!==response.citations.length)throw Error('CLOUD_RESPONSE_INVALID');
      status='complete';return {response,rawFinal,measurements:{model:QWEN_UPSTREAM.model,region:QWEN_UPSTREAM.region,firstOutputChunkMs,totalMs:performance.now()-started,usage,requestId,memoryScope:'not-measured-remote',remoteComputeStoppedProven:false}};
    }catch{if(combined.aborted){status='cancelled';throw Error('CLOUD_REQUEST_CANCELLED');}throw Error(upstreamHttpStatus&&!([200,201].includes(upstreamHttpStatus))?'CLOUD_UPSTREAM_HTTP_'+upstreamHttpStatus:'CLOUD_RESPONSE_INVALID');}
    finally{clearTimeout(timer);controller.abort();if(reader){await reader.cancel().catch(()=>{});reader.releaseLock();}busy=false;const tagged=/<\/?think(?:ing)?>/iu.test(rawFinal);try{onOutcome?.({status,rawContent:tagged?null:rawFinal||null,finishReason:finish,reasoningRedacted:reasoningPieces>0||tagged,reasoningPieces,upstreamHttpStatus,requestId,usage,totalMs:performance.now()-started,remoteComputeStoppedProven:false});}catch{}}
  };
}
