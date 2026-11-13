// Проверяет наблюдаемый вывод текущего запуска, не способ решения и не Mastery.
export function evaluateReferenceRun(contract,result,{current=true}={}){
 if(!contract)return null;
 if(!current)return {state:'stale',passed:0,total:contract.lines.length+1};
 if(!result||result.providerId==='pending')return {state:'unrun',passed:0,total:contract.lines.length+1};
 const output=String(result.output?.stdout??'').replace(/\r\n/g,'\n'),expected=contract.lines.join('\n')+'\n';
 const actualLines=output.replace(/\n$/,'').split('\n');
 const checks=[{ok:result.exitCode===0,expected:'exit code 0',actual:String(result.exitCode??'—')}];
 contract.lines.forEach((line,i)=>checks.push({ok:actualLines[i]===line,expected:line,actual:actualLines[i]??''}));
 const exact=output===expected||output===expected.slice(0,-1),passed=checks.filter(x=>x.ok).length;
 return {state:passed===checks.length&&exact?'passed':'failed',passed:exact?passed:Math.min(passed,checks.length-1),total:checks.length,checks,stdout:output,expected,extraOutput:!exact,compileOrRuntimeError:result.exitCode!==0};
}
