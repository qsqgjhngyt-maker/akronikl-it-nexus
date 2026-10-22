import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {publicRecord,assetResponse,GRAPHICS_FRAME_CSP} from '../pwa/policy.js';
const origin='https://synthetic.invalid',url='/releases/ui1a-synthetic/pwa/graphics-frame.html',record={url,mime:'text/html',bytes:1,sha256:'a'.repeat(64)},nonce=randomUUID(),request=(path,mode='navigate')=>({url:origin+path,method:'GET',mode});
assert.equal(publicRecord(request(url+'#'+nonce),origin,[record],'1'),record);
for(const [path,mode]of [[url+'#invalid','navigate'],[url+'#'+nonce,'cors'],['/api/v2/account#'+nonce,'navigate'],['/account/entry/#'+nonce,'navigate'],['/releases/ui1a-synthetic/core/app.js#'+nonce,'navigate'],[url+'?unknown=1#'+nonce,'navigate']])assert.equal(publicRecord(request(path,mode),origin,[record],'1'),null);
assert.equal(publicRecord(request(url+'#'+nonce),origin,[],'1'),null);
assert.equal(assetResponse(record,new Uint8Array([1])).headers.get('content-security-policy'),GRAPHICS_FRAME_CSP);assert.equal(GRAPHICS_FRAME_CSP.includes('allow-same-origin'),false);
console.log('PASS nonce navigation only for producer-bound exact graphics HTML; API/account/other hash/unknown query denied; HTTP opaque sandbox preserved');
