import assert from 'node:assert/strict';
import http from 'node:http';
import {once} from 'node:events';
import {readFile} from 'node:fs/promises';
// Real module evaluation, including transitive Worker/verifier dependencies.
for(const file of ['../server-access/public/entry.js','../server-access/public/passkey-client.js','../server-access/public/oauth-client.js','../server-access/bff/oauth.mjs','../server-access/bff/passkey.mjs','../server-access/bff/entry-gate.mjs','../server-access/worker/entry.mjs'])await import(file);
console.log('PASS actual ESM imports: entry, passkey, OAuth, BFF, Worker/verifier');
const original=http.createServer;let server;
http.createServer=(...args)=>{server=original(...args);return server};
const saved={...process.env};process.env.PORT='0';process.env.PASSKEY_PROXY_ENABLED='true';process.env.PASSKEY_ORIGIN='https://d5d8d3c2d1uhct6fmvle.3rspsmhh.apigw.yandexcloud.net';
try{
 await import('../server-access/image/bff/server.mjs');if(!server.listening)await once(server,'listening');
 const response=await new Promise((resolve,reject)=>http.get({hostname:'127.0.0.1',port:server.address().port,path:'/account/access/passkey-client.js',headers:{host:new URL(process.env.PASSKEY_ORIGIN).host}},resolve).once('error',reject));
 assert.equal(response.statusCode,200);assert.equal(response.headers['cache-control'],'no-store');assert.equal(response.headers.vary,'*');
 const chunks=[];for await(const chunk of response)chunks.push(chunk);assert.deepEqual(Buffer.concat(chunks),await readFile(new URL('../server-access/public/passkey-client.js',import.meta.url)));
 console.log('PASS rebuilt BFF bundle imports, starts and serves exact new client over loopback HTTP');
}finally{http.createServer=original;if(server){server.closeAllConnections();await new Promise(resolve=>server.close(resolve))}for(const k of Object.keys(process.env))if(!(k in saved))delete process.env[k];Object.assign(process.env,saved)}
