// Synthetic-only protocol regression: actual production Vary normalization, no real session.
import assert from 'node:assert/strict';
import {initializeAccountStorage} from '../core/account-storage.js';
import {accountControlRequest} from '../core/account-control-api.js';
const area=()=>{const m=new Map();return {get length(){return m.size},key:n=>[...m.keys()][n]??null,getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v))}};
globalThis.localStorage=area();globalThis.sessionStorage=area();
globalThis.location={origin:'https://d5d8d3c2d1uhct6fmvle.3rspsmhh.apigw.yandexcloud.net'};
initializeAccountStorage({accountId:'synthetic-transport-owner',displayName:'Synthetic',status:'active'});
const caps={canManage:true,canModerate:true,canPurge:false,freshPasskey:true};let calls=0;
const request=(vary,extra={})=>accountControlRequest('/api/v2/account/control/capabilities',{fetchImpl:async()=>{calls++;return Response.json(caps,{headers:{'cache-control':'no-store',...(vary===null?{}:{vary}),...extra}})}});
for(const vary of ['*','Accept-Encoding, *','*, Accept-Encoding','accept-encoding,\t*']){
 assert.deepEqual(await request(vary),caps);console.log('PASS '+JSON.stringify(vary)+' preserves uncacheable control response');
}
for(const vary of [null,'','Accept-Encoding','"*"','Accept-Encoding, *x','Accept-Encoding, *=true','*, invalid field','*,']){
 const before=calls;await assert.rejects(request(vary),/CONTROL_UNAVAILABLE/);assert.equal(calls,before+1);console.log('PASS invalid/missing wildcard rejected '+JSON.stringify(vary));
}
await assert.rejects(request('Accept-Encoding, *',{'cache-control':'public, max-age=3600'}),/CONTROL_UNAVAILABLE/);
console.log('PASS cache policy and no automatic request retry retained');
