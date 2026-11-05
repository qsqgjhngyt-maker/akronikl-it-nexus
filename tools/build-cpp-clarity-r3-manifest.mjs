import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';

export const ASSET_DIGEST_ALGORITHM='sha256-json-path-sha256-utf8-order-v1';
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
export function fingerprintReviewAssets(root){
 const files=[];
 function visit(directory){
  for(const entry of fs.readdirSync(directory,{withFileTypes:true})){
   const file=path.join(directory,entry.name);
   if(entry.isDirectory())visit(file);
   else if(entry.isFile())files.push({path:path.relative(root,file).split(path.sep).join('/'),sha256:sha(fs.readFileSync(file))});
   else throw Error('Unsupported review asset: '+file);
  }
 }
 visit(root);
 // Порядок байтов UTF-8 одинаков в Windows/Linux и не зависит от языка ОС.
 files.sort((a,b)=>Buffer.compare(Buffer.from(a.path,'utf8'),Buffer.from(b.path,'utf8')));
 return {assetDigestAlgorithm:ASSET_DIGEST_ALGORITHM,assetDigest:sha(JSON.stringify(files)),files};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
 const file=path.join(repo,'docs/ru/03-content/cpp-clarity-01/R3_ASSET_MANIFEST.json');
 const generated={schemaVersion:2,revision:'r3-review-1',baseline:'ec6f6b9d432566585a12c16e123b066dc199ec8a',...fingerprintReviewAssets(path.join(repo,'review/cpp-clarity-r3'))};
 if(process.argv.includes('--write'))fs.writeFileSync(file,JSON.stringify(generated,null,2)+'\n');
 else if(JSON.stringify(JSON.parse(fs.readFileSync(file,'utf8')))!==JSON.stringify(generated))throw Error('Review manifest differs; explicitly regenerate it with --write.');
 process.stdout.write(JSON.stringify({status:'PASS',assetDigestAlgorithm:generated.assetDigestAlgorithm,assetDigest:generated.assetDigest,files:generated.files.length})+'\n');
}
