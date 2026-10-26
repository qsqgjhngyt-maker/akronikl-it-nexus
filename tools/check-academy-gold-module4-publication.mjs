import {verifyM4Publication} from './academy-gold-module4-publication.mjs';
const result=await verifyM4Publication({rebuild:true});
console.log(JSON.stringify({...result,productPatchPaths:result.productPatchPaths.length}));
