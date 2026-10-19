const AUDIT_KEY='akronikl:it-nexus:audit:v1';
const now=()=>new Date().toISOString();
const clone=value=>JSON.parse(JSON.stringify(value));
const storage=()=>globalThis.localStorage||null;
const parse=(raw,fallback)=>{try{return raw?JSON.parse(raw):fallback}catch{return fallback}};
const uid=()=>`audit-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,9)}`;
function loadDb(){return{schemaVersion:1,events:[],...parse(storage()?.getItem(AUDIT_KEY),{})}}
function saveDb(db){storage()?.setItem(AUDIT_KEY,JSON.stringify({...db,schemaVersion:1}));}

export function appendAuditEvent(projectId,event={}){
  if(!projectId)throw new Error('projectId is required');
  const db=loadDb();
  const item={
    id:event.id||uid(),projectId,actorId:event.actorId||null,
    action:String(event.action||'project.changed'),scope:String(event.scope||'/'),
    entityType:String(event.entityType||'project'),entityId:event.entityId||projectId,
    revisionBefore:event.revisionBefore??null,revisionAfter:event.revisionAfter??null,
    summary:String(event.summary||''),meta:clone(event.meta||{}),createdAt:event.createdAt||now()
  };
  db.events.push(item);
  if(db.events.length>4000)db.events=db.events.slice(-4000);
  saveDb(db);return clone(item);
}

export function listAuditEvents(projectId,{limit=30}={}){
  return loadDb().events.filter(item=>item.projectId===projectId).sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt))).slice(0,limit).map(clone);
}
export function auditStorageKey(){return AUDIT_KEY}
