import fs from 'node:fs';

const account=fs.readFileSync(new URL('../core/account-shell.js',import.meta.url),'utf8');
const client=fs.readFileSync(new URL('../sync/identity-v2-client.js',import.meta.url),'utf8');
const version=JSON.parse(fs.readFileSync(new URL('../version.json',import.meta.url),'utf8'));

const checks=[
  ['release version',version.version==='0.1.7-alpha.2.4.5'],
  ['transport summary has stable id',account.includes('id="identityTransportSummary"')],
  ['migration state has stable id',account.includes('id="identityMigrationState"')],
  ['migration mode has stable id',account.includes('id="identityMigrationMode"')],
  ['migration rollback has stable id',account.includes('id="identityMigrationRollback"')],
  ['reactive summary helper exists',account.includes('function refreshIdentityCredentialSummary')],
  ['helper reads canonical credential state',account.includes('const credential=identityV2CredentialState();')],
  ['helper updates transport text',account.includes("transport.textContent=identityTransportLabel(credential.mode,en)" )],
  ['helper updates migration mode',account.includes("mode.textContent=identityTransportLabel(credential.mode,en)" )],
  ['helper updates rollback label',account.includes("rollback.textContent=credential.rollbackAvailable")],
  ['helper updates state class',account.includes("migration.classList.add(['nexus-cookie','nexus-session'].includes(credential.mode)?'ok':'warn')")],
  ['live refresh synchronizes summary',account.includes('const currentCredential=refreshIdentityCredentialSummary(locale);')],
  ['bind initializes summary',account.includes('refreshIdentityCredentialSummary(locale);\n  refreshIdentityDevicesSessions(locale);')],
  ['current revoke still clears temporary credential',client.includes('if(current){clearIdentityV2SessionCredential();clearIdentityV2CookieSessionMarker();}')],
  ['current-device revoke still clears temporary credential',client.includes('if(currentDevice){clearIdentityV2SessionCredential();clearIdentityV2CookieSessionMarker();}')]
];

let failed=0;
for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${name}`);if(!ok)failed++;}
if(failed)process.exit(1);
