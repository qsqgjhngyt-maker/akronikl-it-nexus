import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const file='docs/ru/03-content/reference-courses-20261112/rollout-20261122/IMPLEMENTATION_BYTES.json';
const repairFile='docs/ru/03-content/reference-courses-20261112/C12_REPAIR_BYTES.json';
const referenceFile='docs/ru/03-content/reference-courses-20261112/APPROVED_REFERENCE_BYTES.json';
const candidateFile='docs/ru/03-content/cp-next-01/CANDIDATE_PRESENTATION_BYTES.json';
const editorialFile='docs/ru/03-content/cp-next-01/C17_EDITORIAL_PRESENTATION_BYTES.json';
const conditionsCIFile='docs/ru/03-content/cp-next-01/C17_CONDITIONS_CI_BYTES.json';
const helperPath='tests/helpers/course-rollout-bytes.mjs';
const sha=file=>createHash('sha256').update(readFileSync(file)).digest('hex');
export function verifyC17EditorialPins(receipt,previous,helperSha256){
 assert.equal(receipt.baseline,'b170c7f64ab70bb6f0499f10704ac38a1d75e97c','C17 editorial baseline');
 assert.equal(receipt.sourceCommit,'241809418a06c139da028dd0be589f170e3068b0','C17 editorial source');
 assert.deepEqual(receipt.files,[{
  path:'core/blog-presentation.js',
  beforeSha256:'2a07fa690163b2a11adfcae257350fb6094078b7aea503503855427a375389bb',
  newSha256:'970db837c514d1ea6321a767d4ff4d751bbac691843ac10c18cd0a9fc704064f',
 },{
  path:'core/blog-publications-20261109.js',
  beforeSha256:'5832b4d3d61d6a9fe5359bcd9643c379224f268e31b4544193001632963c110e',
  newSha256:'6f3b8831fb83137096fbec91de68378c0067627aa1405b587f78f586a7dfb50a',
 },{
  path:'core/content-public.js',
  beforeSha256:'095d41a45f79a8ab249e2e507575a8573e621f7b3997b50461c692ec668d70b1',
  newSha256:'23deb6c687104515b9fd0b4bd5f6287d4ae44840a83b1e6936a61acc27b7b5f9',
 }],'Exact C17 editorial files and bytes');
 const protectedPins=[{
  path:'pwa/durable-store.js',
  beforeSha256:'d80c006eae211e88c7c75e1af00a0c41eb38be308d9123af7ede6ee2aeae5d61',
  newSha256:'f67b8464fe8e5eb1e4a6eea7ec0afeaca7230ea7bf1dc94cd79b1f9eaf58601c',
 },{
  path:'server-access/public/entry.html',
  beforeSha256:'df5603e07e6ff3edc8c988676a85041e2134cd668e95321d6187be39aa4e8372',
  newSha256:'5d6f8c5ff016d4b7721289fb8531daf3db74b61d1d2abaa1e5de490bcf8e6ada',
 },{
  path:'server-access/public/entry.js',
  beforeSha256:'bc4e80becd037e42f074f0f4ff602ceb4100e3d6b492317250853e9715f4afbd',
  newSha256:'437039bf344035f84c775461ce78154497eda65c97fa42524c1296a661cc9089',
 }];
 assert.deepEqual(receipt.protected,protectedPins,'Exact C17 protected files and bytes');
 for(const pin of receipt.files)assert.equal(previous.get(pin.path)?.newSha256,pin.beforeSha256,'Previous presentation pin: '+pin.path);
 for(const pin of protectedPins){
  const prior=previous.get(pin.path);
  if(prior)assert.equal(prior.newSha256,pin.beforeSha256,'Previous protected pin: '+pin.path);
 }
 assert.deepEqual(receipt.verifier,{
  path:helperPath,
  beforeSha256:'87092e3c5a322e04e666aa71976e23370ce23bc26e558a75b7ce49eb0e978bad',
  newSha256:helperSha256,
 },'Exact C17 test verifier bytes');
 assert.equal(previous.get(helperPath)?.newSha256,receipt.verifier.beforeSha256,'Previous verifier pin: '+helperPath);
 return [...receipt.files,...protectedPins,receipt.verifier];
}
export function verifyC17ConditionsCIPins(receipt,previous,helperSha256){
 const testPath='tests/cpp-clarity-onec-p2-conditions-content.test.mjs';
 assert.equal(receipt.baselineCI,'ec1dcb71731ef3c2fdef912ee641a4079c4ef3c9','C17 conditions CI baseline');
 assert.equal(receipt.sourceCommit,'39588ecca9dfb577714c81c83a228663cf5a5e4b','C17 conditions CI product');
 assert.deepEqual(receipt.test,{
  path:testPath,
  beforeSha256:'603b4d33a7159dc3a02cedb827902a8253499a8a2889159a462bbb7ae68f528d',
  newSha256:'83ec4735091d32ba194b7e5086b206242c0c0691eb31c13de636a18e1bbd8c36',
 },'Exact C17 conditions test bytes');
 assert.deepEqual(receipt.verifier,{
  path:helperPath,
  beforeSha256:'83c2c336c579b6e5a601c1f5dcfde865efb79f89623348d94ffec3e340a11446',
  newSha256:helperSha256,
 },'Exact C17 conditions verifier bytes');
 const pins=[receipt.test,receipt.verifier];
 for(const pin of pins)assert.equal(previous.get(pin.path)?.newSha256,pin.beforeSha256,'Previous C17 CI pin: '+pin.path);
 return pins;
}
const historicalPins=existsSync(file)?JSON.parse(readFileSync(file)).files:[];
export const releaseRepairPins=existsSync(repairFile)?JSON.parse(readFileSync(repairFile)).files:[];
const activePins=new Map(historicalPins.map(pin=>[pin.path,pin]));
for(const pin of releaseRepairPins){
 const previous=activePins.get(pin.path);
 if(previous)assert.equal(pin.beforeSha256,previous.newSha256,'Previous rollout pin: '+pin.path);
 activePins.set(pin.path,pin);
}
if(existsSync(candidateFile)){
 const candidate=JSON.parse(readFileSync(candidateFile)).files;
 const reference=new Map(JSON.parse(readFileSync(referenceFile)).files.map(pin=>[pin.path,pin]));
 const acceptedBaseline=new Map([
  ['sandbox/providers/wasm-runtime.js',{newSha256:'8161b23afebee8e6f80688c487d16ed5b7f84d91fdc66604c1cb2ef591c876ea'}],
  ['pwa/offline-entry.js',{newSha256:'37277ced6d328bd659e2bbbca089e64113a506d6fbb3014d476393c5e820fae2'}],
 ]);
 for(const pin of candidate){
  const previous=activePins.get(pin.path)||reference.get(pin.path)||acceptedBaseline.get(pin.path);
  assert.ok(previous,'Existing presentation pin: '+pin.path);
  assert.equal(pin.beforeSha256,previous.newSha256,'Previous presentation pin: '+pin.path);
  activePins.set(pin.path,pin);
 }
}
for(const module of ['M2','M3','M4','M5','M6','M7','M8','CP_FULL']){
 const pinFile='docs/ru/03-content/cp-next-01/'+module+'_PRESENTATION_BYTES.json';
 if(!existsSync(pinFile))continue;
 for(const pin of JSON.parse(readFileSync(pinFile)).files){
  const previous=activePins.get(pin.path);
  assert.ok(previous,'Existing presentation pin for '+module+': '+pin.path);
  assert.equal(pin.beforeSha256,previous.newSha256,'Previous presentation pin for '+module+': '+pin.path);
  activePins.set(pin.path,pin);
 }
}
const conditionsCI=existsSync(conditionsCIFile)?JSON.parse(readFileSync(conditionsCIFile)):null;
if(existsSync(editorialFile)){
 const reference=JSON.parse(readFileSync(referenceFile)).files;
 const previous=new Map([...reference,...activePins.values()].map(pin=>[pin.path,pin]));
 const receipt=JSON.parse(readFileSync(editorialFile));
 const editorialHelperSha256=conditionsCI?.verifier.beforeSha256??sha(helperPath);
 for(const pin of verifyC17EditorialPins(receipt,previous,editorialHelperSha256))activePins.set(pin.path,pin);
}
if(conditionsCI){
 for(const pin of verifyC17ConditionsCIPins(conditionsCI,activePins,sha(helperPath)))activePins.set(pin.path,pin);
}
export const rolloutPins=[...activePins.values()];
const digests=new Map(rolloutPins.map(p=>[p.path,p.newSha256]));
export const rolloutDigest=(file,previous)=>digests.get(file)||previous;
export function assertRolloutBytes(){for(const p of rolloutPins)assert.equal(createHash('sha256').update(readFileSync(p.path)).digest('hex'),p.newSha256,'Точные bytes распространения: '+p.path);}
