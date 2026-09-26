import fs from 'node:fs';

const client=fs.readFileSync(new URL('../sync/identity-v2-client.js',import.meta.url),'utf8');
const account=fs.readFileSync(new URL('../core/account-shell.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../styles/app.css',import.meta.url),'utf8');
const worker=fs.readFileSync(new URL('../cloudflare/nexus-sync-worker/src/index.js',import.meta.url),'utf8');
const version=JSON.parse(fs.readFileSync(new URL('../version.json',import.meta.url),'utf8'));

const checks=[
  ['release version',version.version==='0.1.7-alpha.2.4.3'],
  ['session credential is sessionStorage-only',client.includes("sessionStorage")&&!client.includes("localStorage")],
  ['formal server-session storage key',client.includes('akronikl:it-nexus:identity-v2:session:v1')],
  ['session-first resolver',client.includes("mode=sessionCredential")&&client.includes("'nexus-session'")],
  ['legacy rollback resolver',client.includes("legacyCredential")&&client.includes("'legacy-token'")&&client.includes('rollbackAvailable')],
  ['stale session clears before fallback',client.includes('clearIdentityV2SessionCredential();')&&client.includes('mayFallback')],
  ['sessions API client',client.includes("'/api/v2/sessions'")],
  ['devices API client',client.includes("'/api/v2/devices'")],
  ['session revoke client',client.includes('revokeIdentityV2Session')],
  ['device revoke client',client.includes('revokeIdentityV2Device')],
  ['no bridge auto-enable in frontend',!client.includes('IDENTITY_V2_BRIDGE_ENABLED')&&!account.includes('/api/v2/session/bridge')],
  ['real devices/sessions panel',account.includes('identityDevicesSessions')&&account.includes('Server devices')&&account.includes('Server sessions')],
  ['current-device marker',account.includes('data-current-device')&&account.includes('ЭТО УСТРОЙСТВО')],
  ['session revoke confirmation/action',account.includes('data-identity-action="revoke-session"')&&account.includes('confirm(')],
  ['device revoke confirmation/action',account.includes('data-identity-action="revoke-device"')&&account.includes('confirm(')],
  ['raw token not rendered by account shell',!account.includes('.token')&&!account.includes("['token']")],
  ['responsive runtime UI styles',css.includes('Devices & Sessions / Session Migration Foundation')&&css.includes('.identity-runtime-columns')],
  ['worker already exposes list sessions',worker.includes("'/api/v2/sessions'")],
  ['worker already exposes list devices',worker.includes("'/api/v2/devices'")],
  ['worker already exposes revoke',worker.includes('revokeIdentitySession')&&worker.includes('revokeIdentityDevice')]
];

let failed=0;
for(const [name,ok] of checks){
  console.log(`${ok?'PASS':'FAIL'} ${name}`);
  if(!ok)failed++;
}
if(failed)process.exit(1);
