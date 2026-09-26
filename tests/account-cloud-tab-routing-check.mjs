import fs from 'node:fs';

const account=fs.readFileSync(new URL('../core/account-shell.js',import.meta.url),'utf8');

const checks=[
  ['cloud content block exists',account.includes("const cloud=`<div class=\"account-grid\">")],
  ['cloud mapping is explicit',account.includes("current==='cloud'?cloud")],
  ['cloud configure button exists',account.includes('id="accountCloudConfigure"')],
  ['cloud disconnect conditional exists',account.includes('id="accountCloudDisconnect"')],
  ['local state has connect label',account.includes("Connect Nexus Cloud")&&account.includes("Подключить Nexus Cloud")],
  ['linked state has change label',account.includes("Change connection")&&account.includes("Изменить подключение")],
  ['linked state has disconnect label',account.includes("Disconnect on this device")&&account.includes("Отключить на этом устройстве")],
  ['security remains separate fallback',account.includes("const security=`")&&account.includes("current==='devices'?devices:security")]
];

let failed=0;
for(const [name,ok] of checks){
  console.log(`${ok?'PASS':'FAIL'} ${name}`);
  if(!ok)failed++;
}
if(failed)process.exit(1);
