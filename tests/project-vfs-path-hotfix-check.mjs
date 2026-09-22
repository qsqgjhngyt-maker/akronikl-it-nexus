import fs from 'node:fs';
import {flatFilesToVirtualTree,flattenVirtualTree} from '../sandbox/virtual-files.js';
import {createProjectBuildPlan,projectRuntimeRequest} from '../project-studio/project-build.js';

const assert=(value,message)=>{if(!value)throw new Error(message)};
const files={
  'src/main.cpp':'#include "project.hpp"\nint main(){return value();}\n',
  'src/core/value.cpp':'#include "project.hpp"\nint value(){return 0;}\n',
  'include/project.hpp':'#pragma once\nint value();\n',
  'tests/project_tests.cpp':'int main(){return 0;}\n'
};
const tree=flatFilesToVirtualTree(files);
assert(tree.src?.['main.cpp']===files['src/main.cpp'],'Nested src/main.cpp was not mounted as a directory tree');
assert(tree.src?.core?.['value.cpp']===files['src/core/value.cpp'],'Nested src/core/value.cpp was not mounted recursively');
assert(tree.include?.['project.hpp']===files['include/project.hpp'],'include/project.hpp missing from VFS tree');
assert(tree.tests?.['project_tests.cpp']===files['tests/project_tests.cpp'],'tests/project_tests.cpp missing from VFS tree');
const roundTrip=flattenVirtualTree(tree);for(const [path,value] of Object.entries(files))assert(roundTrip[path]===value,`VFS round-trip mismatch: ${path}`);

const project={languageId:'cpp',manifest:{entryFile:'src/main.cpp',sourceRoots:['src'],includeRoots:['include'],testRoots:['tests']},workspace:{languageId:'cpp',entryFile:'src/main.cpp',files:Object.entries(files).map(([path,content])=>({path,content,languageId:'cpp'}))}};
const runPlan=createProjectBuildPlan(project,'run');
assert(runPlan.translationUnits.includes('src/main.cpp'),'Run build lost entry translation unit');
assert(runPlan.translationUnits.includes('src/core/value.cpp'),'Run build lost nested production TU');
assert(!runPlan.translationUnits.includes('tests/project_tests.cpp'),'Run build must exclude tests');
assert(runPlan.includeRoots.includes('include'),'Project include root missing');
const testPlan=createProjectBuildPlan(project,'tests');
assert(testPlan.translationUnits.includes('tests/project_tests.cpp'),'Test build must include test TU');
assert(!testPlan.translationUnits.includes('src/main.cpp'),'Test build must not force the production main entry');

const studio={runtimeRequest:stdin=>({languageId:'cpp',source:files['src/main.cpp'],stdin,files,entryFile:'src/main.cpp',metadata:{workspaceRevision:7}})};
const request=projectRuntimeRequest(studio,project,'','run');
assert(request.metadata.origin==='project-studio','Project runtime origin missing');
assert(request.metadata.translationUnits.includes('src/core/value.cpp'),'Runtime build plan missing nested production TU');
assert(!request.metadata.translationUnits.includes('tests/project_tests.cpp'),'Runtime request leaked tests into Run build');
assert(request.metadata.includeRoots[0]==='include','Runtime request include roots missing');

const worker=fs.readFileSync(new URL('../sandbox/workers/wasm-runtime-worker.js',import.meta.url),'utf8');
for(const token of ['flatFilesToVirtualTree(virtualFiles)','includeArgs(request)','request?.metadata?.translationUnits'])assert(worker.includes(token),`WASM worker nested-VFS marker missing: ${token}`);
console.log('PROJECT_VFS_PATH_HOTFIX_PASS',runPlan.translationUnits.join(','));
