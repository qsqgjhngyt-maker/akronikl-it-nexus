// Only our small application and installer. No weights, SDK wheels or runtime hosting.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {yc,need} from '../publication-auth-cloud.mjs';
const [buildArg,outArg]=process.argv.slice(2),build=path.resolve(buildArg),out=path.resolve(outArg);
const manifest=JSON.parse(await readFile(path.join(build,'INSTALLER_MANIFEST.json'),'utf8'));
need(manifest.kind==='SELF_DOWNLOADING_INSTALLER'&&manifest.modelWeightsHostedByNexus===0&&manifest.thirdPartyDownloadsHostedByNexus===0,'THIN_INSTALLER_REQUIRED');
const base='https://storage.yandexcloud.net/akronikl-p4q-public-voice-20261029-2634b701/local-qwen-install/uyut7-qwen-20261030-v1/';
const rows=[manifest.application,manifest.installer],hash=(kind,b)=>createHash(kind).update(b).digest('hex');
await mkdir(out);const token=yc(['iam','create-token'],{raw:true}),done=[];
await writeFile(path.join(out,'UPLOAD_INTENT.json'),JSON.stringify({objects:rows,mainChanged:false,officialRelease:false},null,2)+'\n');
try{
 for(const row of rows){
  need(['application.zip','Akronikl-Qwen-TTS-Setup.exe'].includes(row.file)&&row.url===base+row.file&&row.bytes<10*1024*1024,'SMALL_OWN_ARTIFACTS_ONLY');
  const body=await readFile(path.join(build,row.file)),md5=hash('md5',body);
  need(body.length===row.bytes&&hash('sha256',body)===row.sha256,'ARTIFACT_CHANGED');
  let response=await fetch(row.url,{method:'HEAD',headers:{authorization:'Bearer '+token},redirect:'error',signal:AbortSignal.timeout(30000)});
  if(response.status===404){
   response=await fetch(row.url,{method:'PUT',headers:{authorization:'Bearer '+token,'content-type':row.file.endsWith('.zip')?'application/zip':'application/octet-stream','content-md5':Buffer.from(md5,'hex').toString('base64'),'x-amz-meta-sha256':row.sha256,'cache-control':'public, max-age=31536000, immutable','content-disposition':'attachment; filename="'+row.file+'"'},body,redirect:'error',signal:AbortSignal.timeout(90000)});
   need(response.ok,'SMALL_ARTIFACT_UPLOAD_FAILED');await response.body?.cancel();
  }else need(response.status===200&&response.headers.get('x-amz-meta-sha256')===row.sha256&&response.headers.get('content-length')===String(row.bytes),'IMMUTABLE_OBJECT_ALREADY_DIFFERENT');
  const publicGet=await fetch(row.url,{redirect:'error',signal:AbortSignal.timeout(30000)}),bytes=Buffer.from(await publicGet.arrayBuffer());
  need(publicGet.status===200&&bytes.equals(body)&&hash('sha256',bytes)===row.sha256,'FULL_PUBLIC_READBACK_FAILED');
  done.push({...row,publicFullReadback:true});console.log(JSON.stringify({file:row.file,status:'PUBLISHED_AND_FULLY_VERIFIED',bytes:bytes.length}));
 }
 await writeFile(path.join(out,'PUBLISHED_INSTALLER.json'),JSON.stringify({status:'SELF_DOWNLOADING_INSTALLER_PUBLISHED',at:new Date().toISOString(),objects:done,hostedModelBytes:0,hostedRuntimeBytes:0,mainChanged:false,productionSiteChanged:false,officialRelease:false},null,2)+'\n');
}catch(error){await writeFile(path.join(out,'UPLOAD_FAIL.json'),JSON.stringify({status:'FAIL',code:/^[A-Z_]+$/.test(error.message)?error.message:'PUBLICATION_FAILED',completed:done},null,2)+'\n');throw error;}
