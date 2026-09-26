import fs from 'node:fs';

const account=fs.readFileSync(new URL('../core/account-shell.js',import.meta.url),'utf8');
const app=fs.readFileSync(new URL('../core/app.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../styles/app.css',import.meta.url),'utf8');
const sw=fs.readFileSync(new URL('../service-worker.js',import.meta.url),'utf8');
const version=JSON.parse(fs.readFileSync(new URL('../version.json',import.meta.url),'utf8'));

const checks=[
  ['release version',version.version==='0.1.7-alpha.2.4.1'],
  ['account module imported',app.includes("from './account-shell.js'")],
  ['global account chip rendered',app.includes('accountChipMarkup(prefs.uiLocale)')],
  ['home account card rendered',app.includes('accountHomeCardMarkup(prefs.uiLocale)')],
  ['account route rendered',app.includes("r.view==='account'")&&app.includes('accountPageMarkup')],
  ['account shell binding active',app.includes('bindAccountShell')],
  ['service worker caches account module',sw.includes('./core/account-shell.js')],
  ['cloud identity summary used',account.includes('cloudflareSyncSummary')],
  ['local identity used',account.includes('loadLocalIdentity')],
  ['token value never read by account shell',!account.includes('.token')&&!account.includes("['token']")],
  ['planned providers visible',account.includes('Yandex ID')&&account.includes('Google')&&account.includes('Apple')&&account.includes('Passkey')],
  ['disconnect is device-local current bridge',account.includes('disconnectCloudAccount')],
  ['account styles present',css.includes('Nexus Account Shell Foundation')&&css.includes('.account-menu')&&css.includes('.account-page')]
];

let failed=0;
for(const [name,ok] of checks){
  console.log(`${ok?'PASS':'FAIL'} ${name}`);
  if(!ok)failed++;
}
if(failed)process.exit(1);
