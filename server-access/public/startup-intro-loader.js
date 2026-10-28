// Публичный UI: нет credentials, cookie, auth решений или ожидания видео.
export function startPublicIntro(){
 requestAnimationFrame(()=>setTimeout(()=>{
  void fetch('/startup-intro.json',{cache:'no-store',credentials:'omit',redirect:'error'})
   .then(async response=>{
    if(!response.ok||!response.headers.get('content-type')?.startsWith('application/json'))return;
    const text=await response.text();if(text.length>1024)return;const value=JSON.parse(text);
    if(value?.schema!==1||!/^\/releases\/ui1a-[a-z0-9-]+\/core\/startup-intro\.js$/.test(value.module))return;
    const module=await import(value.module);return module.installStartupIntro({surface:'entry'});
   }).catch(()=>{});
 },0));
}
