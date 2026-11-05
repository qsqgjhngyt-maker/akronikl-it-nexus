// Исполняемая часть контракта R3. Чистые функции: без Storage, DOM и записи данных.
import {CLARITY_COURSES} from './clarity-course-registry.mjs';
export const clarityContentRevision=id=>CLARITY_COURSES[id]?.pilot?'r3-stage-a-8bccaf5':'clarity-courses-v1';
export const CLARITY_CONTENT_REVISION = 'r3-stage-a-8bccaf5';
export const CLARITY_LIMITS = Object.freeze({answer:4096, output:16384, reportDraft:16384, snapshot:32768, draft:65536});
export const CLARITY_QUESTIONS=Object.freeze(Object.fromEntries(Object.entries(CLARITY_COURSES).map(([id,t])=>[id,Object.freeze(t.questions)])));
const encoder = new TextEncoder(), stages = ['explanation','selfcheck','practice'];
const fail = code => { throw Object.assign(new Error(code), {code}); };
const require = (ok, code='R3_SCHEMA_INVALID') => { if(!ok)fail(code); };
const record = v => v!==null && typeof v==='object' && !Array.isArray(v) && [Object.prototype,null].includes(Object.getPrototypeOf(v));
function object(v, keys){
 require(record(v));
 require(Object.keys(v).length===keys.length && keys.every(k=>Object.hasOwn(v,k)));
 for(const k of Reflect.ownKeys(v))require(typeof k==='string' && keys.includes(k) && 'value' in Object.getOwnPropertyDescriptor(v,k));
}
const uint = v => require(Number.isSafeInteger(v) && v>=0);
const revision = v => require(typeof v==='string' && /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,79}$/.test(v));
const text = v => require(typeof v==='string');
const digest = v => require(typeof v==='string' && /^[a-f0-9]{64}$/.test(v));
function topic(id){require(Object.hasOwn(CLARITY_QUESTIONS,id),'R3_TOPIC_REJECTED');return CLARITY_QUESTIONS[id];}
export const utf8Bytes = text => encoder.encode(text).byteLength;
function limit(value, max, code){require(utf8Bytes(value)<=max,code);}
function filePath(v){text(v);require(v.length>0 && utf8Bytes(v)<=1024 && !/[\\\u0000-\u001f\u007f:]/.test(v) && !v.startsWith('/') && v.split('/').every(s=>s && s!=='.' && s!=='..') && [...v].every(c=>c.codePointAt(0)<0xd800 || c.codePointAt(0)>0xdfff),'R3_FILE_REJECTED');}
function compareUtf8(a,b){const x=encoder.encode(a),y=encoder.encode(b);for(let i=0;i<Math.min(x.length,y.length);i++)if(x[i]!==y[i])return x[i]-y[i];return x.length-y.length;}
export function canonicalJson(value){
 if(value===null || typeof value!=='object')return JSON.stringify(value);
 if(Array.isArray(value))return '['+value.map(canonicalJson).join(',')+']';
 return '{'+Object.keys(value).sort(compareUtf8).map(k=>JSON.stringify(k)+':'+canonicalJson(value[k])).join(',')+'}';
}

