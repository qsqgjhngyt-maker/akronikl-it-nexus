import legacy from './legacy-sync.js';
import {publicContent} from './content-service.mjs';
import {handleAdminService} from './admin-service.mjs';
import {handlePasskeyService} from './passkey-service.mjs';
import {handleOAuthService} from './oauth-service.mjs';
import {handleCloudSessionRequest} from './cloud-session-service.mjs';
import {handleAkroniklService} from './akronikl-service.mjs';
import {handleFeedbackRequest} from './feedback-service.js';
import {verifyAccountServiceRequest} from './account-service-auth.js';
import {readEligibleAccountFoundation} from './account-foundation.js';
import {touchEligibleAccountSession} from './session-activity.mjs';
const reply=(status,code)=>Response.json({error:{code}},{status,headers:{'cache-control':'no-store','vary':'*'}});
export default {async fetch(request,env,context){
 const path=new URL(request.url).pathname;
 if(path==='/api/v2/akronikl/internal')return handleAkroniklService(request,env);
 if(path.startsWith('/api/v2/akronikl/'))return reply(404,'NOT_FOUND');
 if(path==='/api/v2/content/feed')return publicContent(request,env);
 if(path==='/api/v2/account/internal/control')return handleAdminService(request,env);
 if(path.startsWith('/api/v2/account/control')||path.startsWith('/api/v2/account/profile'))return reply(404,'NOT_FOUND');
 if(path==='/api/v2/cloud/internal')return handleCloudSessionRequest(request,env,context);
 if(path.startsWith('/api/v2/cloud/'))return reply(404,'NOT_FOUND');
 if(path==='/api/v2/account/internal/oauth')return handleOAuthService(request,env);
 if(path.startsWith('/api/v2/account/oauth/'))return reply(404,'NOT_FOUND');
 if(path==='/api/v2/account/internal/passkey')return handlePasskeyService(request,env);
 if(path.startsWith('/api/v2/account/passkey/'))return reply(404,'NOT_FOUND');
 if(path.startsWith('/api/v2/feedback/'))return handleFeedbackRequest(request,env);
 if(path==='/api/v2/account/internal/read'){
  if(env.ACCOUNT_FOUNDATION_ENABLED!=='true')return reply(404,'NOT_FOUND');
  try{
   const proof=await verifyAccountServiceRequest(request,env);
   if(!proof.ok)return reply(proof.status,proof.code);
   const foundation=await readEligibleAccountFoundation(env.DB,proof.sessionHash,undefined,env);
   if(!foundation||await touchEligibleAccountSession(env.DB,proof.sessionHash,undefined,env)!==foundation.account.accountId)return reply(401,'ACCOUNT_SESSION_REJECTED');
   return Response.json(proof.path==='/api/v2/account'?foundation:{loginMethods:foundation.loginMethods,enrollmentAvailable:false},{headers:{'cache-control':'no-store','vary':'*'}});
  }catch{return reply(503,'ACCOUNT_FOUNDATION_UNAVAILABLE')}
 }
 if(path==='/api/v2/account'||path==='/api/v2/account/login-methods')return reply(404,'NOT_FOUND');
 return legacy.fetch(request,env,context);
}};
