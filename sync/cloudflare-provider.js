import {assertSyncProvider} from './provider-contract.js';

const trimBase=value=>String(value||'').trim().replace(/\/+$/,'');
async function readJson(response){const text=await response.text();try{return text?JSON.parse(text):{}}catch{return{raw:text}}}

export function createCloudflareSyncProvider({baseUrl='',tokenProvider=null}={}){
  const endpoint=trimBase(baseUrl);
  const token=async()=>typeof tokenProvider==='function'?await tokenProvider():null;
  const request=async(path,options={})=>{
    if(!endpoint)throw new Error('Nexus Cloudflare Sync endpoint is not configured.');
    const bearer=options.skipAuth?null:await token();
    const response=await fetch(endpoint+path,{...options,headers:{'content-type':'application/json',...(bearer?{authorization:`Bearer ${bearer}`}:{'authorization':''}),...(options.headers||{})}});
    const body=await readJson(response);
    if(!response.ok){const error=new Error(body?.error?.message||body?.message||`Sync HTTP ${response.status}`);error.status=response.status;error.payload=body;throw error}
    return body;
  };
  return assertSyncProvider({
    id:'cloudflare',configured:Boolean(endpoint),supportsTeam:true,supportsAudit:true,supportsSnapshots:true,
    async status(){if(!endpoint)return{configured:false,online:false};return request('/api/v1/health',{skipAuth:true})},
    async bootstrap({bootstrapSecret,displayName}={}){return request('/api/v1/bootstrap',{method:'POST',skipAuth:true,headers:{'x-nexus-bootstrap-secret':String(bootstrapSecret||'')},body:JSON.stringify({displayName})})},
    async me(){return request('/api/v1/me')},
    async pullProject(projectId){return request(`/api/v1/projects/${encodeURIComponent(projectId)}`)},
    async pushProject(project,{baseRevision=null}={}){return request(`/api/v1/projects/${encodeURIComponent(project.id)}`,{method:'PUT',body:JSON.stringify({project,baseRevision})})},
    async listProjects(){return request('/api/v1/projects')},
    async audit(projectId){return request(`/api/v1/projects/${encodeURIComponent(projectId)}/audit`)}
  });
}
