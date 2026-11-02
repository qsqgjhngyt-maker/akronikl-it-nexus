// Fixed provider endpoint prevents recipient-controlled URLs/SSRF. No logger here.
// Only a sending key for the verified Nexus sender domain is needed.
export function passwordMailConfigured(env){
 return env.INVITED_PASSWORD_MAIL_ENABLED==='true'&&
  typeof env.RESEND_API_KEY==='string'&&/^re_[A-Za-z0-9_\-]{16,200}$/.test(env.RESEND_API_KEY)&&
  typeof env.INVITED_PASSWORD_MAIL_FROM==='string'&&/^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,63}$/.test(env.INVITED_PASSWORD_MAIL_FROM);
}
export async function sendPasswordMail({env,to,code,purpose,fetchImpl=fetch}){
 if(!passwordMailConfigured(env))throw Error('PASSWORD_UNAVAILABLE');
 if(!/^[A-Za-z0-9_-]{43}$/.test(code)||!['enroll','recover'].includes(purpose))throw Error('MAIL_INPUT');
 const response=await fetchImpl('https://api.resend.com/emails',{
  method:'POST',redirect:'error',signal:AbortSignal.timeout(5000),
  headers:{authorization:'Bearer '+env.RESEND_API_KEY,'content-type':'application/json'},
  body:JSON.stringify({from:env.INVITED_PASSWORD_MAIL_FROM,to:[to],
   subject:purpose==='enroll'?'Nexus — подтверждение приглашения':'Nexus — восстановление пароля',
   text:(purpose==='enroll'?'Подтвердите почту для приглашения в Nexus.':'Вы запросили смену пароля Nexus.')+
    '\n\nОдноразовый код (действует 15 минут):\n'+code+
    '\n\nВведите его на уже открытой странице Nexus. Код нельзя передавать другим людям.'+
    '\nЕсли вы не делали запрос, проигнорируйте это письмо. Ваш доступ не изменён.'})
 });
 // Never propagate provider response bodies: they can echo mail content or codes.
 await response.body?.cancel().catch(()=>{});
 if(!response.ok)throw Error('MAIL_DELIVERY_FAILED');
}
