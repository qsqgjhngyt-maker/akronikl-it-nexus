import {RELEASE_CONTRACTS} from '../core/ui1a-release-contracts.js';
export class FeedbackClientError extends Error{constructor(code,status=0){super(code);this.code=code;this.status=status}}
export async function feedbackApi(path,{method='GET',body,signal}={}){
 if(!path.startsWith('/api/v2/feedback/'))throw new FeedbackClientError('INVALID_PATH');
 if(!RELEASE_CONTRACTS.serverFeedback)throw new FeedbackClientError('FEEDBACK_UNAVAILABLE',503);
 try{
  const response=await fetch(path,{method,credentials:'same-origin',cache:'no-store',redirect:'error',signal,headers:{accept:'application/json',...(method==='GET'?{}:{'content-type':'application/json','x-nexus-feedback-write':'1'})},...(body?{body:JSON.stringify(body)}:{})});
  if(!response.headers.get('content-type')?.startsWith('application/json'))throw new FeedbackClientError('FEEDBACK_UNAVAILABLE',response.status);
  const data=await response.json();if(!response.ok)throw new FeedbackClientError(data?.error?.code||'FEEDBACK_UNAVAILABLE',response.status);return data;
 }catch(error){if(error instanceof FeedbackClientError||error.name==='AbortError')throw error;throw new FeedbackClientError('FEEDBACK_UNAVAILABLE')}
}
