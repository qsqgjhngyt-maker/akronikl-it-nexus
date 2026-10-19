const QUEUE_KEY='akronikl:it-nexus:sync-queue:v1';
const now=()=>new Date().toISOString();
const clone=value=>JSON.parse(JSON.stringify(value));
const storage=()=>globalThis.localStorage||null;
const parse=(raw,fallback)=>{try{return raw?JSON.parse(raw):fallback}catch{return fallback}};
function loadDb(){return{schemaVersion:1,items:{},...parse(storage()?.getItem(QUEUE_KEY),{})}}
function saveDb(db){storage()?.setItem(QUEUE_KEY,JSON.stringify({...db,schemaVersion:1}));}

export function queueProjectSync({projectId,localRevision,workspaceId,ownerId,reason='local-change'}={}){
  if(!projectId)return null;
  const db=loadDb();
  db.items[projectId]={projectId,localRevision:Number(localRevision||0),workspaceId:workspaceId||null,ownerId:ownerId||null,reason,queuedAt:now(),attempts:0};
  saveDb(db);return clone(db.items[projectId]);
}
export function listQueuedProjectSync(){return Object.values(loadDb().items).sort((a,b)=>String(a.queuedAt).localeCompare(String(b.queuedAt))).map(clone)}
export function clearQueuedProjectSync(projectId){const db=loadDb();if(!db.items[projectId])return false;delete db.items[projectId];saveDb(db);return true}
export function syncQueueStorageKey(){return QUEUE_KEY}
