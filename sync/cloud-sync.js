import {withProjectWriter} from '../project-studio/project-writer.js';
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
import {serverCloudSessionAvailable,serverCloudRequest} from './server-cloud-client.js';
import {verifiedAccount} from '../core/account-storage.js';

const now=()=>new Date().toISOString();
const trimBase=value=>String(value||'').trim().replace(/\/+$/,'');

function providerFrom(config=loadCloudflareSyncConfig()){
  if(verifiedAccount()&&!serverCloudSessionAvailable())throw Error('SERVER_SESSION_REQUIRED');
  return createCloudflareSyncProvider({
    baseUrl:config.baseUrl,
    authenticatedRequest:serverCloudSessionAvailable()?serverCloudRequest:identityV2AuthenticatedRequest
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
  if(verifiedAccount()&&!serverCloudSessionAvailable())return{mode:'none',rollbackAvailable:false};
  if(serverCloudSessionAvailable())return{mode:'nexus-cookie',rollbackAvailable:false};
  return identityV2CredentialState();
}

export async function cloudHealth(baseUrl=null){
  if(verifiedAccount()&&!serverCloudSessionAvailable())throw Error('SERVER_SESSION_REQUIRED');
  if(serverCloudSessionAvailable()){await serverCloudRequest('/api/v1/me');return{configured:true,online:true}}
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
  if(verifiedAccount())throw Error('В Nexus Cloud используется текущий вход. Отдельный bootstrap не требуется.');
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
  if(verifiedAccount())throw Error('В Nexus Cloud используется текущий аккаунт Nexus. Смените аккаунт через выход.');
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
  if(verifiedAccount())throw Error('Для смены аккаунта используйте выход из Nexus.');
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

export async function enableProjectCloud(projectId){return withProjectWriter(()=>enableProjectCloudWithWriter(projectId))}
async function enableProjectCloudWithWriter(projectId){
  const cfg=loadCloudflareSyncConfig();
  if(!cloudflareSyncConfigured())throw new Error('Connect Nexus Cloud first.');

  const current=getProject(projectId),identity=loadLocalIdentity();
  if(!current)throw Error('Проект не найден.');
  if(current.access?.ownerId!==cfg.subjectId&&current.access?.workspaceKind!=='team'){
    // Явная команда подключения собственного локального проекта, а не перенос при входе.
    if(current.access?.ownerId!==identity.localPrincipalId||current.access?.workspaceId!==identity.personalWorkspaceId||current.sync?.mode==='cloud')throw Error('Этот проект принадлежит другому аккаунту. Автоматический перенос запрещён.');
    linkProjectOwnerToAccount(projectId,cfg.subjectId);
  }
  updateProjectSyncState(projectId,{
    mode:'cloud',
    provider:'cloudflare',
    status:'pending',
    conflict:null
  });

  return pushProjectNow(projectId);
}

export async function pushProjectNow(projectId){return withProjectWriter(()=>pushProjectNowWithWriter(projectId))}
async function pushProjectNowWithWriter(projectId){
  if(!cloudflareSyncConfigured())throw new Error('Cloudflare Sync is not configured.');

  let project=getProject(projectId);
  if(!project)throw new Error(`Project not found: ${projectId}`);

  const cfg=loadCloudflareSyncConfig();

  if(
    project.access?.ownerId!==cfg.subjectId &&
    project.access?.workspaceKind!=='team'
  ){
    throw Error('Владелец проекта не совпадает с текущим аккаунтом. Подключите свой локальный проект к облаку явно.');
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
      status:getProject(projectId)?.sync?.localRevision===project.sync.localRevision?'synced':'pending',
      serverRevision:result.revision,
      baseServerRevision:result.revision,
      lastSyncedAt:result.updatedAt||now(),
      conflict:null
    });

    if(getProject(projectId)?.sync?.status==='synced')clearQueuedProjectSync(projectId);

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
    if(error?.code==='ACCOUNT_SESSION_CHANGED'||!verifiedAccount())throw error;
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

export async function pullProjectNow(projectId){return withProjectWriter(()=>pullProjectNowWithWriter(projectId))}
async function pullProjectNowWithWriter(projectId){
  if(!cloudflareSyncConfigured())throw new Error('Cloudflare Sync is not configured.');

  const cfg=loadCloudflareSyncConfig();
  const before=getProject(projectId)?.sync?.localRevision??null;
  const result=await providerFrom().pullProject(projectId);
  if((getProject(projectId)?.sync?.localRevision??null)!==before)throw Error('LOCAL_PROJECT_CHANGED_DURING_PULL');

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
