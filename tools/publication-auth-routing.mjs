// Chromium Fetch interception is deliberately below Playwright context.route:
// it intercepts every redirect hop, including real IdP -> Nexus callbacks.
export async function installCandidateRouting(context,page,{origin,target,token,marker,onResponse=()=>{},onFailure=()=>{}}){
 const cdp=await context.newCDPSession(page);let failed=false;
 const abort=async(requestId,reason)=>{failed=true;onFailure(reason);await cdp.send('Fetch.failRequest',{requestId,errorReason:'BlockedByClient'}).catch(()=>{});};
 cdp.on('Fetch.requestPaused',async event=>{
  const id=event.requestId;
  try{
   const url=new URL(event.request.url);if(url.origin!==origin){await cdp.send('Fetch.continueRequest',{requestId:id});return;}
   // Browser decoration is unnecessary in QA and may be rejected by Chromium ORB.
   if(url.pathname==='/favicon.ico'){await cdp.send('Fetch.failRequest',{requestId:id,errorReason:'Aborted'});return;}
   const headers=Object.fromEntries(Object.entries(event.request.headers).filter(([k])=>!['host','authorization','content-length'].includes(k.toLowerCase())).map(([name,value])=>[name.toLowerCase(),String(value)]));
   headers.authorization='Bearer '+token;headers.cookie??='';
   let body;
   if(event.request.postDataEntries?.every(p=>typeof p.bytes==='string'))body=Buffer.concat(event.request.postDataEntries.map(p=>Buffer.from(p.bytes,'base64')));
   else if(event.request.postData!==undefined)body=Buffer.from(event.request.postData,'utf8');
   else if(event.request.hasPostData)body=Buffer.from((await cdp.send('Network.getRequestPostData',{requestId:event.networkId})).postData,'utf8');
   if(body?.length>65536)throw Error('QA_BODY_LIMIT');
   // Fulfill at the ORIGINAL URL: unlike URL rewriting, this preserves __Host
   // cookies on the Nexus hostname. The API client's own cookie jar is overridden.
   const response=await context.request.fetch(target+url.pathname+url.search,{method:event.request.method,headers,data:body,maxRedirects:0,failOnStatusCode:false,timeout:35000});
   const responseHeaders=response.headersArray();
   if(responseHeaders.find(h=>h.name.toLowerCase()==='x-nexus-auth-candidate')?.value!==marker)return abort(id,'CANDIDATE_MARKER_MISSING');
   const data=await response.body();if(data.length>64*1024*1024)throw Error('QA_RESPONSE_LIMIT');
   const forwarded=responseHeaders.filter(h=>!['content-encoding','content-length','transfer-encoding','connection'].includes(h.name.toLowerCase()));forwarded.push({name:'content-length',value:String(data.length)});
   await cdp.send('Fetch.fulfillRequest',{requestId:id,responseCode:response.status(),responseHeaders:forwarded,body:data.toString('base64')});
   onResponse({path:url.pathname,status:response.status()});await response.dispose();
  }catch{await abort(id,'PRIVATE_CANDIDATE_REQUEST_FAILED');}
 });
 await cdp.send('Fetch.enable',{patterns:[{urlPattern:'*',requestStage:'Request'}]});
 return {hasFailed:()=>failed,close:()=>cdp.detach()};
}
