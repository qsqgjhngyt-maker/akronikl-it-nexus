// Оригинальный loopback-only mock курса. Не Studio bridge и не production endpoint.
import http from'node:http';import fs from'node:fs';
const ready=process.argv[2];if(!ready)throw Error('OWNED_READY_PATH_REQUIRED');
const server=http.createServer((req,res)=>{const send=(code,body)=>{res.writeHead(code,{'content-type':'application/json'});res.end(JSON.stringify(body));};if(req.method!=='GET'){send(405,{error:'method'});return;}switch(req.url){case'/health':send(200,{service:'nexus-course-mock',status:'ok'});break;case'/reject':send(400,{error:'synthetic-rejection'});break;case'/slow':setTimeout(()=>send(200,{status:'late'}),2500);break;default:send(404,{error:'unknown-route'});}});
server.listen(8765,'127.0.0.1',()=>fs.writeFileSync(ready,JSON.stringify({scope:'loopback-only',port:8765,production:false})+'\n'));
server.on('error',()=>{process.exitCode=1;});const stop=()=>server.close(()=>process.exit());process.on('SIGTERM',stop);setTimeout(stop,180000).unref();
