// AK-P3: только доверенные профили приложения. Нет произвольных URL и ключей.
export const MODEL_PROFILES = Object.freeze([
  Object.freeze({id:'sources',kind:'none',modelId:null,labelRu:'Без модели — справка и материалы',labelEn:'No model — help and sources',enabled:true}),
  Object.freeze({id:'local-cpu',kind:'local',modelId:'qwen3-0.6b-q8_0',labelRu:'Локальная Qwen3 — процессор',labelEn:'Local Qwen3 — CPU',enabled:true}),
  Object.freeze({id:'local-webgpu',kind:'local',modelId:'qwen3-0.6b-q8_0',labelRu:'Локальная Qwen3 — WebGPU, эксперимент',labelEn:'Local Qwen3 — WebGPU, experimental',enabled:true}),
  Object.freeze({id:'external',kind:'external',modelId:null,labelRu:'Внешний AI — ещё не подключён',labelEn:'External AI — not connected yet',enabled:false})
]);
export const RUNTIME_VERSION = '3.8.1';
export function modelProfile(id) {
  const p=MODEL_PROFILES.find(item=>item.id===id);
  if(!p) throw Error('MODEL_PROFILE_INVALID');
  return p;
}
export function localLoadOptions(id) {
  if(!['local-cpu','local-webgpu'].includes(id))throw Error('MODEL_PROFILE_DENIED');
  return Object.freeze({n_threads:1,n_gpu_layers:id==='local-cpu'?0:99999,n_ctx:4096,n_parallel:1,n_batch:128,n_ubatch:128,
    cache_idle_slots:false,jinja:true,reasoning:id==='local-cpu',reasoning_budget_tokens:id==='local-cpu'?48:0,reasoning_format:'deepseek',
    default_template_kwargs:Object.freeze({enable_thinking:id==='local-cpu'})});
}
