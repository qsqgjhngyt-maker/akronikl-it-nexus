import {createCloudflareSyncProvider} from './cloudflare-provider.js';
import {
  loadCloudflareSyncConfig,
  saveCloudflareSyncConfig,
  clearCloudflareSyncConfig,
  cloudflareSyncConfigured
} from './cloudflare-config.js';
import {
  identityV2AuthenticatedRequest,
  identityV2CredentialState,
  clearIdentityV2SessionCredential,
  revokeCurrentIdentityV2Session
} from './identity-v2-client.js';
import {updateLocalIdentity,loadLocalIdentity} from '../core/identity.js';
import {
  getProject,
  linkProjectOwnerToAccount,
  updateProjectSyncState,
  applyCloudProject
} from '../project-studio/project-store.js';
import {appendAuditEvent} from '../collaboration/audit-log.js';
import {clearQueuedProjectSync} from './sync-queue.js';

const now=()=>new Date().toISOString();
const trimBase=value=>String(value||'').trim().replace(/\/+$/,'');

function providerFrom(config=loadCloudflareSyncConfig()){
  return createCloudflareSyncProvider({
    baseUrl:config.baseUrl,
    authenticatedRequest:identityV2AuthenticatedRequest
  });
}

async function retireCurrentServerSession(){
  const state=identityV2CredentialState();
  if(state.mode!=='nexus-session'){
    return{attempted:false,revoked:false,errorCode:null};
  }

  try{
    await revokeCurrentIdentityV2Session();
    return{attempted:true,revoked:true,errorCode:null};
  }catch(error){
    // Account relink/disconnect is a local trust-boundary action.
    // Even if network/server revoke fails, never keep the browser credential.
    clearIdentityV2SessionCredential();
    return{
      attempted:true,
      revoked:false,
      errorCode:String(error?.code||`HTTP_${error?.status||0}`)
    };
  }
}

export function cloudSyncCredentialState(){
  return identityV2CredentialState();
}

export async function cloudHealth(baseUrl=null){
  const cfg=loadCloudflareSyncConfig();
  return createCloudflareSyncProvider({
    baseUrl:trimBase(baseUrl||cfg.baseUrl)
  }).status();
}

export async function bootstrapCloudAccount({
  baseUrl,
  bootstrapSecret,
  displayName='Nexus Owner'
}={}){
  const endpoint=trimBase(baseUrl);
  if(!endpoint)throw new Error('Cloudflare Worker URL is required.');

  const provider=createCloudflareSyncProvider({baseUrl:endpoint});
  const result=await provider.bootstrap({bootstrapSecret,displayName});

  // A session belongs to the account/endpoint that issued it.
  // Retire it before crossing the account trust boundary.
  const previousSessionRetirement=await retireCurrentServerSession();

  const saved=saveCloudflareSyncConfig({
    baseUrl:endpoint,
    token:result.token,
    subjectId:result.subject?.id,
    displayName:result.subject?.displayName,
    connectedAt:now()
  });

  updateLocalIdentity({
    accountSubjectId:saved.subjectId,
    accountState:'cloud-linked'
  });

  return{...result,config:saved,previousSessionRetirement};
}

export async function connectCloudAccount({baseUrl,token}={}){
  const endpoint=trimBase(baseUrl);
  if(!endpoint||!token)throw new Error('Worker URL and Nexus account token are required.');

  const provider=createCloudflareSyncProvider({
    baseUrl:endpoint,
    tokenProvider:()=>String(token).trim()
  });

  await provider.status();
  const who=await provider.me();

  // Successful relink becomes a new trust boundary for this tab.
  // Retire any server session that belongs to the previous account.
  const previousSessionRetirement=await retireCurrentServerSession();

  const saved=saveCloudflareSyncConfig({
    baseUrl:endpoint,
    token:String(token).trim(),
    subjectId:who.subject?.id,
    displayName:who.subject?.displayName,
    connectedAt:now()
  });

  updateLocalIdentity({
    accountSubjectId:saved.subjectId,
    accountState:'cloud-linked'
  });

  return{config:saved,me:who,previousSessionRetirement};
}

