import {verifyM3Publication} from './academy-gold-module3-publication.mjs';
const candidate=JSON.parse(await(await import('node:fs/promises')).readFile('release-candidate.json'));
const result=candidate.publication?.module==='cpp-module-4'?await(await import('./academy-gold-module4-publication.mjs')).verifyM4Publication({rebuild:true}):await verifyM3Publication({rebuild:true});
console.log(JSON.stringify({...result,productPatchPaths:result.productPatchPaths.length}));
