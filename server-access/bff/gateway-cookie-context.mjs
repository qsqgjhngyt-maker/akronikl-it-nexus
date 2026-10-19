import {timingSafeEqual} from 'node:crypto';

const CONTEXT_HEADER='x-yc-apigateway-operation-context';
const PROTECTED=new Set(['__Host-nexus_session','__Host-nexus_passkey_flow','__Host-nexus_oauth_flow','__Host-nexus_probe']);
const SYNTHETIC_CONTEXTS=new Map();
const syntheticS='__Host-nexus_session=nxs_'+'A'.repeat(43),syntheticF='__Host-nexus_oauth_flow=nof_'+'B'.repeat(43),syntheticP='__Host-nexus_passkey_flow=npf_'+'C'.repeat(43);
for(const [name,pairs] of [['S',[syntheticS]],['F',[syntheticF]],['P',[syntheticP]],['SPF',[syntheticS,syntheticP,syntheticF]]])SYNTHETIC_CONTEXTS.set(pairs.sort().join('; '),'v2_cookie_mismatch_expected_'+name);
// Только фиксированная причина для строго синтетического OAuth probe; credential не включается.
const reject=reason=>{const error=Error('INGRESS_REJECTED');error.cookieContextReason=reason;throw error};
function count(req,name){
 if(!Array.isArray(req.rawHeaders)||req.rawHeaders.length%2!==0)return reject('v2_raw_headers');
 let total=0;
 for(let i=0;i<req.rawHeaders.length;i+=2){
  if(typeof req.rawHeaders[i]!=='string'||typeof req.rawHeaders[i+1]!=='string')return reject('v2_raw_headers');
  if(req.rawHeaders[i].toLowerCase()===name)total++;
 }
 return total;
}
function parseCookies(raw,syntaxReason){
 if(typeof raw!=='string'||raw.length===0||raw.length>4096||!/^[\x09\x20-\x7e]+$/.test(raw))return reject(syntaxReason);
 const values=new Map(),pairs=[];
 for(const part of raw.split(';')){
  const pair=part.trim(),at=pair.indexOf('=');if(at<1)return reject(syntaxReason);
  const name=pair.slice(0,at),value=pair.slice(at+1);
  if(!/^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/.test(name)||!/^[\x21\x23-\x2B\x2D-\x3A\x3C-\x5B\x5D-\x7E]*$/.test(value))return reject(syntaxReason);
  if(PROTECTED.has(name)&&values.has(name))return reject('v2_protected_duplicate');
  // Неиспользуемые cookies могут повторяться; сравнение ниже сохраняет каждую пару.
  values.set(name,value);pairs.push(name+'='+value);
 }
 return{values,canonical:pairs.sort().join('; ')};
}

/** V2: Gateway передаёт целый Cookie header; private container/IAM остаётся обязательным.
 * Возвращает Map только после двусторонней сверки. V1 делегируется старому parser.
 */
export function readV2CookieContext(req,marker){
 if(typeof marker!=='string'||!/^[A-Za-z][A-Za-z0-9]{0,63}$/.test(marker)||marker==='cookieHeader')return reject('v2_marker_argument');
 if(count(req,CONTEXT_HEADER)!==1)return reject('v2_context_count');
 const raw=req.headers?.[CONTEXT_HEADER];
 if(typeof raw!=='string'||!raw.length||raw.length>8192||!/^[A-Za-z0-9+/]+={0,2}$/.test(raw))return reject('v2_context_base64');
 let text,data;
 const bytes=Buffer.from(raw,'base64');
 if(bytes.length>6144||bytes.toString('base64')!==raw)return reject('v2_context_base64');
 try{text=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(bytes)}catch{return reject('v2_context_utf8')}
 try{data=JSON.parse(text)}catch{return reject('v2_context_json')}
 if(!data||typeof data!=='object'||Array.isArray(data))return reject('v2_context_shape');
 if(data[marker]==='v1')return undefined;
 if(data[marker]!=='v2'||Object.keys(data).sort().join(',')!==[marker,'cookieHeader'].sort().join(',')||
  text.match(/"(?:[^"\\]|\\.)*"/g)?.length!==4||typeof data.cookieHeader!=='string')return reject('v2_context_shape');
 const actual=req.headers?.cookie,present=actual!==undefined,cookieCount=count(req,'cookie');
 if(!present&&cookieCount!==0||present&&(cookieCount!==1||typeof actual!=='string'))return reject('v2_cookie_header_count');
 if(data.cookieHeader==='-'){
  if(present)return reject('v2_absent_context');
  return new Map();
 }
 if(!present)return reject('v2_absent_raw');
 const expected=parseCookies(data.cookieHeader,'v2_context_cookie_syntax'),received=parseCookies(actual,'v2_raw_cookie_syntax');
 const left=Buffer.from(expected.canonical,'ascii'),right=Buffer.from(received.canonical,'ascii');
 if(left.length!==right.length||!timingSafeEqual(left,right))return reject(SYNTHETIC_CONTEXTS.get(expected.canonical)??'v2_cookie_mismatch_expected_OTHER');
 return received.values;
}