export async function disconnectCloudAccount(){
  const sessionResult=await retireCurrentServerSession();

  clearIdentityV2SessionCredential();
  clearCloudflareSyncConfig();

  const current=loadLocalIdentity();
  updateLocalIdentity({
    accountState:current.accountSubjectId?'cloud-unconfigured':'local-only'
  });

  return{
    disconnected:true,
    serverSessionAttempted:sessionResult.attempted,
    serverSessionRevoked:sessionResult.revoked,
    serverSessionErrorCode:sessionResult.errorCode
  };
}

export async function cloudMe(){
  if(!cloudflareSyncConfigured())throw new Error('Cloudflare Sync is not configured.');
  return providerFrom().me();
}

export async function listCloudProjects(){
  if(!cloudflareSyncConfigured())throw new Error('Cloudflare Sync is not configured.');
  return(await providerFrom().listProjects()).projects||[];
}

export async function enableProjectCloud(projectId){
  const cfg=loadCloudflareSyncConfig();
  if(!cloudflareSyncConfigured())throw new Error('Connect Nexus Cloud first.');

  linkProjectOwnerToAccount(projectId,cfg.subjectId);
  updateProjectSyncState(projectId,{
    mode:'cloud',
    provider:'cloudflare',
    status:'pending',
    conflict:null
  });

  return pushProjectNow(projectId);
}

export async function pushProjectNow(projectId){
  if(!cloudflareSyncConfigured())throw new Error('Cloudflare Sync is not configured.');

  let project=getProject(projectId);
  if(!project)throw new Error(`Project not found: ${projectId}`);

  const cfg=loadCloudflareSyncConfig();

  if(
    project.access?.ownerId!==cfg.subjectId &&
    project.access?.workspaceKind!=='team'
  ){
    project=linkProjectOwnerToAccount(projectId,cfg.subjectId);
  }

  updateProjectSyncState(projectId,{
    mode:'cloud',
    provider:'cloudflare',
    status:'syncing',
    conflict:null
  });
  project=getProject(projectId);

  try{
    const result=await providerFrom().pushProject(project,{
      baseRevision:project.sync?.serverRevision??null
    });

    updateProjectSyncState(projectId,{
      mode:'cloud',
      provider:'cloudflare',
      status:'synced',
      serverRevision:result.revision,
      baseServerRevision:result.revision,
      lastSyncedAt:result.updatedAt||now(),
      conflict:null
    });

    clearQueuedProjectSync(projectId);

    appendAuditEvent(projectId,{
      actorId:cfg.subjectId,
      action:'sync.pushed',
      scope:'/',
      revisionBefore:project.sync?.serverRevision??null,
      revisionAfter:result.revision,
      summary:`Cloud revision ${result.revision}`
    });

    return result;
  }catch(error){
    if(Number(error?.status)===409){
      const serverRevision=
        error?.payload?.error?.details?.serverRevision??null;

      updateProjectSyncState(projectId,{
        status:'conflict',
        conflict:{
          type:'revision',
          serverRevision,
          detectedAt:now()
        }
      });
    }else{
      updateProjectSyncState(projectId,{status:'error'});
    }
    throw error;
  }
}

export async function pullProjectNow(projectId){
  if(!cloudflareSyncConfigured())throw new Error('Cloudflare Sync is not configured.');

  const cfg=loadCloudflareSyncConfig();
  const result=await providerFrom().pullProject(projectId);

  if(!result.project)throw new Error('Cloud project snapshot is empty.');

  const saved=applyCloudProject(result.project,{
    serverRevision:Number(result.meta?.revision||0),
    syncedAt:result.meta?.updatedAt||now(),
    provider:'cloudflare'
  });

  clearQueuedProjectSync(projectId);

  appendAuditEvent(projectId,{
    actorId:cfg.subjectId,
    action:'sync.pulled',
    scope:'/',
    revisionAfter:result.meta?.revision??null,
    summary:`Cloud revision ${result.meta?.revision??'—'}`
  });

  return saved;
}

export async function importCloudProject(projectId){
  return pullProjectNow(projectId);
}

export function cloudSyncReady(){
  return cloudflareSyncConfigured();
}
