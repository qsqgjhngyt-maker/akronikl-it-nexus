import {build} from 'esbuild';
import {mkdir,copyFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const root=new URL('./',import.meta.url),out=new URL('./image/',root);
await mkdir(new URL('bff/',out),{recursive:true});await mkdir(new URL('public/',out),{recursive:true});
await build({entryPoints:[fileURLToPath(new URL('bff/server.mjs',root))],outfile:fileURLToPath(new URL('bff/server.mjs',out)),bundle:true,platform:'node',format:'esm',target:'node22',logLevel:'warning'});
for(const name of ['index.html','page.js','passkey-client.js'])await copyFile(new URL('public/'+name,root),new URL('public/'+name,out));
await writeFile(new URL('Dockerfile',out),'FROM node:22-alpine@sha256:0a7108bf6c7bf5de370ffb1a3ed6be93d405b43ff159f681a8d18c0e2bc2e402\nWORKDIR /app\nCOPY bff/server.mjs ./bff/server.mjs\nCOPY public/ ./public/\nENV NODE_ENV=production\nUSER node\nCMD ["node","bff/server.mjs"]\n');
