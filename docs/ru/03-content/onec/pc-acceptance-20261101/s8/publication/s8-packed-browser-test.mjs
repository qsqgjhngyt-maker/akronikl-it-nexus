import fs from'node:fs/promises';import path from'node:path';import{createHash}from'node:crypto';import{pathToFileURL}from'node:url';
const work=import.meta.dirname,dir=path.join(work,'s8-publication-20261101'),overlay=path.join(dir,'candidate-overlay-r4/frontend'),baseline=path.join(dir,'baseline-public'),manifest=JSON.parse(await fs.readFile(path.join(overlay,'PUBLISHED_FILES.json'))),prefix='/releases/'+manifest.generation+'/',known=new Map(manifest.files.map(r=>[r.path,r]));
let source=await fs.readFile(path.join(work,'s8-persistence-regression.mjs'),'utf8');
source=source.replace("repo=path.join(work,'repo')","repo=path.join(work,'repo')");
source=source.replace("out=path.join(work,'s8-persistence-'","out=path.join(work,'s8-packed-persistence-'");
source=source.replace(/from'\/(core|courses)\//g,(_,root)=>"from'"+prefix+root+'/').replace("fetch('/courses/onec/curriculum.json')","fetch('"+prefix+"courses/onec/curriculum.json')");
const marker="const first=await withOnecWriter(()=>createOnecWork(input))";
if(!source.includes(marker))throw Error('FIXTURE_TRANSFORM_REQUIRES_REVIEW');
source=source.replace(marker,"const fullInput=await loadOnecTemplate({...bindingFor(c,'onec.p1.architecture'),configurationRevision:'1.0.0-rc.1'},'en');if(input.workspace.files.length!==9||fullInput.workspace.files.length!==12)throw Error('PACKED_NATIVE_TEMPLATE_COUNTS');window.packedTemplates={base:input.workspace.files.length,full:fullInput.workspace.files.length};"+marker);
const start=source.indexOf("const file=path.resolve(repo,'.'+decodeURIComponent(u.pathname));"),end=source.indexOf("}catch{res.writeHead(404)",start);
if(start<0||end<0)throw Error('FIXTURE_SERVER_TRANSFORM_REQUIRES_REVIEW');
const serverCode=`const record=packedKnown.get(u.pathname);if(!record)throw Error('UNAPPROVED_PUBLIC_FIXTURE_PATH');let b;try{b=await fs.readFile(path.join(packedOverlay,u.pathname))}catch(error){if(error.code!=='ENOENT')throw error;b=await fs.readFile(path.join(packedBaseline,u.pathname));}if(b.length!==record.bytes||packedSha(b)!==record.sha256)throw Error('PACKED_PUBLIC_FILE_CHANGED');res.writeHead(200,{'content-type':/\\.(mjs|js)$/.test(u.pathname)?'text/javascript':u.pathname.endsWith('.json')?'application/json':u.pathname.endsWith('.css')?'text/css':'application/octet-stream'});res.end(b);`;
source=source.slice(0,start)+serverCode+source.slice(end);
source=source.replace("const result={status:'AUTOMATED PASS'","const result={packedArtifact:true,packedGeneration:"+JSON.stringify(manifest.generation)+",frontendManifestSha256:"+JSON.stringify(createHash('sha256').update(await fs.readFile(path.join(overlay,'PUBLISHED_FILES.json'))).digest('hex'))+",nativeTemplatesVerified:{baseFiles:9,fullFiles:12,hashChecks:'original source manifests'},status:'AUTOMATED PASS'");
const prelude=`const packedOverlay=${JSON.stringify(overlay)},packedBaseline=${JSON.stringify(baseline)},packedKnown=new Map(${JSON.stringify([...known])}),packedSha=b=>createHash('sha256').update(b).digest('hex');\n`;
// Only synthetic fixture code is generated; no real browser profile, Account or network service.
source="import{createHash}from'node:crypto';\n"+prelude+source;
const testFile=path.join(work,'s8-packed-persistence.generated.mjs');await fs.writeFile(testFile,source);
await import(pathToFileURL(testFile));
