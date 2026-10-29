import http from 'node:http';import {createHash,randomBytes,timingSafeEqual} from 'node:crypto';
import {NARRATOR} from '../../akronikl/experience/local-speaker.js';
const DEFAULT_ORIGIN='https://d5d8d3c2d1uhct6fmvle.3rspsmhh.apigw.yandexcloud.net';
const hash=s=>createHash('sha256').update(s).digest('hex'),code=()=>String(randomBytes(4).readUInt32BE()%100000000).padStart(8,'0');
async function body(req){let size=0;const parts=[];for await(const b of req){size+=b.length;if(size>2048)throw Error('SPEECH_REQUEST_INVALID');parts.push(b);}try{return JSON.parse(Buffer.concat(parts).toString('utf8'));}catch{throw Error('SPEECH_REQUEST_INVALID');}}
const one=(req,name)=>req.rawHeaders.filter((v,i)=>i%2===0&&v.toLowerCase()===name).length===1;
export async function startLocalVoiceCompanion({speech,origin=DEFAULT_ORIGIN,port=18791,now=()=>Date.now(),initialCode=code()}={}){
 if(!speech?.synthesize||new URL(origin).origin!==origin||!/^\d{8}$/.test(initialCode))throw Error('SPEECH_CONFIG_INVALID');
 let pairingCode=initialCode,closing=false,attempts=[],endpoint;const tokens=new Map(),pending=new Map();
 const headers={'cache-control':'no-store','vary':'*','x-content-type-options':'nosniff','referrer-policy':'no-referrer','x-akronikl-local-voice':'v1'};
 const json=(res,status,data,cors=false)=>{res.writeHead(status,{...headers,'content-type':'application/json',...(cors?{'access-control-allow-origin':origin}: {})});res.end(JSON.stringify(data));};
 function sweep(){for(const [key,t]of tokens)if(t.expiresAt<=now()){for(const c of pending.get(key)??[])c.abort();tokens.delete(key);pending.delete(key);}}
 const server=http.createServer({maxHeaderSize:8192},async(req,res)=>{
  let actor=null,controller=null;const stop=()=>{if(!res.writableEnded)controller?.abort();};
  try{
   if(req.headers.host!==new URL(endpoint).host||closing){json(res,403,{code:'SPEECH_LOCAL_DENIED'});return;}
   if(req.method==='GET'&&req.url==='/'&&req.headers.origin===undefined){sweep();const ready=speech.status?.().ready===true;const html='<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="5"><title>Локальный голос Akronikl</title><style>body{max-width:650px;margin:10vh auto;padding:24px;font:18px system-ui;background:#0b1727;color:#eaf4ff}input{font:32px monospace;width:10ch;padding:12px;border-radius:12px}p{line-height:1.6}</style><h1>Прежний голос «Уют-7»</h1><p>'+(ready?'Голос готов.':'Готовлю локальную Qwen. Первый запуск займёт некоторое время.')+'</p><p>В Nexus откройте настройки помощника → Голос → Локальный модуль и введите код:</p><input readonly aria-label="Код подключения" value="'+pairingCode+'"><p>Подключённых аккаунтов: '+tokens.size+'. Озвучка работает на этом компьютере и не использует API облачного ИИ.</p></html>';res.writeHead(200,{...headers,'content-type':'text/html; charset=utf-8','content-security-policy':"default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",'x-frame-options':'DENY'});res.end(html);return;}
   const allowed=['/pair','/ready','/speech','/unpair'];if(!allowed.includes(req.url)||req.headers.origin!==origin||!one(req,'origin')||req.headers.cookie!==undefined){json(res,403,{code:'SPEECH_LOCAL_DENIED'});return;}
   if(req.method==='OPTIONS'){res.writeHead(204,{...headers,'access-control-allow-origin':origin,'access-control-allow-methods':'GET,POST,OPTIONS','access-control-allow-headers':'content-type,authorization,x-nexus-account-expectation','access-control-allow-private-network':'true','access-control-max-age':'300'});res.end();return;}
   sweep();if(req.url==='/pair'&&req.method==='POST'&&req.headers['content-type']==='application/json'){
    attempts=attempts.filter(at=>at>now()-60000);if(attempts.length>=6){json(res,429,{code:'SPEECH_LOCAL_BUSY'},true);return;}attempts.push(now());const value=await body(req);
    if(!value||Object.keys(value).sort().join(',')!=='accountId,code'||typeof value.accountId!=='string'||!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/.test(value.accountId)||!/^\d{8}$/.test(value.code??'')||!timingSafeEqual(Buffer.from(value.code),Buffer.from(pairingCode))){json(res,401,{code:'SPEECH_LOCAL_CODE_INVALID'},true);return;}
    if(tokens.size>=8){json(res,429,{code:'SPEECH_LOCAL_BUSY'},true);return;}const token=randomBytes(32).toString('base64url');tokens.set(hash(token),{accountId:value.accountId,expiresAt:now()+30000});pairingCode=code();json(res,200,{paired:true,token,voice:NARRATOR},true);return;
   }
   if(!one(req,'authorization')||!one(req,'x-nexus-account-expectation')||!/^Bearer [A-Za-z0-9_-]{43}$/.test(req.headers.authorization??'')){json(res,401,{code:'SPEECH_LOCAL_PAIR_REQUIRED'},true);return;}
   actor=hash(req.headers.authorization.slice(7));const record=tokens.get(actor);if(!record||record.accountId!==req.headers['x-nexus-account-expectation']){json(res,401,{code:'SPEECH_LOCAL_PAIR_REQUIRED'},true);return;}record.expiresAt=now()+1800000;
   if(req.url==='/ready'&&req.method==='GET'){json(res,200,{paired:true,ready:speech.status?.().ready===true,voice:NARRATOR},true);return;}
   if(req.method!=='POST'||req.headers['content-type']!=='application/json'){json(res,403,{code:'SPEECH_LOCAL_DENIED'},true);return;}
   const value=await body(req);if(tokens.get(actor)!==record||record.expiresAt<=now()){json(res,401,{code:'SPEECH_LOCAL_PAIR_REQUIRED'},true);return;}
   if(req.url==='/unpair'&&value&&Object.keys(value).length===0){for(const c of pending.get(actor)??[])c.abort();pending.delete(actor);tokens.delete(actor);json(res,200,{unpaired:true},true);return;}
   if(req.url!=='/speech'||!value||Object.keys(value).join(',')!=='text'||typeof value.text!=='string'||!value.text.trim()||value.text.length>240){json(res,400,{code:'SPEECH_REQUEST_INVALID'},true);return;}
   if(pending.size>=4||pending.get(actor)?.size){json(res,429,{code:'SPEECH_BUSY'},true);return;}
   controller=new AbortController();pending.set(actor,new Set([controller]));req.once('aborted',stop);res.once('close',stop);const result=await speech.synthesize(value.text,{signal:controller.signal});controller.signal.throwIfAborted();if(!tokens.has(actor))throw Error('SPEECH_CANCELLED');
   res.writeHead(200,{...headers,'access-control-allow-origin':origin,'content-type':'audio/wav','content-length':result.audio.length});res.end(result.audio);
  }catch(e){if(!res.writableEnded&&!res.destroyed)json(res,502,{code:/^SPEECH_[A-Z_]+$/.test(e.message)?e.message:'SPEECH_UNAVAILABLE'},req.headers.origin===origin);}
  finally{if(actor&&controller){pending.get(actor)?.delete(controller);if(!pending.get(actor)?.size)pending.delete(actor);}req.removeListener('aborted',stop);res.removeListener('close',stop);}
 });
 server.requestTimeout=10000;server.headersTimeout=10000;await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve);});endpoint='http://127.0.0.1:'+server.address().port;
 void speech.warmup?.().catch(()=>{});const timer=setInterval(sweep,60000);timer.unref();
 return Object.freeze({endpoint,status:()=>({pairedAccounts:tokens.size,pending:pending.size,ready:speech.status?.().ready===true}),async close(){closing=true;clearInterval(timer);for(const set of pending.values())for(const c of set)c.abort();tokens.clear();server.closeAllConnections();await new Promise(r=>server.close(r));await speech.close?.();}});
}
