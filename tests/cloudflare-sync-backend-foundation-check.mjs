import fs from 'node:fs';
const root=new URL('../',import.meta.url);const assert=(v,m)=>{if(!v)throw new Error(m)};
const worker=fs.readFileSync(new URL('cloudflare/nexus-sync-worker/src/index.js',root),'utf8');
const schema=fs.readFileSync(new URL('cloudflare/nexus-sync-worker/migrations/0001_sync_team_foundation.sql',root),'utf8');
const wrangler=fs.readFileSync(new URL('cloudflare/nexus-sync-worker/wrangler.jsonc.example',root),'utf8');
const readme=fs.readFileSync(new URL('cloudflare/nexus-sync-worker/README.md',root),'utf8');
const acl=fs.readFileSync(new URL('collaboration/access-control.js',root),'utf8');
for(const table of ['workspaces','workspace_members','projects','project_members','project_access_policies','project_revisions','project_checkpoints','project_invites','audit_events'])assert(schema.includes(`CREATE TABLE IF NOT EXISTS ${table}`),`D1 schema missing ${table}`);
for(const token of [
  "AUTH_MODE||'disabled'",
  "DEV_AUTH_FORBIDDEN",
  "evaluateProjectAccess",
  "REVISION_CONFLICT",
  "snapshotKey(workspaceId,projectId,revision)",
  "env.SNAPSHOTS.put(key",
  "changedFiles(previousSnapshot,incoming)",
  "for(const change of fileChanges)await requireAction",
  "INSERT INTO audit_events",
  ".prepare('",
  ".bind("
])assert(worker.includes(token),`Worker security/foundation token missing: ${token}`);
assert(acl.includes("reason:'explicit-deny'"),'shared ACL must implement explicit DENY precedence');
assert(!worker.includes('r2Key=payload')&&!worker.includes('incoming.r2Key'),'Worker must not accept a client-provided R2 key');
for(const token of ['"d1_databases"','"r2_buckets"','"AUTH_MODE": "disabled"'])assert(wrangler.includes(token),`Wrangler example missing ${token}`);
for(const token of ['safe-by-default','D1','R2','Explicit `deny`','HTTP 409'])assert(readme.includes(token),`Cloudflare README missing ${token}`);

const {default:workerModule}=await import('../cloudflare/nexus-sync-worker/src/index.js');
let response=await workerModule.fetch(new Request('https://sync.example/api/v1/health'),{AUTH_MODE:'disabled'});
let payload=await response.json();assert(response.status===200&&payload.ok===true&&payload.version==='0.1.7-alpha.2.1','Worker health smoke failed');
response=await workerModule.fetch(new Request('https://sync.example/api/v1/projects'),{AUTH_MODE:'disabled'});
payload=await response.json();assert(response.status===503&&payload.error?.code==='AUTH_NOT_CONFIGURED','Protected route must stay closed before account auth is configured');

console.log('CLOUDFLARE_SYNC_BACKEND_FOUNDATION_PASS');
