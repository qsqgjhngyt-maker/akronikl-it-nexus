// One real recovery email, only to the recipient fixed in the private staging state.
// No password, SMTP response text or verification code is printed.
import {readFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {Agent,fetch} from 'undici';
import {validateStage} from './contract.mjs';
import {setTimeout as delay} from 'node:timers/promises';
const directory=resolve(process.argv[2]),s=validateStage(JSON.parse(await readFile(join(directory,'staging.private.json'),'utf8')));
if(s.mailMode!=='live'||s.mailProvider!=='mailru'||!s.smtpPassword)throw Error('MAIL_SETUP_REQUIRED');
const dispatcher=new Agent({connect:{rejectUnauthorized:false}});
try{
 const origin='https://localhost:8443';
 let health;
 for(let attempt=0;attempt<5;attempt++){
  try{health=await fetch(origin+'/healthz',{dispatcher,signal:AbortSignal.timeout(1000)}).then(r=>r.json());break}
  catch(error){if(attempt===4)throw error;await delay(300)}
 }
 if(health.mailMode!=='live')throw Error('STAGING_RESTART_REQUIRED');
 const started=Date.now();
 const response=await fetch(origin+'/api/v2/account/password/recover',{method:'POST',dispatcher,redirect:'error',signal:AbortSignal.timeout(17000),
  headers:{origin,'content-type':'application/json','x-nexus-password-write':'1'},body:JSON.stringify({email:s.testEmail})});
 if(!response.ok)throw Error('TEST_MAIL_REQUEST_FAILED_'+response.status);
 const outcome=JSON.parse(await readFile(join(directory,'delivery-status.json'),'utf8'));
 if(outcome.status!=='accepted'||Date.parse(outcome.at)<started)throw Error('SMTP_NOT_ACCEPTED');
 console.log(JSON.stringify({status:'SMTP_ACCEPTED',provider:'mailru',sender:s.mailFrom,recipient:s.testEmail,inboxReceipt:'AWAITING_RECIPIENT',productionWrites:0}));
}catch(e){console.error(/^[A-Z0-9_]+$/.test(e.message)?e.message:'MAIL_TEST_NOT_CONFIRMED');process.exitCode=1}
finally{await dispatcher.close()}
