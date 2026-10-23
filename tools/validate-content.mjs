import {validateContentContract} from './content-contract-lib.mjs';
const result=validateContentContract(process.argv[2]||'.');
for(const name of result.passes)console.log('PASS '+name);
if(!result.ok){for(const error of result.errors)console.error('FAIL '+error);process.exit(1)}
console.log('CONTENT_CONTRACT_PASS',result.stats);
