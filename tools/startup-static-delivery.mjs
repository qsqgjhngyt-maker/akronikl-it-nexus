// Fixed public assets only. HTML, Account/API routes and cookies stay with the BFF.
export function startupStaticFiles(manifest){
 const g=manifest.generation;if(!/^ui1a-p4q-[a-z0-9-]+$/.test(g))throw Error('STATIC_GENERATION_INVALID');
 const prefix='/releases/'+g+'/',paths=[prefix+'core/startup-intro.js',prefix+'core/startup-intro-early.js',prefix+'styles/startup-intro.css',...['desktop-start.jpg','mobile-start.jpg','desktop.jpg','mobile.jpg'].map(n=>prefix+'intro-media/cinematic-v6/'+n),'/entry-assets/'+g+'/entry.js','/entry-assets/'+g+'/entry.css',prefix+'assets/brand-mark.svg'];
 return paths.map(route=>{const rows=manifest.files.filter(r=>r.path===route);if(rows.length!==1)throw Error('STATIC_ASSET_MISSING');const r=rows[0],ext=route.split('.').at(-1);if(!/^[a-f0-9]{64}$/.test(r.sha256)||!Number.isSafeInteger(r.bytes)||r.bytes<=0||r.bytes>2400000)throw Error('STATIC_ASSET_INVALID');return{route,file:route.slice(1),object:'startup-public/'+r.sha256+'.'+ext,sha256:r.sha256,bytes:r.bytes,mime:{js:'text/javascript',css:'text/css',jpg:'image/jpeg',svg:'image/svg+xml'}[ext]};});
}
export function addStartupObjectRoutes(spec,manifest,bucket){
 if(!/^[a-z0-9-]+$/.test(bucket)||spec['x-yc-apigateway']?.service_account_id)throw Error('STATIC_SCOPE_INVALID');
 const target=structuredClone(spec);for(const [i,r]of startupStaticFiles(manifest).entries()){
  if(target.paths[r.route])throw Error('STATIC_ROUTE_EXISTS');
  target.paths[r.route]=Object.fromEntries(['get','head'].map(method=>[method,{operationId:'p4q_startup_static_'+i+'_'+method,responses:{200:{description:'Неизменяемый публичный ресурс заставки'}},'x-yc-apigateway-integration':{type:'object_storage',bucket,object:r.object}}]));
 }return target;
}