// SHA-256 нужен для привязки результата к захваченным байтам до первого await.
// Это контроль неизменности входа, не авторизация и не серверная аттестация.
const K = Uint32Array.from([0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2]);
export function sha256Utf8(value){
 text(value);const input=encoder.encode(value),length=Math.ceil((input.length+9)/64)*64;
 const data=new Uint8Array(length),view=new DataView(data.buffer);data.set(input);data[input.length]=128;
 view.setUint32(length-8,Math.floor(input.length/0x20000000));view.setUint32(length-4,(input.length*8)>>>0);
 const h=Uint32Array.from([0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19]),w=new Uint32Array(64),rotr=(x,n)=>(x>>>n)|(x<<(32-n));
 for(let offset=0;offset<length;offset+=64){
  for(let i=0;i<16;i++)w[i]=view.getUint32(offset+i*4);
  for(let i=16;i<64;i++){const x=w[i-15],y=w[i-2];w[i]=(w[i-16]+(rotr(x,7)^rotr(x,18)^(x>>>3))+w[i-7]+(rotr(y,17)^rotr(y,19)^(y>>>10)))>>>0;}
  let [a,b,c,d,e,f,g,h0]=h;
  for(let i=0;i<64;i++){const t1=(h0+(rotr(e,6)^rotr(e,11)^rotr(e,25))+((e&f)^(~e&g))+K[i]+w[i])>>>0,t2=((rotr(a,2)^rotr(a,13)^rotr(a,22))+((a&b)^(a&c)^(b&c)))>>>0;h0=g;g=f;f=e;e=(d+t1)>>>0;d=c;c=b;b=a;a=(t1+t2)>>>0;}
  [a,b,c,d,e,f,g,h0].forEach((v,i)=>h[i]=(h[i]+v)>>>0);
 }
 return [...h].map(n=>n.toString(16).padStart(8,'0')).join('');
}
function binding(v,id){
 if(v===null)return;
 require(record(v));require('value' in (Object.getOwnPropertyDescriptor(v,'kind')||{}));
 if(v.kind==='lesson'){object(v,['kind','topicId','workspaceDigest']);require(CLARITY_COURSES[id]?.courseId==='cpp' && v.topicId===id);digest(v.workspaceDigest);}
 else if(v.kind==='project'){object(v,['kind','id','expectedLocalRevision']);require(['onec','1c-enterprise'].includes(CLARITY_COURSES[id]?.courseId));revision(v.id);uint(v.expectedLocalRevision);}
 else if(v.kind==='local-project'){object(v,['kind','id','workspaceDigest']);require(CLARITY_COURSES[id]?.courseId==='cpp');revision(v.id);digest(v.workspaceDigest);}
 else fail('R3_BINDING_REJECTED');
}
export function validateInputSnapshot(v){
 object(v,['languageId','source','stdin','entryFile','files','metadata']);
 require(['cpp','bsl','1c-query'].includes(v.languageId));text(v.source);text(v.stdin);filePath(v.entryFile);
 require(Array.isArray(v.files) && v.files.length>0 && v.files.length<=128);
 const names=new Set();for(const f of v.files){object(f,['path','content']);filePath(f.path);text(f.content);require(!names.has(f.path),'R3_DUPLICATE_FILE');names.add(f.path);}
 require(v.files.find(f=>f.path===v.entryFile)?.content===v.source,'R3_ENTRY_SOURCE_MISMATCH');
 object(v.metadata,['entryFile','activeFile','workspaceRevision',...['translationUnits','includeRoots'].filter(k=>Object.hasOwn(v.metadata,k))]);for(const key of ['translationUnits','includeRoots'])if(Object.hasOwn(v.metadata,key)){const paths=v.metadata[key];require(Array.isArray(paths)&&paths.length<=128);for(const p of paths){if(key==='includeRoots'&&p==='.')continue;filePath(p);if(key==='translationUnits')require(names.has(p),'R3_BUILD_FILE_MISSING');}}require(v.metadata.entryFile===v.entryFile && names.has(v.metadata.activeFile));uint(v.metadata.workspaceRevision);
 limit(snapshotJson(v),CLARITY_LIMITS.snapshot,'R3_SNAPSHOT_TOO_LARGE');return v;
}
export function snapshotJson(v){return canonicalJson({...v,files:[...v.files].sort((a,b)=>compareUtf8(a.path,b.path))});}
export function snapshotDigests(v){
 validateInputSnapshot(v);
 const {stdin,...source}=v;
 return {sourceDigest:sha256Utf8(snapshotJson(source)),stdinDigest:sha256Utf8(stdin)};
}
function result(v,id){
 if(v===null)return;
 object(v,['kind','runId','contentRevision','workspaceRevision','workBinding','inputSnapshot','sourceDigest','stdinDigest','output','exitCode','providerId']);
 require(['runtime','external-self-report'].includes(v.kind));revision(v.runId);revision(v.contentRevision);uint(v.workspaceRevision);binding(v.workBinding,id);
 object(v.output,['stdout','stderr']);text(v.output.stdout);text(v.output.stderr);require(utf8Bytes(v.output.stdout)+utf8Bytes(v.output.stderr)<=CLARITY_LIMITS.output,'R3_OUTPUT_TOO_LARGE');
 require(v.exitCode===null || Number.isSafeInteger(v.exitCode));
 if(v.inputSnapshot===null){require(v.kind==='external-self-report' && v.workBinding===null && v.sourceDigest===null && v.stdinDigest===null);}
 else {validateInputSnapshot(v.inputSnapshot);const hashes=snapshotDigests(v.inputSnapshot);require(hashes.sourceDigest===v.sourceDigest && hashes.stdinDigest===v.stdinDigest,'R3_DIGEST_MISMATCH');require(v.workspaceRevision===v.inputSnapshot.metadata.workspaceRevision);}
 if(v.kind==='runtime'){require(CLARITY_COURSES[id]?.runtime==='cpp-console' && v.inputSnapshot!==null && v.workBinding!==null && v.inputSnapshot.languageId==='cpp');revision(v.providerId);}
 else {require(CLARITY_COURSES[id]?.runtime!=='cpp-console' && v.providerId===null && v.exitCode===null);if(v.inputSnapshot)require(v.inputSnapshot.languageId===CLARITY_COURSES[id].languageId);}
}
export function validateClarityDraft(id,v,{persisted=true}={}){
 const questions=topic(id);
 object(v,['schemaVersion','topicId','contentRevision','stateRevision','stage','positions','activeFile','cursor','answers','workBinding','reportDraft','lastResult']);
 require(v.schemaVersion===1 && v.topicId===id);revision(v.contentRevision);uint(v.stateRevision);require(!persisted || v.stateRevision>0);
 require(stages.includes(v.stage));object(v.positions,stages);
 for(const p of Object.values(v.positions)){object(p,['x','y']);for(const n of [p.x,p.y])require(Number.isFinite(n) && n>=0 && n<=10000000);}
 binding(v.workBinding,id);
 if(v.activeFile!==null)filePath(v.activeFile);
 if(v.cursor!==null){object(v.cursor,['start','end','direction','scrollTop','scrollLeft']);uint(v.cursor.start);uint(v.cursor.end);require(v.cursor.start<=v.cursor.end && ['forward','backward','none'].includes(v.cursor.direction));for(const n of [v.cursor.scrollTop,v.cursor.scrollLeft])require(Number.isFinite(n) && n>=0 && n<=10000000);require(v.activeFile!==null);}
 require(v.workBinding!==null || (v.activeFile===null && v.cursor===null),'R3_UNBOUND_FILE');
 require(record(v.answers));object(v.answers,Object.keys(v.answers));
 for(const [qid,a] of Object.entries(v.answers)){
  require(Object.hasOwn(questions,qid),'R3_QUESTION_REJECTED');object(a,['value','checked','contentRevision']);revision(a.contentRevision);require(typeof a.checked==='boolean');
  if(questions[qid]==='free'){text(a.value);limit(a.value,CLARITY_LIMITS.answer,'R3_ANSWER_TOO_LARGE');require(!a.checked,'R3_FREE_ANSWER_UNGRADED');}
  else require(Number.isInteger(a.value) && a.value>=0 && a.value<questions[qid]);
 }
 text(v.reportDraft);limit(v.reportDraft,CLARITY_LIMITS.reportDraft,'R3_REPORT_TOO_LARGE');result(v.lastResult,id);
 limit(canonicalJson(v),CLARITY_LIMITS.draft,'R3_DRAFT_TOO_LARGE');return v;
}
export function emptyClarityDraft(id){topic(id);return {schemaVersion:1,topicId:id,contentRevision:clarityContentRevision(id),stateRevision:0,stage:'explanation',positions:Object.fromEntries(stages.map(s=>[s,{x:0,y:0}])),activeFile:null,cursor:null,answers:{},workBinding:null,reportDraft:'',lastResult:null};}
export function prepareClarityDraft(id,proposed,{previous=null,expectedStateRevision}={}){
 uint(expectedStateRevision);if(previous!==null)validateClarityDraft(id,previous);
 const actual=previous?.stateRevision??0;require(actual===expectedStateRevision,'R3_STATE_CONFLICT');require(actual<Number.MAX_SAFE_INTEGER,'R3_REVISION_EXHAUSTED');
 validateClarityDraft(id,proposed,{persisted:false});require(proposed.stateRevision===expectedStateRevision,'R3_STATE_CONFLICT');
 const next=structuredClone(proposed);next.stateRevision=actual+1;if(next.lastResult?.inputSnapshot)next.lastResult.inputSnapshot.files.sort((a,b)=>compareUtf8(a.path,b.path));validateClarityDraft(id,next);return {value:next,serialized:canonicalJson(next)};
}
export function answerIsChecked(answer,currentRevision){return !!answer && typeof answer.value==='number' && answer.checked===true && answer.contentRevision===currentRevision;}
export function editClarityAnswer(id,draft,questionId,value){
 validateClarityDraft(id,draft,{persisted:false});const next=structuredClone(draft);
 next.answers[questionId]={value,checked:false,contentRevision:draft.contentRevision};validateClarityDraft(id,next,{persisted:false});return next;
}
export function resultMatches(v,{topicId,contentRevision,workBinding,workspaceRevision,inputSnapshot,runId}){
 if(!v || v.kind!=='runtime')return false;
 try{result(v,topicId);return v.contentRevision===contentRevision && v.runId===runId && canonicalJson(v.workBinding)===canonicalJson(workBinding) && v.workspaceRevision===workspaceRevision && snapshotJson(v.inputSnapshot)===snapshotJson(inputSnapshot);}catch{return false;}
}
// resolveWork вызывается adapter только после проверки Account/vault и ACL.
// Этот shape-check сам по себе не выдаёт права доступа по сохранённому ID.
export function validateWorkReferences(id,v,accessibleWork){
 validateClarityDraft(id,v,{persisted:false});if(v.workBinding===null)return true;
 require(accessibleWork && canonicalJson(accessibleWork.binding)===canonicalJson(v.workBinding),'R3_WORK_REFERENCE_INVALID');
 if(v.activeFile!==null){const f=accessibleWork.files.find(f=>f.path===v.activeFile);require(f && typeof f.content==='string','R3_WORK_REFERENCE_INVALID');if(v.cursor)require(v.cursor.end<=f.content.length,'R3_CURSOR_INVALID');}
 return true;
}
