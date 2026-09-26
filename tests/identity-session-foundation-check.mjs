import fs from 'node:fs';

const worker=fs.readFileSync(new URL('../cloudflare/nexus-sync-worker/src/index.js',import.meta.url),'utf8');
const migration=fs.readFileSync(new URL('../cloudflare/nexus-sync-worker/migrations/0004_identity_v2_session_foundation.sql',import.meta.url),'utf8');
const client=fs.readFileSync(new URL('../sync/identity-v2-client.js',import.meta.url),'utf8');
const account=fs.readFileSync(new URL('../core/account-shell.js',import.meta.url),'utf8');
const sw=fs.readFileSync(new URL('../service-worker.js',import.meta.url),'utf8');
const version=JSON.parse(fs.readFileSync(new URL('../version.json',import.meta.url),'utf8'));

const checks=[
  ['release version',version.version==='0.1.7-alpha.2.4.3'],
  ['worker session version',worker.includes("0.1.7-alpha.2.4.2-identity-foundation")],
  ['account_devices migration',migration.includes('CREATE TABLE IF NOT EXISTS account_devices')],
  ['account_sessions migration',migration.includes('CREATE TABLE IF NOT EXISTS account_sessions')],
  ['security events migration',migration.includes('CREATE TABLE IF NOT EXISTS identity_security_events')],
  ['session hash is unique',migration.includes('secret_hash TEXT NOT NULL UNIQUE')],
  ['session route capability',worker.includes("'/api/v2/auth/capabilities'")],
  ['legacy bridge route',worker.includes("'/api/v2/session/bridge'")],
  ['session list route',worker.includes("'/api/v2/sessions'")],
  ['device list route',worker.includes("'/api/v2/devices'")],
  ['session revocation',worker.includes('revokeIdentitySession')],
  ['session auth supports nxs',worker.includes('nxs_[A-Za-z0-9_-]')],
  ['legacy token remains supported',worker.includes('nxk_[A-Za-z0-9_-]')],
  ['bridge default is explicit env gate',worker.includes('IDENTITY_V2_BRIDGE_ENABLED')],
  ['capability checks schema readiness',worker.includes('sessionFoundation: schemaReady')&&worker.includes('FROM account_sessions')],
  ['disabled auth remains authoritative',worker.indexOf("mode === 'disabled'")<worker.indexOf('sessionMatch')],
  ['identity client supports capability endpoint',client.includes('/api/v2/auth/capabilities')],
  ['account shell exposes server status',account.includes('identityServerFoundation')&&account.includes('identitySessionFoundation')],
  ['service worker caches identity client',sw.includes('./sync/identity-v2-client.js')]
];

let failed=0;
for(const [name,ok] of checks){
  console.log(`${ok?'PASS':'FAIL'} ${name}`);
  if(!ok)failed++;
}
if(failed)process.exit(1);
