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

console.log('RUNTIME_CAPABILITY_PASS',assessment.bestEffort.map(x=>x.id));
