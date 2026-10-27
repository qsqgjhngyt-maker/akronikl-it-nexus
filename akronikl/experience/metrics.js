// Только числовые измерения. Фрагмент SSE не считается токеном.
const number=(o,k)=>{const d=o&&Object.getOwnPropertyDescriptor(o,k);return d&&'value'in d&&typeof d.value==='number'&&Number.isFinite(d.value)&&d.value>=0&&d.value<=1e12?d.value:null;};
export function createInferenceMeter({now=()=>performance.now(),readHeap=()=>globalThis.performance?.memory?.usedJSHeapSize??null}={}){
  const started=now();let firstOutput=null,promptMs=null,decodeMs=null,tokens=null,finished=null,status='running',pieces=0;
  const heap=()=>{try{const v=readHeap();return Number.isSafeInteger(v)&&v>=0?v:null;}catch{return null;}};
  const before=heap();let after=null;
  const snapshot=()=>Object.freeze({status,firstOutputChunkMs:firstOutput,promptMs,decodeMs,completionTokens:tokens,
    tokensPerSecond:tokens!==null&&decodeMs>0?tokens*1000/decodeMs:null,totalMs:finished,
    outputPieces:pieces,jsHeapBeforeBytes:before,jsHeapAfterBytes:after,memoryScope:'page-js-heap-only-not-worker-or-rss'});
  return Object.freeze({
    observe(chunk){if(finished!==null)return;const content=chunk?.choices?.[0]?.delta?.content;if(typeof content==='string'&&content){pieces++;if(firstOutput===null)firstOutput=Math.max(0,now()-started);}
      const timing=Object.getOwnPropertyDescriptor(chunk??{},'timings');const value=timing&&'value'in timing?timing.value:null;
      promptMs=number(value,'prompt_ms')??promptMs;decodeMs=number(value,'predicted_ms')??decodeMs;
      const count=number(value,'predicted_n');if(Number.isSafeInteger(count))tokens=count;
    },
    finish(outcome='complete'){if(finished===null){finished=Math.max(0,now()-started);after=heap();status=['complete','cancelled','error'].includes(outcome)?outcome:'error';}return snapshot();},snapshot
  });
}
