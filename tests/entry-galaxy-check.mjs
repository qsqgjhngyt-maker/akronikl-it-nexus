// Synthetic Node checks only: no browser, server, actual account or external fetch.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {ENTRY_ORIGIN,ENTRY_URL,destinationFor,readEntryAccount} from '../server-access/public/entry.js';
import {createGalaxyPoints} from '../server-access/public/galaxy.js';
const checks=[];
let calls=0;
for(const origin of ['https://qsqgjhngyt-maker.github.io','https://foreign.invalid','http://localhost:8080']){
 assert.deepEqual(await readEntryAccount({origin},()=>{calls++;throw Error('Foreign origin must not fetch credentials')}),{kind:'foreign'});
}
assert.equal(calls,0);checks.push('GitHub and foreign origins perform no Account API calls');
for(const hash of ['#view=javascript:alert(1)&next=https://foreign.invalid','#view=account&project=../../private','#view=home&next=//foreign.invalid','#view=feedback-admin&return=javascript:alert(1)']){
 const destination=new URL(destinationFor(hash));assert.equal(destination.origin,ENTRY_ORIGIN);assert.equal(destination.pathname,'/');assert.ok(!destination.hash.includes('next='));assert.ok(!destination.hash.includes('return='));assert.ok(!destination.hash.includes('javascript'));
}
assert.equal(destinationFor('#view=project-studio&project=project-123'),ENTRY_ORIGIN+'/#view=project-studio&project=project-123');assert.equal(ENTRY_URL,ENTRY_ORIGIN+'/account/entry/');checks.push('Navigation stays on fixed server root and accepts only bounded route parameters');
for(const view of ['skills','akronikl'])assert.equal(new URLSearchParams(new URL(destinationFor('#view='+view)).hash.slice(1)).get('view'),view);
for(const id of ['проект-галактика','p'.repeat(256)])assert.equal(new URLSearchParams(new URL(destinationFor('#view=project-studio&project='+encodeURIComponent(id))).hash.slice(1)).get('project'),id);
assert.equal(new URLSearchParams(new URL(destinationFor('#view=projects&project='+'p'.repeat(257))).hash.slice(1)).has('project'),false);checks.push('Legacy navigation and Unicode project IDs survive reauthentication');
const account={accountId:'synthetic-account',displayName:'Synthetic Learner',status:'active'};
let captured;
const accepted=await readEntryAccount({origin:ENTRY_ORIGIN},async(path,options)=>{captured={path,options};return Response.json({account,loginMethods:[],enrollmentAvailable:false})});
assert.deepEqual(accepted,{kind:'signed-in',account});assert.equal(captured.path,'/api/v2/account');assert.equal(captured.options.credentials,'same-origin');assert.equal(captured.options.cache,'no-store');assert.equal(captured.options.redirect,'error');checks.push('Existing account requires a validated authoritative server DTO');
for(const code of ['SESSION_REQUIRED','SESSION_REJECTED'])assert.deepEqual(await readEntryAccount({origin:ENTRY_ORIGIN},async()=>Response.json({error:{code}},{status:401})),{kind:'signed-out'});
checks.push('Known missing/revoked-session responses show signed-out state');
for(const response of [Response.json({account:{...account,status:'disabled'},loginMethods:[],enrollmentAvailable:false}),Response.json({account,loginMethods:[],enrollmentAvailable:true}),Response.json({error:{code:'ACCESS_DENIED'}},{status:403}),new Response('<html>not a session</html>',{status:200,headers:{'content-type':'text/html'}})])await assert.rejects(readEntryAccount({origin:ENTRY_ORIGIN},async()=>response));
checks.push('Malformed bodies and denial cannot become a signed-in identity');
const first=createGalaxyPoints(650),second=createGalaxyPoints(650);assert.deepEqual(first,second);assert.equal(first.length,650);assert.ok(first.every(point=>[point.x,point.y,point.z,point.size,point.alpha].every(Number.isFinite)&&point.size>0&&point.alpha>0));checks.push('Bounded galaxy geometry is deterministic and contains finite 3D coordinates');
const html=await readFile(new URL('../server-access/public/entry.html',import.meta.url),'utf8');
assert.ok(html.includes('href="/account/entry/entry.css"'));assert.ok(html.includes('src="/account/entry/entry.js"'));assert.ok(html.includes('aria-live="polite"'));assert.ok(html.includes('data-motion'));assert.ok(html.includes('<noscript>'));
const css=await readFile(new URL('../server-access/public/entry.css',import.meta.url),'utf8');assert.ok(css.includes('prefers-reduced-motion'));assert.ok(css.includes('focus-visible'));assert.ok(css.includes('prefers-contrast'));checks.push('Entry exposes motion control, reduced-motion/contrast support and keyboard focus');
console.log(JSON.stringify({status:'PASS',checks,externalNetworkCalls:0,realAccounts:0,browserLaunches:0,serversStarted:0}));
