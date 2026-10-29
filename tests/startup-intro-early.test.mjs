import test from 'node:test';import assert from 'node:assert/strict';import {withEarlyIntro} from '../core/startup-intro-early-html.js';
test('early launch is same-origin, idempotent and preserves login body and native cover',()=>{
 const html='<html><head></head><body><details data-startup-cover open><summary>Skip</summary></details><button data-login>Passkey</button></body></html>',out=withEarlyIntro(html,'ui1a-synthetic-20261030');assert.equal(withEarlyIntro(out,'ui1a-synthetic-20261030'),out);assert.ok(out.endsWith(html.slice(html.indexOf('<body>'))));assert.equal((out.match(/data-startup-intro-early/g)||[]).length,1);assert.match(out,/type="module" async fetchpriority="high"/);assert.doesNotMatch(out,/https?:|blob:|nonce|cookie/i);assert.throws(()=>withEarlyIntro(html,'../other'));
});
test('new generation replaces only its own early tags instead of loading two scenes',()=>{
 const html='<html><head><link href="/keep.css" rel="stylesheet"></head><body>Login</body></html>',old=withEarlyIntro(html,'ui1a-old'),next=withEarlyIntro(old,'ui1a-next');assert.doesNotMatch(next,/ui1a-old/);assert.equal((next.match(/ui1a-next/g)||[]).length,3);assert.match(next,/href="\/keep.css"/);assert.equal(withEarlyIntro(next,'ui1a-next'),next);
});
