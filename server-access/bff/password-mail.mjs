// Fixed provider endpoint prevents recipient-controlled URLs/SSRF. No logger here.
// Only a sending key for the verified Nexus sender domain is needed.
import {fetch as safeFetch} from 'undici';
import {connect as tlsConnect} from 'node:tls';
import nodemailer from 'nodemailer';
const validAddress=v=>typeof v==='string'&&/^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,63}$/.test(v)&&v.length<=254;
export function passwordMailConfigured(env){
 if(env.INVITED_PASSWORD_MAIL_ENABLED!=='true'||!validAddress(env.INVITED_PASSWORD_MAIL_FROM))return false;
 if(env.INVITED_PASSWORD_MAIL_PROVIDER==='mailru')return typeof env.MAILRU_SMTP_USER==='string'&&
  /@(?:mail|bk|list|inbox|internet)\.ru$/i.test(env.MAILRU_SMTP_USER)&&env.INVITED_PASSWORD_MAIL_FROM===env.MAILRU_SMTP_USER&&
  typeof env.MAILRU_SMTP_PASSWORD==='string'&&env.MAILRU_SMTP_PASSWORD.length>=8&&env.MAILRU_SMTP_PASSWORD.length<=512;
 return (env.INVITED_PASSWORD_MAIL_PROVIDER===undefined||env.INVITED_PASSWORD_MAIL_PROVIDER==='resend')&&
  typeof env.RESEND_API_KEY==='string'&&/^re_[A-Za-z0-9_\-]{16,200}$/.test(env.RESEND_API_KEY)&&
  validAddress(env.INVITED_PASSWORD_MAIL_FROM);
}
export async function sendPasswordMail({env,to,code,purpose,signal,fetchImpl=safeFetch,createTransport=nodemailer.createTransport,connectTLS=tlsConnect}){
 if(!passwordMailConfigured(env))throw Error('PASSWORD_UNAVAILABLE');
 if(!validAddress(to)||!/^[A-Za-z0-9_-]{43}$/.test(code)||!['enroll','recover'].includes(purpose))throw Error('MAIL_INPUT');
 const subject=purpose==='enroll'?'Nexus — подтверждение приглашения':'Nexus — восстановление пароля';
 const text=(purpose==='enroll'?'Подтвердите почту для приглашения в Nexus.':'Вы запросили смену пароля Nexus.')+
  '\n\nОдноразовый код (действует 15 минут):\n'+code+
  '\n\nВведите его на уже открытой странице Nexus. Код нельзя передавать другим людям.'+
  '\nЕсли вы не делали запрос, проигнорируйте это письмо. Ваш доступ не изменён.';
 const deadline=signal?AbortSignal.any([signal,AbortSignal.timeout(5000)]):AbortSignal.timeout(5000);
 if(env.INVITED_PASSWORD_MAIL_PROVIDER==='mailru'){
  // Fixed implicit TLS endpoint; plaintext SMTP and STARTTLS downgrade are absent.
  // The abort signal destroys the TLS socket, including an active SMTP exchange.
  const transport=createTransport({host:'smtp.mail.ru',port:465,secure:true,
   auth:{user:env.MAILRU_SMTP_USER,pass:env.MAILRU_SMTP_PASSWORD},logger:false,debug:false,
   connectionTimeout:3000,greetingTimeout:3000,socketTimeout:5000,disableFileAccess:true,disableUrlAccess:true,
   tls:{servername:'smtp.mail.ru',rejectUnauthorized:true,minVersion:'TLSv1.2'},
   getSocket(_options,callback){
    let completed=false;
    const done=(error,result)=>{if(!completed){completed=true;callback(error,result)}};
    try{
     const socket=connectTLS({host:'smtp.mail.ru',port:465,servername:'smtp.mail.ru',rejectUnauthorized:true,minVersion:'TLSv1.2',signal:deadline});
     socket.once('secureConnect',()=>done(null,{connection:socket,secured:true}));
     socket.once('error',()=>done(Error('SMTP_CONNECT_FAILED')));
    }catch{done(Error('SMTP_CONNECT_FAILED'))}
   }});
  try{
   await transport.sendMail({from:env.INVITED_PASSWORD_MAIL_FROM,to,subject,text,disableFileAccess:true,disableUrlAccess:true});
  }catch{throw Error('MAIL_DELIVERY_FAILED')}
  finally{transport.close()}
  return;
 }
 const response=await fetchImpl('https://api.resend.com/emails',{
  method:'POST',redirect:'error',signal:deadline,
  headers:{authorization:'Bearer '+env.RESEND_API_KEY,'content-type':'application/json'},
  body:JSON.stringify({from:env.INVITED_PASSWORD_MAIL_FROM,to:[to],
   subject,text})
 });
 // Never propagate provider response bodies: they can echo mail content or codes.
 await response.body?.cancel().catch(()=>{});
 if(!response.ok)throw Error('MAIL_DELIVERY_FAILED');
}
