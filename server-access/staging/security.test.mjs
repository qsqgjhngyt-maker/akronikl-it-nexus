import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createServer,connect} from 'node:tls';
import {execFileSync} from 'node:child_process';
import {mkdtemp,readFile,unlink,rmdir} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {sendPasswordMail,passwordMailConfigured} from '../bff/password-mail.mjs';
import {validateStage} from './contract.mjs';
const state={schema:1,purpose:'invited-password-isolated-staging',name:'nexus-password-staging-a1b2c3d4e5f6',databaseId:'11111111-2222-3333-4444-555555555555',subdomain:'synthetic',workerOrigin:'https://nexus-password-staging-a1b2c3d4e5f6.synthetic.workers.dev'};
test('Staging cannot point to production or an arbitrary Worker URL',()=>{
 assert.equal(validateStage(state),state);
 for(const change of [{name:'akronikl-nexus-sync'},{databaseId:'0995b7f0-2e4c-42a5-a25f-422d4b741d59'},
  {workerOrigin:'https://akronikl-nexus-sync.akronikl.workers.dev'},{workerOrigin:'https://evil.invalid'},{subdomain:'synthetic/workers.dev'}])
  assert.throws(()=>validateStage({...state,...change}),/STAGING_TARGET_REJECTED/);
});
const env={INVITED_PASSWORD_MAIL_ENABLED:'true',INVITED_PASSWORD_MAIL_PROVIDER:'mailru',INVITED_PASSWORD_MAIL_FROM:'sender@mail.ru',MAILRU_SMTP_USER:'sender@mail.ru',MAILRU_SMTP_PASSWORD:'SYNTHETIC_APP_PASSWORD_ONLY'};
test('Mail.ru setup requires matching sender and dedicated password; provider cannot choose arbitrary host',()=>{
 assert.equal(passwordMailConfigured(env),true);
 for(const delta of [{MAILRU_SMTP_PASSWORD:''},{MAILRU_SMTP_USER:'sender@gmail.com'},{INVITED_PASSWORD_MAIL_FROM:'other@mail.ru'},{INVITED_PASSWORD_MAIL_PROVIDER:'unknown'}])assert.equal(passwordMailConfigured({...env,...delta}),false);
});
test('Real TLS SMTP exchange sends code in message, keeps strict TLS and aborts stalled delivery',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'nexus-smtp-test-')),keyPath=join(dir,'test.key'),certPath=join(dir,'test.crt');
 const openssl=process.platform==='win32'?'C:/Program Files/Git/usr/bin/openssl.exe':'openssl';
 execFileSync(openssl,['req','-x509','-newkey','rsa:2048','-nodes','-keyout',keyPath,'-out',certPath,'-subj','/CN=localhost','-addext','subjectAltName=DNS:localhost','-days','1'],{stdio:'ignore'});
 const key=await readFile(keyPath),cert=await readFile(certPath),sockets=new Set();let stall=false,messages=[];
 const server=createServer({key,cert},socket=>{
  sockets.add(socket);socket.on('close',()=>sockets.delete(socket));socket.on('error',()=>{});
  if(stall)return;
  socket.write('220 localhost synthetic SMTP\r\n');let buffer='',data=false,lines=[];
  socket.on('data',part=>{
   buffer+=part.toString();let at;
   while((at=buffer.indexOf('\r\n'))!==-1){
    const line=buffer.slice(0,at);buffer=buffer.slice(at+2);
    if(data){if(line==='.'){data=false;messages.push(lines.join('\n'));socket.write('250 queued\r\n')}else lines.push(line);continue}
    if(/^EHLO/i.test(line))socket.write('250-localhost\r\n250 AUTH PLAIN\r\n');
    else if(/^AUTH PLAIN/i.test(line))socket.write('235 authenticated\r\n');
    else if(/^(MAIL FROM|RCPT TO)/i.test(line))socket.write('250 OK\r\n');
    else if(line==='DATA'){data=true;lines=[];socket.write('354 message\r\n')}
    else if(line==='QUIT'){socket.end('221 bye\r\n')}
    else socket.write('250 OK\r\n');
   }
  });
 });
 server.on('tlsClientError',()=>{});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const connectTLS=options=>{
  assert.equal(options.host,'smtp.mail.ru');assert.equal(options.port,465);assert.equal(options.rejectUnauthorized,true);assert.equal(options.minVersion,'TLSv1.2');
  return connect({...options,host:'127.0.0.1',port:server.address().port,servername:'localhost',ca:cert});
 };
 try{
  await sendPasswordMail({env,to:'recipient@example.com',code:'T'.repeat(43),purpose:'enroll',connectTLS});
  assert.equal(messages.length,1);
  const raw=messages[0],body=raw.slice(raw.indexOf('\n\n')+2);
  const decoded=/Content-Transfer-Encoding: base64/i.test(raw)?Buffer.from(body.replace(/\s/g,''),'base64').toString('utf8'):
   body.replace(/=\n/g,'').replace(/=([A-F0-9]{2})/gi,(_m,hex)=>String.fromCharCode(parseInt(hex,16)));
  assert.ok(decoded.includes('T'.repeat(43)));assert.ok(!raw.includes(env.MAILRU_SMTP_PASSWORD));assert.ok(!decoded.includes(env.MAILRU_SMTP_PASSWORD));
  stall=true;
  await assert.rejects(()=>sendPasswordMail({env,to:'recipient@example.com',code:'R'.repeat(43),purpose:'recover',connectTLS,signal:AbortSignal.timeout(100)}),e=>e.message==='MAIL_DELIVERY_FAILED');
  assert.equal(messages.length,1);
 }finally{
  for(const socket of sockets)socket.destroy();await new Promise(resolve=>server.close(resolve));
  await unlink(keyPath);await unlink(certPath);await rmdir(dir);
 }
});
