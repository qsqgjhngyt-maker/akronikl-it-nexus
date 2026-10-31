import{spawnSync}from'node:child_process';import fs from'node:fs';import path from'node:path';
const out=path.resolve(process.env.ONEC_REGRESSION_EVIDENCE||'onec-regression-evidence');fs.mkdirSync(out,{recursive:true});
const commands=[
 ['ONEC_HISTORICAL_ROUTE_UNIT',['--test','tests/onec-historical-routing.test.mjs']],['CPP_SHARED_STARTUP_UNIT',['--test','tests/platform-lazy-imports.test.mjs','tests/platform-startup-load.test.mjs','tests/cpp-stream-state-routing.test.mjs']],
 ['ONEC_PWA_FRAGMENT_UNIT',['--test','tests/onec-pwa-fragment.test.mjs']],
 ['CPP_FINAL_CLIENT_UNIT',['--test','tests/course-final-client.test.mjs']],['CPP_FINAL_CONTRACT_UNIT',['--test','tests/course-final-contract.test.mjs']],['CPP_FINAL_AUTOMATIC_UNIT',['--test','tests/course-final-automatic.test.mjs']],['GRAPHICS_OFFLINE',['tests/offline-graphics-adapter-check.mjs']],
 ['ONEC_COMPLETE_UNIT',['--test','tests/onec-complete.test.mjs']],['ONEC_PROJECT_WRITER_UNIT',['--test','tests/onec-writer.test.mjs']],['ONEC_NATIVE_FULL_EVIDENCE',['--test','tests/onec-native-full.test.mjs']],
 ['ONEC_STUDIO_REVIEW_UNIT',['--test','tests/onec-studio-review.test.mjs']],
 ['ONEC_STUDIO_UNIT',['--test','tests/onec-studio.test.mjs']],
 ['CONTENT_REVIEW_GENERIC',['tools/check-content-review.mjs']],['CONTENT_ROUTE_UNIT',['--test','tests/content-publication-route.test.mjs']],['INTRO_ROUTE_REGRESSION',['--test','tests/startup-intro-contract.test.mjs']],
 ['CP11',['tools/validate-content.mjs']],['CP11_UNIT',['--test','tests/content-contract.test.mjs']],['ONEC_UNIT',['--test','tests/onec-content.test.mjs']],['CONSOLIDATION_GATE',['tools/check-onec-consolidation.mjs']],['CONSOLIDATION_UNIT',['--test','tests/onec-consolidation.test.mjs']],
 ...['production-entry-syntax-check','benchmark-content-check','lesson-standard-freeze-check','programming-language-catalog-check','public-content-check','shared-learning-views-check','module-import-smoke-check','code-studio-foundation-check','project-studio-foundation-check','offline-learning-check','pwa-policy-check','cloud-sync-client-transport-check','cloud-sync-session-first-migration-check','cloud-sync-ui-check','cloud-unified-client-check'].map(name=>[name,[`tests/${name}.mjs`]]),
 ['PERF',['tools/check-cpp-course-perf.mjs']],['PRESERVATION',['tools/check-onec-preservation.mjs']]
];
const rows=[];for(const [name,args]of commands){const result=spawnSync(process.execPath,args,{encoding:'utf8',maxBuffer:5000000});fs.writeFileSync(path.join(out,name+'.txt'),(result.stdout||'')+(result.stderr||''));rows.push({name,exitCode:result.status,status:result.status===0?'PASS':'FAIL'});console.log(rows.at(-1).status+' '+name);}
const report={status:rows.every(x=>x.status==='PASS')?'AUTOMATED PASS':'FAIL',checks:rows};fs.writeFileSync(path.join(out,'REGRESSION_RESULT.json'),JSON.stringify(report,null,2)+'\n');if(report.status==='FAIL')process.exitCode=1;
