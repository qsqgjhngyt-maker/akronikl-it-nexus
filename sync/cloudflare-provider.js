import {assertSyncProvider} from './provider-contract.js';

const trimBase=value=>String(value||'').trim().replace(/\/+$/,'');
async function readJson(response){const text=await response.text();try{return text?JSON.parse(text):{}}catch{return{raw:text}}}

export function createCloudflareSyncProvider({baseUrl='',tokenProvider=null}={}){
  const endpoint=trimBase(baseUrl);
  const headers=async()=>{
    const token=typeof tokenProvider==='function'?await tokenProvider():null;
    return{'content-type':'application/json',...(token?{authorization:`Bearer ${token}`}:{})};
  };
  const request=async(path,options={})=>{
    if(!endpoint)throw new Error('Nexus Cloudflare Sync endpoint is not configured.');
    const response=await fetch(endpoint+path,{...options,headers:{...(await headers()),...(options.headers||{})}});
    const body=await readJson(response);
    if(!response.ok){const error=new Error(body?.error?.message||body?.message||`Sync HTTP ${response.status}`);error.status=response.status;error.payload=body;throw error}
    return body;
  };
  return assertSyncProvider({
    id:'cloudflare',configured:Boolean(endpoint),supportsTeam:true,supportsAudit:true,supportsSnapshots:true,
    async status(){if(!endpoint)return{configured:false,online:false};return request('/api/v1/health')},
    async pullProject(projectId){return request(`/api/v1/projects/${encodeURIComponent(projectId)}`)},
    async pushProject(project,{baseRevision=null}={}){return request(`/api/v1/projects/${encodeURIComponent(project.id)}`,{method:'PUT',body:JSON.stringify({project,baseRevision})})},
    async listProjects(){return request('/api/v1/projects')},
    async audit(projectId){return request(`/api/v1/projects/${encodeURIComponent(projectId)}/audit`)}
  });
}
