// Только просмотр публичной страницы на loopback: без cookie, API, аккаунтов и SW.
import http from 'node:http';
import {readFile} from 'node:fs/promises';
const types={'entry.html':'text/html; charset=utf-8','entry.css':'text/css; charset=utf-8','entry.js':'text/javascript; charset=utf-8','galaxy.js':'text/javascript; charset=utf-8','oauth-client.js':'text/javascript; charset=utf-8'};
const server=http.createServer(async(req,res)=>{
 const file=req.url==='/'?'entry.html':req.url?.startsWith('/account/entry/')?req.url.slice('/account/entry/'.length):'';
 if(req.method!=='GET'||!Object.hasOwn(types,file)){res.writeHead(404);res.end();return}
 res.writeHead(200,{'content-type':types[file],'cache-control':'no-store'});res.end(await readFile(new URL('./public/'+file,import.meta.url)));
});
server.listen(8184,'127.0.0.1',()=>console.log('Публичный предпросмотр: http://127.0.0.1:8184/ (API и Service Worker отсутствуют).'));
process.on('SIGINT',()=>server.close());
