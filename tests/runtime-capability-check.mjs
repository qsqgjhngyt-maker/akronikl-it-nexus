import {browserRuntimeProvider} from '../sandbox/providers/browser-runtime.js';
import {analyzeSource,parseRuntimeError} from '../sandbox/diagnostics.js';

const assert=(v,m)=>{if(!v)throw new Error(m)};
const oop=`#include <iostream>
class Device { public: virtual void info(){} };
class Printer: public Device { public: void info() override {} };
int main(){Printer p;p.info();return 0;}`;
const assessment=browserRuntimeProvider.inspect(oop);
for(const id of ['cpp.class','cpp.inheritance','cpp.virtual','cpp.override'])assert(assessment.bestEffort.some(x=>x.id===id),`missing feature ${id}`);
const normalized=browserRuntimeProvider.normalize(oop);
assert(normalized.capability.confidence==='best-effort','OOP source must be best-effort in Browser Runtime');
const analysis=analyzeSource(oop,[]);
const err=new Error('Parsing Failure: line 3 (column 44): Expected token');
err.anxCapability=assessment;
const diag=parseRuntimeError(err,oop,{analysis,capability:assessment,locale:'ru'});
assert(diag.kind==='provider-limit','advanced OOP parse failure must be classified as provider limit when static shape is clean');
assert(diag.providerLimit===true,'providerLimit flag missing');
const broken='int main( { return 0; }';
const brokenAnalysis=analyzeSource(broken,[]);
const brokenErr=new Error('Parsing Failure: line 1 (column 10): Expected )');
brokenErr.anxCapability=browserRuntimeProvider.inspect(broken);
const brokenDiag=parseRuntimeError(brokenErr,broken,{analysis:brokenAnalysis,capability:brokenErr.anxCapability,locale:'ru'});
assert(brokenDiag.kind!=='provider-limit','real structural error must not be hidden as provider limitation');

// Runtime-copy compatibility retry: learner source must remain unchanged.
globalThis.window={JSCPP:{run(code,stdin,opts){
  if(/\boverride\b/.test(code))throw new Error('Parsing Failure: line 3 (column 44): Expected {');
  opts?.stdio?.write?.('OOP_OK\n');
  return 0;
}}};
const retry=await browserRuntimeProvider.run(oop,'');
assert(retry.compatibilityRetry===true,'override parser failure must trigger one safe compatibility retry');
assert(retry.stdout.includes('OOP_OK'),'compatibility retry must preserve stdout');
assert(retry.normalized.original===oop,'learner source must remain byte-for-byte unchanged by runtime adapter');
assert(!/\boverride\b/.test(retry.normalized.code),'temporary runtime copy should remove override after first parse failure');
assert(retry.normalized.changes.some(x=>x.includes('override')),'adapter changes must disclose override retry');
delete globalThis.window;

// Live regression: first attempt fails on `override`, then the safe temporary
// compatibility retry fails deeper inside the lightweight provider. This is an
// environment-capability warning, not a learner-code error.
globalThis.window={JSCPP:{run(code){
  if(/\boverride\b/.test(code))throw new Error('Parsing Failure: line 3 (column 44): Expected {');
  throw new Error('Lightweight runtime cannot execute virtual dispatch');
}}};
let liveRetryError=null;
try{await browserRuntimeProvider.run(oop,'')}catch(error){liveRetryError=error}
assert(liveRetryError,'failed compatibility retry must surface an error object');
const liveRetryDiag=parseRuntimeError(liveRetryError,oop,{analysis,capability:assessment,locale:'ru'});
assert(liveRetryDiag.kind==='provider-limit','failed OOP compatibility retry must be classified as provider limit');
assert(liveRetryDiag.providerLimit===true,'live retry providerLimit flag missing');
assert(liveRetryDiag.compatibilityRetryFailed===true,'compatibility retry failure metadata missing');
assert(liveRetryDiag.line===null,'provider limitation must not highlight a learner source line as erroneous');
assert(liveRetryDiag.raw.includes('Первичная попытка Browser Runtime'),'technical output must preserve the primary parser failure');
assert(liveRetryDiag.raw.includes('Compatibility retry'),'technical output must preserve the retry failure');
delete globalThis.window;

// Live regression 2: JSCPP can reject a valid standard C++ header that is
// absent from its embedded teaching library. A known standard header must be
// reported as a provider limitation, while a misspelled/non-standard header
// must remain a learner-visible source/runtime error.
const stringSource=`#include <iostream>
#include <string>
using namespace std;
int main(){string name="Office";cout<<name;return 0;}`;
const stringAnalysis=analyzeSource(stringSource,[]);
const stringErr=new Error('2:1 cannot find library: string');
stringErr.anxCapability=browserRuntimeProvider.inspect(stringSource);
const stringDiag=parseRuntimeError(stringErr,stringSource,{analysis:stringAnalysis,capability:stringErr.anxCapability,locale:'ru'});
assert(stringDiag.kind==='provider-limit','missing standard <string> in Browser Runtime must be a provider limit');
assert(stringDiag.providerLimit===true,'missing standard header providerLimit flag missing');
assert(stringDiag.missingStdLibrary==='string','missing standard header name must be preserved');
assert(stringDiag.line===null,'provider missing-standard-library must not mark learner source line as erroneous');
assert(stringDiag.explanation.includes('<string>'),'provider-limit explanation must name the missing standard header');

const typoHeaderSource=`#include <strng>
int main(){return 0;}`;
const typoHeaderAnalysis=analyzeSource(typoHeaderSource,[]);
const typoHeaderErr=new Error('1:1 cannot find library: strng');
typoHeaderErr.anxCapability=browserRuntimeProvider.inspect(typoHeaderSource);
const typoHeaderDiag=parseRuntimeError(typoHeaderErr,typoHeaderSource,{analysis:typoHeaderAnalysis,capability:typoHeaderErr.anxCapability,locale:'ru'});
assert(typoHeaderDiag.kind!=='provider-limit','unknown/misspelled header must not be hidden as provider limitation');
assert(typoHeaderDiag.line===1&&typoHeaderDiag.column===1,'line:column format must be preserved for a real missing-header error');

console.log('RUNTIME_CAPABILITY_PASS' ,assessment.bestEffort.map(x=>x.id));
