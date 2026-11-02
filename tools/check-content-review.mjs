import fs from 'node:fs';import assert from 'node:assert/strict';import{validateSchema}from'./content-contract-lib.mjs';
const json=p=>JSON.parse(fs.readFileSync(p,'utf8')),schema=json('content/schemas/content-package-v1.schema.json'),packages=[];
for(const entry of fs.readdirSync('courses',{withFileTypes:true}).filter(e=>e.isDirectory())){
 const p=`courses/${entry.name}/content-package.json`;if(!fs.existsSync(p))continue;const data=json(p);assert.equal(data.courseId,entry.name,'COURSE_ROOT_ID '+p);assert.deepEqual(validateSchema(schema,data),[],'CP11 '+p);packages.push({courseId:data.courseId,path:p,contentVersion:data.contentVersion});
}
assert.ok(packages.length,'NO_CONTENT_PACKAGES');console.log(JSON.stringify({status:'AUTOMATED PASS',scope:'generic CP-1.1 schema only; course-specific gates remain separate',publicationRequested:false,releaseEligible:false,packages},null,2));
