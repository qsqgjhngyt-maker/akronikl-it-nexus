import legacy from './legacy-sync.js';
import {handlePasskeyService} from './passkey-service.mjs';
import {handleFeedbackRequest} from './feedback-service.js';
import {verifyAccountServiceRequest} from './account-service-auth.js';
import {readEligibleAccountFoundation} from './account-foundation.js';
const reply=(status,code)=>Response.json({error:{code}},{status,headers:{'cache-control':'no-store','vary':'*'}});
export default {async fetch(request,env,context){
 const path=new URL(request.url).pathname;
 if(path==='/api/v2/account/internal/passkey')return handlePasskeyService(request,env);
 if(path.startsWith('/api/v2/account/passkey/'))return reply(404,'NOT_FOUND');
 if(path.startsWith('/api/v2/feedback/'))return handleFeedbackRequest(request,env);
 if(path==='/api/v2/account/internal/read'){
  if(env.ACCOUNT_FOUNDATION_ENABLED!=='true')return reply(404,'NOT_FOUND');
  try{
   const proof=await verifyAccountServiceRequest(request,env);
   if(!proof.ok)return reply(proof.status,proof.code);
   const foundation=await readEligibleAccountFoundation(env.DB,proof.sessionHash);
   if(!foundation)return reply(401,'ACCOUNT_SESSION_REJECTED');
   return Response.json(proof.path==='/api/v2/account'?foundation:{loginMethods:foundation.loginMethods,enrollmentAvailable:false},{headers:{'cache-control':'no-store','vary':'*'}});
  }catch{return reply(503,'ACCOUNT_FOUNDATION_UNAVAILABLE')}
 }
 if(path==='/api/v2/account'||path==='/api/v2/account/login-methods')return reply(404,'NOT_FOUND');
 return legacy.fetch(request,env,context);
}};
