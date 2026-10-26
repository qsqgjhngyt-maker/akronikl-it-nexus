import {verifyM3Publication} from './academy-gold-module3-publication.mjs';
const result=await verifyM3Publication({rebuild:true});
console.log(JSON.stringify({...result,productPatchPaths:result.productPatchPaths.length}));
