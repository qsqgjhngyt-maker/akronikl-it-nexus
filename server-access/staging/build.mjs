import {build} from 'esbuild';
import {mkdir,copyFile,readFile,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
const out=resolve(process.argv[2]||'../staging-build');await mkdir(join(out,'public'),{recursive:true});
await build({absWorkingDir:fileURLToPath(new URL('../',import.meta.url)),entryPoints:[fileURLToPath(new URL('runtime.mjs',import.meta.url))],outfile:join(out,'runtime.mjs'),bundle:true,platform:'node',format:'esm',target:'node22',external:['node:*'],
 banner:{js:"import {createRequire} from 'node:module'; const require=createRequire(import.meta.url);"},logLevel:'warning'});
for(const name of ['password.html','password.js'])await copyFile(new URL('../public/'+name,import.meta.url),join(out,'public',name));
await writeFile(join(out,'Dockerfile'),`FROM node:22-alpine@sha256:0a7108bf6c7bf5de370ffb1a3ed6be93d405b43ff159f681a8d18c0e2bc2e402\nWORKDIR /app\nCOPY runtime.mjs ./\nCOPY public/ ./public/\nENV NEXUS_STAGING_CONTAINER=true\nUSER node\nCMD ["node","runtime.mjs"]\n`);
console.log('STAGING_BUNDLE_READY');
