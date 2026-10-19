import {timingSafeEqual} from 'node:crypto';

const CONTEXT_HEADER='x-yc-apigateway-operation-context';
const PROTECTED=new Set(['__Host-nexus_session','__Host-nexus_passkey_flow','__Host-nexus_oauth_flow','__Host-nexus_probe']);
const reject=()=>{throw Error('INGRESS_REJECTED')};
function count(req,name){
 if(!Array.isArray(req.rawHeaders)||req.rawHeaders.length%2!==0)return reject();
 let total=0;
 for(let i=0;i<req.rawHeaders.length;i+=2){
  if(typeof req.rawHeaders[i]!=='string'||typeof req.rawHeaders[i+1]!=='string')return reject();
  if(req.rawHeaders[i].toLowerCase()===name)total++;
 }
 return total;
}
function parseCookies(raw){
 if(typeof raw!=='string'||raw.length===0||raw.length>4096||!/^[\x09\x20-\x7e]+$/.test(raw))return reject();
 const values=new Map(),pairs=[];
 for(const part of raw.split(';')){
  const pair=part.trim(),at=pair.indexOf('=');if(at<1)return reject();
  const name=pair.slice(0,at),value=pair.slice(at+1);
  if(!/^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/.test(name)||!/^[\x21\x23-\x2B\x2D-\x3A\x3C-\x5B\x5D-\x7E]*$/.test(value))return reject();
  if(PROTECTED.has(name)&&values.has(name))return reject();
  // Неиспользуемые cookies могут повторяться; сравнение ниже сохраняет каждую пару.
  values.set(name,value);pairs.push(name+'='+value);
 }
 return{values,canonical:pairs.sort().join('; ')};
}

/** V2: Gateway передаёт целый Cookie header; private container/IAM остаётся обязательным.
 * Возвращает Map только после двусторонней сверки. V1 делегируется старому parser.
 */
export function readV2CookieContext(req,marker){
 if(typeof marker!=='string'||!/^[A-Za-z][A-Za-z0-9]{0,63}$/.test(marker)||marker==='cookieHeader')return reject();
 if(count(req,CONTEXT_HEADER)!==1)return reject();
 const raw=req.headers?.[CONTEXT_HEADER];
 if(typeof raw!=='string'||!raw.length||raw.length>8192||!/^[A-Za-z0-9+/]+={0,2}$/.test(raw))return reject();
 let text,data;
 try{
  const bytes=Buffer.from(raw,'base64');
  if(bytes.length>6144||bytes.toString('base64')!==raw)return reject();
  text=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(bytes);data=JSON.parse(text);
 }catch{return reject()}
 if(!data||typeof data!=='object'||Array.isArray(data))return reject();
 if(data[marker]==='v1')return undefined;
 if(data[marker]!=='v2'||Object.keys(data).sort().join(',')!==[marker,'cookieHeader'].sort().join(',')||
  text.match(/"(?:[^"\\]|\\.)*"/g)?.length!==4||typeof data.cookieHeader!=='string')return reject();
 const actual=req.headers?.cookie,present=actual!==undefined,cookieCount=count(req,'cookie');
 if(!present&&cookieCount!==0||present&&(cookieCount!==1||typeof actual!=='string'))return reject();
 if(data.cookieHeader==='-'){
  if(present)return reject();
  return new Map();
 }
 if(!present)return reject();
 const expected=parseCookies(data.cookieHeader),received=parseCookies(actual);
 const left=Buffer.from(expected.canonical,'ascii'),right=Buffer.from(received.canonical,'ascii');
 if(left.length!==right.length||!timingSafeEqual(left,right))return reject();
 return received.values;
}
