// Предварительные проверки одного настоящего Ubuntu-контроля; это не результат Qt-сценария.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const root=process.cwd(),out=path.resolve(process.env.NEXUS_M6_EVIDENCE),baseline='7bafbe88e2eb07c972c33525afb8f0de365faa31';
assert.equal(process.platform,'linux');assert.equal(process.arch,'x64');
const osRelease=await readFile('/etc/os-release','utf8');assert.match(osRelease,/^ID=ubuntu$/m);
assert.equal(execFileSync('git',['-c','core.longpaths=true','rev-parse','HEAD'],{encoding:'utf8'}).trim(),baseline);
execFileSync('git',['-c','core.longpaths=true','diff','--exit-code','HEAD'],{stdio:'pipe'});
const driver=JSON.parse(await readFile('tools/qa-browser-driver/node_modules/playwright/package.json'));assert.equal(driver.version,'1.56.1');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex'),protectedBytes=[];
for(const file of ['project-studio/application-browser-panel.js','sandbox/qt/profile.js','tests/academy-gold-module6-fixture.mjs','tests/cpp-clarity-b6-qt-browser.mjs','.github/workflows/cpp-clarity-01.yml']){
 const actual=await readFile(file),expected=execFileSync('git',['-c','core.longpaths=true','show',baseline+':'+file]);assert.equal(hash(actual),hash(expected));protectedBytes.push({file,sha256:hash(actual)});
}
const {module6GoldPrograms}=await import(pathToFileURL(path.join(root,'tests/helpers/module6-gold-programs.mjs'))),unique=new Map();
for(const b of(await module6GoldPrograms({includeAuthored:true})).filter(b=>b.target==='qt-wasm')){
 const files=Object.fromEntries(Object.entries(b.files).filter(([name])=>name!=='README.md')),key=hash(JSON.stringify({source:b.source,files}));if(!unique.has(key))unique.set(key,b);
}
const program=[...unique.values()][12];
assert.equal(program.id,'application-build-delivery-authored-lab-reference-b2edb8c60e2c');assert.equal(program.sourceSha256,'42d063a804e360708339ea832eb411a5b4822093aee11d7979177b178b59e6de');
const sdk=JSON.parse(await readFile(path.join(out,'QT_BYTES.json')));assert.equal(sdk.status,'PASS');assert.equal(sdk.records.length,9);
const build=JSON.parse(await readFile(path.join(process.env.NEXUS_FRONTEND_DIR,'CLARITY_BUILD_SCOPE.json')));assert.equal(build.sourceCommit,baseline);assert.equal(build.production,false);
const {chromium}=await import(pathToFileURL(process.env.NEXUS_PLAYWRIGHT_MODULE));
const browser=await chromium.launch({headless:true,channel:'chromium',args:['--enable-unsafe-swiftshader','--use-angle=swiftshader']});let browserVersion;
try{browserVersion=browser.version();assert.equal(browserVersion,'141.0.7390.37');}finally{await browser.close();}
const proof={status:'PREFLIGHT PASS',platform:process.platform,arch:process.arch,osRelease,node:process.version,playwright:driver.version,browserVersion,sourceCommit:baseline,qaControlCommit:process.env.NEXUS_QT03_CONTROL_SHA,selectedBundleIndex:12,programId:program.id,sourceSha256:program.sourceSha256,SDK:sdk.records,protectedBytes,productChanged:false,QtIntegrationExecuted:false,originalFailureReproduced:false,productionWrites:0};
await writeFile(path.join(out,'B06_QT03_LINUX_PREFLIGHT.json'),JSON.stringify(proof,null,2)+'\n');console.log('PASS: Ubuntu, Chromium141, immutable7bafbe8, исходные SDK и программа index12');
