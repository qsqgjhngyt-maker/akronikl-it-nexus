import fs from 'node:fs';
const project=fs.readFileSync(new URL('../project-studio/project-studio.js',import.meta.url),'utf8');
const account=fs.readFileSync(new URL('../core/account-shell.js',import.meta.url),'utf8');
const version=JSON.parse(fs.readFileSync(new URL('../version.json',import.meta.url),'utf8'));
const checks=[
 ['release version',version.version==='0.1.7-alpha.2.4.5'],
 ['projects dashboard setup button removed',!project.includes('id=\"psCloudSetup\"')],
 ['projects dashboard retains cloud import',project.includes('id=\"psCloudImport\"')],
 ['unconfigured cloud import routes to account',project.includes("location.hash='#view=account&tab=cloud'")],
 ['project sync settings routes to account',project.includes("#psCloudConfigure")&&project.includes("#view=account&tab=cloud")],
 ['account has dedicated cloud tab',account.includes("['cloud',en?'Nexus Cloud':'Nexus Cloud']")],
 ['account cloud configure control exists',account.includes('id=\"accountCloudConfigure\"')],
 ['account cloud disconnect control exists',account.includes('id=\"accountCloudDisconnect\"')],
 ['account owns setup helper',account.includes('runAccountCloudSetup')&&account.includes('connectCloudAccount')&&account.includes('bootstrapCloudAccount')],
 ['raw configured token not read by Account Center',!account.includes('.token')&&!account.includes("['token']")],
 ['responsibility contract visible',account.includes('PROJECT SYNC · RESPONSIBILITY')&&account.includes('Открытый проект · SYNC')]
];
let failed=0;for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${name}`);if(!ok)failed++;}if(failed)process.exit(1);
