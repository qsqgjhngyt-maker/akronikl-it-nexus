import {normalizeProviderAssessment,normalizeRuntimeRequest,providerSupportsLanguage,RUNTIME_SUPPORT,validateRuntimeProvider} from './provider-contract.js';

const SUPPORT_SCORE={
  [RUNTIME_SUPPORT.GUARANTEED]:300,
  [RUNTIME_SUPPORT.BEST_EFFORT]:170,
  [RUNTIME_SUPPORT.UNSUPPORTED]:-100000
};
const TIER_SCORE={browser:30,wasm:20,cloud:10};

function score(provider,assessment){
  return(SUPPORT_SCORE[assessment.support]??-100000)+(TIER_SCORE[provider.tier]??0)+(assessment.scoreHint||0)+(Number(provider.priority)||0);
}

export class NexusRuntimeRouter{
  constructor(providers=[]){
    this.providers=providers.map(validateRuntimeProvider);
  }

  inspect(input){
    const request=normalizeRuntimeRequest(input);
    return this.providers.map(provider=>{
      if(!providerSupportsLanguage(provider,request.languageId))return{provider,assessment:normalizeProviderAssessment({support:'unsupported',reasons:['language-not-supported']}),score:-100000};
      const raw=provider.inspect(request);
      const assessment=normalizeProviderAssessment(raw);
      return{provider,assessment,score:score(provider,assessment)};
    }).sort((a,b)=>b.score-a.score);
  }

  async route(input){
    const request=normalizeRuntimeRequest(input);
    const inspected=this.inspect(request);
    const compatible=inspected.filter(item=>item.assessment.support!==RUNTIME_SUPPORT.UNSUPPORTED);
    if(!compatible.length)throw new Error(`Nexus Runtime Router: no provider supports language ${request.languageId}.`);

    const availability=[];
    for(const item of compatible){
      let ready=false;
      try{ready=await item.provider.available(request)}catch{ready=false}
      availability.push({...item,ready:Boolean(ready)});
    }
    const ready=availability.filter(item=>item.ready).sort((a,b)=>b.score-a.score);
    if(!ready.length){
      const err=new Error(`Nexus Runtime Router: compatible providers for ${request.languageId} are not available.`);
      err.anxRuntimeRoute={request,candidates:availability};
      throw err;
    }

    const selected=ready[0];
    const preferred=availability[0];
    const preferredUnavailable=preferred&&!preferred.ready&&preferred.score>selected.score?preferred:null;
    const reason=preferredUnavailable
      ?'preferred-provider-unavailable-fallback'
      :(selected.assessment.support===RUNTIME_SUPPORT.BEST_EFFORT?'best-effort-fallback':'best-supported-ready-provider');
    return{
      request,
      provider:selected.provider,
      assessment:selected.assessment,
      reason,
      preferredUnavailable,
      candidates:availability
    };
  }
}
