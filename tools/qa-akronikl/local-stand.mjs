// Local test environment only. It never uses production services or physical passkeys.
import {mkdir,writeFile} from 'node:fs/promises';import {randomBytes,createHash} from 'node:crypto';import path from 'node:path';import {pathToFileURL} from 'node:url';
import {nexusChatFixture} from './nexus-chat-fixture.mjs';import {createCloudVault} from './cloud-vault.mjs';import {createLocalSpeechProvider} from './local-speech.mjs';
import {createCloudAdapter} from './cloud-adapters.mjs';import {createQwenTestBudget} from './qwen-test-budget.mjs';
import {PIPER_VOICE,PIPER_NARRATOR} from '../../akronikl/experience/piper-voice.js';
export async function createLocalStand({root,privateDir,playwrightModule,chromePath,speechConfig=null,cloudConfig=null,onOutcome=null,headless=false,persistent=true,powerShellPath=process.env.NEXUS_STAND_POWERSHELL??'powershell.exe'}={}){
 await mkdir(privateDir,{recursive:true});
 if(cloudConfig!==null&&(Object.keys(cloudConfig).join(',')!=='enabled'||cloudConfig.enabled!==true))throw Error('CLOUD_CONFIG_INVALID');
 const cloudEnabled=cloudConfig?.enabled===true,budget=cloudEnabled?await createQwenTestBudget({file:path.join(privateDir,'qwen-test-budget-v1.json')}):null;
 const secrets=createCloudVault({file:path.join(privateDir,'stand-secrets.dpapi'),powerShellPath}),owner=createHash('sha256').update('isolated-local-stand').digest('base64url');
 let saved=persistent?await secrets.readState(owner,'preferences'):{revision:0,value:null},material=saved.value??{masterKey:randomBytes(32).toString('base64'),credentials:[]};
 if(!/^[A-Za-z0-9+/]{43}=$/.test(material.masterKey)||!Array.isArray(material.credentials))throw Error('STAND_SECRETS_INVALID');
 if(persistent&&!saved.value)saved=await secrets.writeState(owner,'preferences',material,saved.revision);
 const browserPiper=speechConfig?.engine==='piper-browser';
 if(browserPiper&&speechConfig.voice!==undefined&&!['irina','uyut7'].includes(speechConfig.voice))throw Error('SPEECH_CONFIG_INVALID');
 if(browserPiper&&(!path.isAbsolute(speechConfig.assetsDirectory??'')||!persistent))throw Error('SPEECH_CONFIG_INVALID');
 const speech=browserPiper?Object.freeze({voice:speechConfig.voice==='uyut7'?PIPER_NARRATOR:PIPER_VOICE,status:()=>({engine:'piper-browser',readyScope:'per-account browser worker',externalModelCalls:0,downloads:0}),warmup:async()=>{},synthesize:async()=>{throw Error('SPEECH_UNAVAILABLE');},close:async()=>{}}):speechConfig?createLocalSpeechProvider({...speechConfig,referenceFile:path.join(root,'akronikl/experience/voices/uyut7-narrator.wav'),privateDirectory:path.join(privateDir,'speech')}):null;
 // Preload only public acoustic weights while the isolated UI starts. User text still requires Nexus authorization.
 if(speech)void speech.warmup().catch(()=>{});
 let adapterCalls=0,fixture,context,cdp,authenticator,page,closing=false,secretQueue=Promise.resolve(),persistenceError=null;const errors=[];
 function mergeCredentials(values){const byId=new Map(material.credentials.map(c=>[c.credentialId,c]));for(const c of values){const before=byId.get(c.credentialId);if(c.privateKey||before)byId.set(c.credentialId,{...before,...c,privateKey:c.privateKey||before.privateKey,signCount:Math.max(before?.signCount??0,c.signCount??0)});}material.credentials=[...byId.values()];}
 function saveSecrets(){if(!persistent)return Promise.resolve();const task=secretQueue.then(async()=>{saved=await secrets.writeState(owner,'preferences',structuredClone(material),saved.revision);persistenceError=null;});secretQueue=task.catch(()=>{persistenceError='STAND_PERSISTENCE_FAILED';});return task;}
 try{
  fixture=await nexusChatFixture({root,privateDir,generationEnabled:cloudEnabled,persistent,vaultMasterKey:material.masterKey,localSpeech:speech,piperAssets:browserPiper?speechConfig.assetsDirectory:null,fullApp:true,onOutcome,createAdapter(options){
   if(!cloudEnabled)throw Error('MODEL_CALL_FORBIDDEN');
   const s=options.selection;if(s.providerId!=='qwen'||s.modelId!=='qwen3.8-flash'||s.options.region!=='singapore'||s.options.workspaceId)throw Error('CLOUD_REQUEST_REJECTED');
   adapterCalls++;return createCloudAdapter({...options,qwenMaxOutputTokens:192,fetchUpstream:budget.fetch});
  }});if(material.credentials.length)fixture.enableRegistration();
  const {chromium}=await import(pathToFileURL(playwrightModule));
  context=await chromium.launchPersistentContext(path.join(privateDir,'browser-profile'),{headless,executablePath:chromePath,serviceWorkers:'block',viewport:{width:1366,height:900},args:['--disable-background-networking','--disable-sync','--disable-component-update','--disable-extensions','--no-proxy-server','--ignore-certificate-errors-spki-list='+fixture.spki,'--host-resolver-rules=MAP * 127.0.0.1:'+fixture.port]});
  // Playwright also blocks at the request layer; DNS mapping protects Chrome background traffic.
  await context.route('**/*',route=>{const u=new URL(route.request().url());return u.origin===fixture.origin?route.continue():route.abort('blockedbyclient');});
  page=context.pages()[0]??await context.newPage();page.setDefaultTimeout(30000);page.on('pageerror',e=>errors.push(e.message));cdp=await context.newCDPSession(page);await cdp.send('WebAuthn.enable');
  ({authenticatorId:authenticator}=await cdp.send('WebAuthn.addVirtualAuthenticator',{options:{protocol:'ctap2',transport:'internal',hasResidentKey:true,hasUserVerification:true,isUserVerified:true,automaticPresenceSimulation:true}}));
  for(const credential of material.credentials.filter(c=>!material.activeIds?.length||material.activeIds.includes(c.credentialId)))await cdp.send('WebAuthn.addCredential',{authenticatorId:authenticator,credential});
  const credentialEvent=({credential})=>{mergeCredentials([credential]);void saveSecrets().catch(()=>{});};for(const event of ['WebAuthn.credentialAdded','WebAuthn.credentialUpdated','WebAuthn.credentialAsserted'])cdp.on(event,credentialEvent);
  await page.goto(fixture.origin+'/account/access/');
  if(!material.credentials.length){
   if(fixture.backend.db.prepare('SELECT count(*) n FROM nexus_passkey_credentials').get().n)throw Error('STAND_CREDENTIALS_MISSING');
   await page.locator('details').evaluate(n=>n.open=true);await page.locator('#invitation').fill(fixture.backend.invitation);await page.locator('#register').click();
  }else await page.locator('#login').click();
  async function persistCredentials(){if(!persistent)return;const values=(await cdp.send('WebAuthn.getCredentials',{authenticatorId:authenticator})).credentials;mergeCredentials(values);material.activeIds=values.map(c=>c.credentialId);await saveSecrets();}
  await page.waitForURL('**/index.html**');await persistCredentials();await page.locator('[data-akronikl-open]').waitFor();fixture.enableRegistration();
  return {fixture,context,page,cdp,get authenticator(){return authenticator;},async replaceAuthenticator(credentials=[]){await persistCredentials();await cdp.send('WebAuthn.removeVirtualAuthenticator',{authenticatorId:authenticator});({authenticatorId:authenticator}=await cdp.send('WebAuthn.addVirtualAuthenticator',{options:{protocol:'ctap2',transport:'internal',hasResidentKey:true,hasUserVerification:true,isUserVerified:true,automaticPresenceSimulation:true}}));for(const credential of credentials)await cdp.send('WebAuthn.addCredential',{authenticatorId:authenticator,credential});},persistCredentials,status:()=>({mode:'local-test',cloudGeneration:cloudEnabled,adapterCalls,modelApiCalls:budget?.status().requests??0,budget:budget?.status()??null,persistenceError,speech:speech?.status()??null}),async close(){if(closing)return;closing=true;try{if(context.browser()?.isConnected())await persistCredentials();await secretQueue;if(persistenceError)throw Error(persistenceError);}finally{await context.close().catch(()=>{});await fixture.close();}}};
 }catch(error){await writeFile(path.join(privateDir,'START_FAILURE.json'),JSON.stringify({failure:String(error),url:page?.url(),pageErrors:errors,body:await page?.locator('body').innerText().catch(()=>null),network:fixture?.network,serverErrors:fixture?.errors},null,2)).catch(()=>{});await context?.close().catch(()=>{});await fixture?.close().catch(()=>{});if(!fixture)await speech?.close().catch(()=>{});throw error;}
}
