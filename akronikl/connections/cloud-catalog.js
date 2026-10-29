// Public metadata only. No credentials, network, custom URLs or inferred access.
const entry=(id,label,modelId,models,keyUrl,docs)=>Object.freeze({id,label,modelId,models:Object.freeze(models),keyUrl,docs});
export const CLOUD_PROVIDERS=Object.freeze([
 entry('qwen','Qwen / Alibaba','qwen3.7-plus',['qwen3.7-plus','qwen3.7-flash','qwen3.8-flash','qwen3.8-max'],'https://modelstudio.console.alibabacloud.com/','https://www.alibabacloud.com/help/en/model-studio/qwen-structured-output'),
 entry('openai','OpenAI / ChatGPT API','gpt-6-astra',['gpt-6-astra'],'https://platform.openai.com/api-keys','https://developers.openai.com/api/docs/guides/text'),
 entry('anthropic','Claude / Anthropic','claude-sonnet-5-5',['claude-sonnet-5-5','claude-haiku-5-5','claude-opus-5-5'],'https://platform.claude.com/settings/keys','https://platform.claude.com/docs/en/api/messages/create'),
 entry('kimi','Kimi / Moonshot','kimi-k2.6',['kimi-k2.6','kimi-k3'],'https://platform.kimi.ai/','https://www.kimi.ai/help/kimi-api/api-troubleshooting'),
 entry('deepseek','DeepSeek','deepseek-flash',['deepseek-flash','deepseek-v4-pro'],'https://platform.deepseek.com/api_keys','https://api-docs.deepseek.com/'),
 entry('gigachat','GigaChat','GigaChat',['GigaChat'],'https://developers.sber.ru/studio/','https://developers.sber.ru/docs/ru/gigachat/api/reference/rest/gigachat-api'),
 entry('gemini','Gemini / Google','gemini-3.8-flash',['gemini-3.8-flash'],'https://aistudio.google.com/apikey','https://ai.google.dev/api/generate-content'),
 entry('openrouter','OpenRouter','openai/gpt-4o',['openai/gpt-4o'],'https://openrouter.ai/settings/keys','https://openrouter.ai/docs/quickstart')
]);
export function cloudProvider(id){const p=CLOUD_PROVIDERS.find(p=>p.id===id);if(!p)throw Error('CLOUD_PROVIDER_INVALID');return p;}
// Resolve human-entered names before committing the UI choice. Unknown deployment IDs remain exact.
export function cloudModelInput(providerId,value){
 const p=cloudProvider(providerId);if(typeof value!=='string')throw Error('CLOUD_MODEL_INVALID');
 const id=value.trim();return providerId==='qwen'?p.models.find(model=>model.toLowerCase()===id.toLowerCase())??id:id;
}
export function cloudSelection(value={providerId:'qwen',modelId:'qwen3.7-plus',options:{region:'singapore',workspaceId:''}}){
 if(!value||Object.keys(value).some(k=>!['providerId','modelId','options'].includes(k)))throw Error('CLOUD_CONFIG_INVALID');
 cloudProvider(value.providerId);
 if(typeof value.modelId!=='string'||value.modelId.includes('://')||!/^[A-Za-z0-9][A-Za-z0-9._:/-]{0,159}$/u.test(value.modelId))throw Error('CLOUD_MODEL_INVALID');
 const options=value.options??{};if(!options||typeof options!=='object'||Array.isArray(options))throw Error('CLOUD_CONFIG_INVALID');
 const allowed=value.providerId==='qwen'?['region','workspaceId']:value.providerId==='gigachat'?['scope']:value.providerId==='anthropic'?['workspaceId']:[];
 if(Object.keys(options).some(k=>!allowed.includes(k)))throw Error('CLOUD_CONFIG_INVALID');
 const safe={};
 if(value.providerId==='qwen'){
  safe.region=options.region??'singapore';if(!['singapore','beijing','virginia'].includes(safe.region))throw Error('CLOUD_CONFIG_INVALID');
  safe.workspaceId=options.workspaceId??'';if(safe.workspaceId!==''&&!/^ws-[a-z0-9]{6,64}$/u.test(safe.workspaceId))throw Error('CLOUD_CONFIG_INVALID');
 }
 if(value.providerId==='gigachat'){safe.scope=options.scope??'GIGACHAT_API_PERS';if(!['GIGACHAT_API_PERS','GIGACHAT_API_B2B','GIGACHAT_API_CORP'].includes(safe.scope))throw Error('CLOUD_CONFIG_INVALID');}
 if(value.providerId==='anthropic'){safe.workspaceId=options.workspaceId??'';if(safe.workspaceId&&!/^[A-Za-z0-9_-]{1,100}$/u.test(safe.workspaceId))throw Error('CLOUD_CONFIG_INVALID');}
 return Object.freeze({providerId:value.providerId,modelId:value.modelId,options:Object.freeze(safe)});
}
