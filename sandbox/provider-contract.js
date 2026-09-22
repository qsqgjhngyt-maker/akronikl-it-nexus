export const RUNTIME_SUPPORT=Object.freeze({
  GUARANTEED:'guaranteed',
  BEST_EFFORT:'best-effort',
  UNSUPPORTED:'unsupported'
});

export const RUNTIME_AVAILABILITY=Object.freeze({
  READY:'ready',
  UNAVAILABLE:'unavailable',
  PLANNED:'planned'
});

const asArray=value=>Array.isArray(value)?value:[];
const normalizeFileMap=value=>{
  if(!value||typeof value!=='object')return null;
  const out={};
  for(const [name,content] of Object.entries(value)){
    const safe=String(name||'').trim().replace(/\\/g,'/').replace(/^\/+/, '');
    if(!safe||safe.includes('../'))continue;
    if(typeof content==='string'||content instanceof Uint8Array)out[safe]=content;
  }
  return Object.keys(out).length?out:null;
};

export function normalizeRuntimeRequest(input={},stdin=''){
  if(typeof input==='string'){
    return{languageId:'cpp',source:input,stdin:String(stdin??''),files:null,entryFile:'main.cpp',metadata:{}};
  }
  const request=input&&typeof input==='object'?input:{};
  const languageId=String(request.languageId||request.language||'cpp').toLowerCase();
  const fallbackEntry=languageId==='c'?'main.c':'main.cpp';
  const metadata=request.metadata&&typeof request.metadata==='object'?request.metadata:{};
  return{
    languageId,
    source:String(request.source??''),
    stdin:String(request.stdin??''),
    files:normalizeFileMap(request.files),
    entryFile:String(request.entryFile||metadata.entryFile||fallbackEntry).replace(/\\/g,'/').replace(/^\/+/, '')||fallbackEntry,
    metadata
  };
}

export function runtimeFileEntries(input={}){
  const request=normalizeRuntimeRequest(input);
  const files=request.files?{...request.files}:{};
  if(request.source!==''||!Object.prototype.hasOwnProperty.call(files,request.entryFile))files[request.entryFile]=request.source;
  return Object.entries(files);
}

export function runtimeProjectSource(input={}){
  return runtimeFileEntries(input).map(([path,content])=>`// --- ${path} ---\n${String(content??'')}`).join('\n');
}

export function runtimeProjectFileCount(input={}){
  return runtimeFileEntries(input).length;
}

export function normalizeProviderAssessment(value={}){
  const support=Object.values(RUNTIME_SUPPORT).includes(value?.support)
    ?value.support
    :(value?.confidence==='guaranteed'?RUNTIME_SUPPORT.GUARANTEED:value?.confidence==='best-effort'?RUNTIME_SUPPORT.BEST_EFFORT:RUNTIME_SUPPORT.UNSUPPORTED);
  return{
    support,
    confidence:support,
    features:asArray(value?.features),
    bestEffort:asArray(value?.bestEffort),
    reasons:asArray(value?.reasons),
    requires:asArray(value?.requires),
    scoreHint:Number.isFinite(value?.scoreHint)?value.scoreHint:0
  };
}

export function providerSupportsLanguage(provider,languageId){
  const languages=asArray(provider?.languages);
  return languages.includes('*')||languages.includes(String(languageId||'').toLowerCase());
}

export function validateRuntimeProvider(provider){
  if(!provider||typeof provider!=='object')throw new Error('Runtime provider must be an object.');
  for(const key of ['id','label','tier'])if(!provider[key])throw new Error(`Runtime provider is missing ${key}.`);
  if(!Array.isArray(provider.languages)||provider.languages.length===0)throw new Error(`Runtime provider ${provider.id} must declare languages[].`);
  if(typeof provider.available!=='function')throw new Error(`Runtime provider ${provider.id} must implement available(request).`);
  if(typeof provider.inspect!=='function')throw new Error(`Runtime provider ${provider.id} must implement inspect(request).`);
  if(typeof provider.run!=='function')throw new Error(`Runtime provider ${provider.id} must implement run(request).`);
  return provider;
}

export function runtimeResult(provider,result={},extra={}){
  return{
    stdout:String(result?.stdout??''),
    stderr:String(result?.stderr??''),
    exitCode:result?.exitCode,
    elapsedMs:Number.isFinite(result?.elapsedMs)?result.elapsedMs:0,
    provider,
    ...extra
  };
}
