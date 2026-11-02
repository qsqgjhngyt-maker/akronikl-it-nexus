// Never log/serialize a Playwright Error: it can contain private request headers.
export async function deliverCheckedRoot(route,{bytes,onFault=()=>{}}){
 let response;
 try{
  response=await route.fetch({maxRedirects:0,maxRetries:2,timeout:15000});
  if(response.status()!==200){await route.fulfill({response});return{outcome:'REAL_SERVER_REFUSAL',status:response.status()};}
  await route.fulfill({response,body:bytes});return{outcome:'PINNED_STATIC_DELIVERED'};
 }catch{
  try{await onFault({code:'ROOT_NETWORK_OR_DELIVERY_FAILED',detailsRedacted:true});}catch{}
  try{await route.abort('failed');}catch{}
  return{outcome:'NETWORK_REFUSED',detailsRedacted:true};
 }finally{try{await response?.dispose();}catch{}}
}
