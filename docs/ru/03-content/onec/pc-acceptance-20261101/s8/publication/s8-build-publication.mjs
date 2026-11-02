// Проверочная публикация: только frontend поверх точного локального production image.
import fs from'node:fs/promises';import path from'node:path';import{execFileSync}from'node:child_process';import{createHash}from'node:crypto';import{createRequire}from'node:module';import{pathToFileURL}from'node:url';
const work=import.meta.dirname,repo=path.join(work,'repo'),dir=path.join(work,'s8-publication-20261101'),baseline=path.join(dir,'baseline-public'),out=path.join(dir,'candidate-overlay-r4'),frontend=path.join(out,'frontend');
const sourceCommit='87944bb1adccfb5d7eb41710e39b9df2282f9b97',base='d8721e06a2b1ac953aa18694c07559c62d388700',productionSource='67368d48a8a2c77a4d7e28e8df4e97450b54c700',generation='ui1a-p4q-onec-candidate-20261101',version='0.1.7-alpha.2.4.6-ui1a.10.11.0-rc.1';
const sha=b=>createHash('sha256').update(b).digest('hex'),need=(v,c)=>{if(!v)throw Error(c)},git=a=>execFileSync('git',a,{cwd:repo,encoding:'utf8',maxBuffer:20000000});
need(git(['rev-parse','HEAD']).trim()===sourceCommit,'PINNED_SOURCE_REQUIRED');
const roots=['core','project-studio','akronikl','styles','pwa','courses','assets','sandbox','feedback','sync','collaboration','effects','locales'];
need(!git(['diff','--name-only',base,productionSource,'--',...roots]).trim(),'PUBLISHED_SOURCE_REQUIRES_THREE_WAY_REVIEW');
const priorBytes=await fs.readFile(path.join(baseline,'PUBLISHED_FILES.json')),prior=JSON.parse(priorBytes),snapshot=JSON.parse(await fs.readFile(path.join(dir,'BASELINE_SNAPSHOT.json')));
need(sha(priorBytes)===snapshot.manifestSha256&&prior.generation==='ui1a-p4q-production-20261030-v21','BASELINE_MANIFEST_DRIFT');
const oldGen=prior.generation,oldVersion=JSON.parse(await fs.readFile(path.join(baseline,'version.json'))).version,prefix='/releases/'+generation+'/',oldPrefix='/releases/'+oldGen+'/',records=new Map(prior.files.map(r=>[r.path,r])),bodies=new Map(),provenance=[];
await fs.mkdir(out,{recursive:false});await fs.mkdir(frontend);
const rewrite=s=>s.replaceAll(oldGen,generation).replaceAll(oldVersion,version),rename=p=>p.replace(oldPrefix,prefix).replace('/entry-assets/'+oldGen+'/','/entry-assets/'+generation+'/');
for(const record of prior.files.filter(r=>r.path.startsWith(oldPrefix)||r.path.startsWith('/entry-assets/'+oldGen+'/'))){const bytes=await fs.readFile(path.join(baseline,record.path));need(bytes.length===record.bytes&&sha(bytes)===record.sha256,'BASELINE_PUBLIC_ASSET_DRIFT');bodies.set(rename(record.path),/\.(?:js|mjs|css|html|json|svg|webmanifest)$/.test(record.path)?Buffer.from(rewrite(bytes.toString('utf8'))):bytes);}
const changed=git(['diff','--name-only','-z','--diff-filter=AM',base,sourceCommit,'--',...roots]).split('\0').filter(Boolean);
const tree=new Map(git(['ls-tree','-rz',sourceCommit]).split('\0').filter(Boolean).map(line=>{const[m,p]=line.split('\t');return[p,m.split(' ')[2]]}));
const nativeMap={};let omittedNativePaths=0;
for(const file of changed){
 const bytes=await fs.readFile(path.join(repo,file)),blob=createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');need(blob===tree.get(file),'SOURCE_FILE_CHANGED');
 const isNative=/^courses\/onec-education\/native\/(service-desk(?:-(?:a2p2|full|advanced))?)\/.+\.(xml|bsl)$/.exec(file);
 if(isNative){const key=file.slice('courses/onec-education/native/'.length),alias='native-public/'+sha(bytes)+'.'+isNative[2];nativeMap[key]=alias;bodies.set(prefix+'courses/onec-education/'+alias,bytes);}
 if(!/^[A-Za-z0-9._/@+-]+(?:\/[A-Za-z0-9._@+-]+)*$/.test(file)){need(!!isNative,'UNSUPPORTED_NON_ASCII_PUBLIC_PATH');omittedNativePaths++;continue;}
 bodies.set(prefix+file,bytes);provenance.push({path:file,sourceSha256:sha(bytes)});
}
const studioPath=prefix+'courses/onec-education/studio.mjs',studio=bodies.get(studioPath)?.toString('utf8');
const original="new URL('native/'+(full?'service-desk-full':'service-desk-a2p2')+'/'+path,import.meta.url)";
need(studio&&studio.split(original).length===2,'NATIVE_TRANSPORT_TRANSFORM_REQUIRES_REVIEW');
const transformed="import {publishedNativeUrl} from './publication-native-urls.mjs';\n"+studio.replace(original,"publishedNativeUrl((full?'service-desk-full':'service-desk-a2p2')+'/'+path)");
bodies.set(studioPath,Buffer.from(transformed));
const mapModule='// Generated public URL aliases; workspace paths and source bytes stay unchanged.\nconst urls=Object.freeze('+JSON.stringify(nativeMap)+');\nexport function publishedNativeUrl(key){if(!Object.hasOwn(urls,key))throw Error(\'UNAPPROVED_NATIVE_ASSET\');return new URL(urls[key],import.meta.url);}\n';
bodies.set(prefix+'courses/onec-education/publication-native-urls.mjs',Buffer.from(mapModule));
for(const file of ['nexus-shell.html','version.json','offline.html','manifest.webmanifest','startup-intro.json']){const bytes=await fs.readFile(path.join(baseline,file)),expected=file==='nexus-shell.html'?prior.shell:records.get('/'+file);need(expected&&bytes.length===expected.bytes&&sha(bytes)===expected.sha256,'BASELINE_ROOT_DRIFT');bodies.set('/'+file,Buffer.from(rewrite(bytes.toString('utf8'))));}
const meta=JSON.parse(bodies.get('/version.json'));Object.assign(meta,{version,channel:'candidate-test',build:'onec-dual-candidate-20261101',date:'2026-11-01',assetGeneration:generation,notes:'Проверочная сборка двух направлений 1С. Официальный Release — после успешной приёмки. Существующий курс C++ сохранён.'});
if(meta.releaseCandidate)Object.assign(meta.releaseCandidate,{version,assetGeneration:generation});Object.assign(meta.content,{onecProgrammingTopicsRu:52,onecProgrammingTopicsEn:52,onecAppliedTopicsRu:32,onecAppliedTopicsEn:32});
const metadataBytes=Buffer.from(JSON.stringify(meta,null,2)+'\n');bodies.set('/version.json',metadataBytes);bodies.set(prefix+'version.json',metadataBytes);
const recordBody=(file,bytes)=>{need(/^\/[A-Za-z0-9._/@+-]+(?:\/[A-Za-z0-9._@+-]+)*$/.test(file),'INVALID_PUBLIC_URL');need(bytes.length<=2400000,'PUBLIC_FILE_TOO_LARGE');const record={path:file,bytes:bytes.length,sha256:sha(bytes),immutable:file.startsWith('/releases/')||file.startsWith('/entry-assets/')};const existing=records.get(file);need(!existing?.immutable||existing.sha256===record.sha256,'EXISTING_IMMUTABLE_ASSET_CHANGED');records.set(file,record);return record};
for(const[file,bytes]of bodies)recordBody(file,bytes);
const {readWorkerConfiguration}=await import(pathToFileURL(path.join(repo,'tools/published-worker-configuration.mjs'))),oldSw=await fs.readFile(path.join(baseline,'service-worker.js'));
need(sha(oldSw)===records.get('/service-worker.js').sha256,'BASELINE_SW_DRIFT');const config=readWorkerConfiguration(oldSw.toString('utf8'));
const assets=new Map(config.assets.map(r=>[r.url,r]));
for(const r of config.assets){const url=rename('/'+r.url).slice(1),actual=records.get('/'+url);if(!actual){need(url===r.url,'NEW_PWA_URL_MISSING');continue;}assets.set(url,{...r,url,bytes:actual.bytes,sha256:actual.sha256,...(r.version===oldVersion?{version}:{})});}
const {staticMime}=await import(pathToFileURL(path.join(repo,'pwa/static-mime.js')));
for(const[file,bytes]of bodies)if(file.startsWith(prefix)&&!file.includes('/intro-media/'))assets.set(file.slice(1),{url:file.slice(1),bytes:bytes.length,sha256:sha(bytes),mime:staticMime(file)});
const pwaConfig={...config,generation,version,assets:[...assets.values()].sort((a,b)=>a.url<b.url?-1:a.url>b.url?1:0)};
const {build}=createRequire('C:/Users/User/AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/wrangler/package.json')('esbuild');
const sw=(await build({absWorkingDir:repo,entryPoints:[path.join(repo,'pwa/service-worker.js')],bundle:true,platform:'browser',format:'iife',target:'es2022',write:false,define:{__NEXUS_PWA_CONFIG__:JSON.stringify(pwaConfig)},logLevel:'warning'})).outputFiles[0].contents;
bodies.set('/service-worker.js',Buffer.from(sw));recordBody('/service-worker.js',Buffer.from(sw));
const shell=bodies.get('/nexus-shell.html'),manifest={version:1,generation,shell:{bytes:shell.length,sha256:sha(shell)},files:[...records.values()].sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0)},manifestBytes=Buffer.from(JSON.stringify(manifest,null,2)+'\n');
for(const[file,bytes]of bodies){const target=path.join(frontend,file);await fs.mkdir(path.dirname(target),{recursive:true});await fs.writeFile(target,bytes,{flag:'wx'});}await fs.writeFile(path.join(frontend,'PUBLISHED_FILES.json'),manifestBytes,{flag:'wx'});
const frozen={status:'LOCAL FRONTEND CANDIDATE BUILT / NOT PUBLISHED',sourceCommit,sourceBase:base,publishedSource:productionSource,generation,version,frontendManifestSha256:sha(manifestBytes),baselineManifestSha256:sha(priorBytes),baselineLocalImageId:'sha256:708da9fa8cbc5fb09e11d2eef285bb8a6b67531db650d59119780bbf080de695',baselineBffSha256:snapshot.bffSha256,baselineNetworkBootstrapSha256:snapshot.networkBootstrapSha256,backendCodeChanged:false,mainChanged:false,productionChanged:false,officialReleaseCreated:false,deltaFiles:bodies.size,deltaBytes:[...bodies.values()].reduce((n,b)=>n+b.length,0),retainedRecords:prior.files.length,nativeAliases:Object.keys(nativeMap).length,nativeNonAsciiPathsMovedToAliases:omittedNativePaths,nativeWorkspacePathsChanged:false,nativeBytesChanged:false,studioTransport:{sourceSha256:sha(Buffer.from(studio)),publishedSha256:sha(Buffer.from(transformed)),mappingSha256:sha(Buffer.from(mapModule)),expectedUrlExpressionReplacements:1},publicSourceProvenance:provenance,buildScriptSha256:sha(await fs.readFile(import.meta.filename))};
await fs.writeFile(path.join(out,'FROZEN_SOURCE.json'),JSON.stringify(frozen,null,2)+'\n',{flag:'wx'});
await fs.writeFile(path.join(out,'Dockerfile'),'FROM akronikl-p4q-production:20261030-v21\nCOPY frontend/ /app/frontend/\nLABEL org.opencontainers.image.revision="'+sourceCommit+'"\nLABEL org.akronikl.candidate="onec-20261101"\n',{flag:'wx'});
console.log(JSON.stringify({...frozen,publicSourceProvenance:undefined}));
