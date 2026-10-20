import {verifiedAccount} from './account-storage.js';
import {accountControlRequest,controlMessage} from './account-control-api.js';
let cached=null;
const clearProfile=()=>{cached=null};
function applyPhoto(profile){
 if(verifiedAccount()?.accountId!==profile.accountId)return;
 for(const holder of document.querySelectorAll('.account-avatar')){
  if(profile.avatar){const img=document.createElement('img');img.src=profile.avatar;img.alt='Аватар';img.width=64;img.height=64;holder.replaceChildren(img)}
  else holder.textContent=profile.displayName.trim().slice(0,1).toUpperCase()||'N';
 }
}
async function readProfile(accountId){
 if(cached?.accountId===accountId)return cached.promise;
 const promise=accountControlRequest('/api/v2/account/profile',{accountId}).then(value=>{if(verifiedAccount()?.accountId===accountId)applyPhoto(value);return value});
 cached={accountId,promise};
 try{return await promise}catch(error){if(cached?.promise===promise)cached=null;throw error}
}
export async function prepareAvatar(file){
 if(!file||!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>8*1024*1024)throw Error('AVATAR_INVALID');
 const bitmap=await createImageBitmap(file,{imageOrientation:'from-image'});
 try{
  if(bitmap.width<1||bitmap.height<1||bitmap.width*bitmap.height>40000000)throw Error('AVATAR_INVALID');
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=256;
  const context=canvas.getContext('2d',{alpha:false});if(!context)throw Error('AVATAR_INVALID');
  const side=Math.min(bitmap.width,bitmap.height),x=(bitmap.width-side)/2,y=(bitmap.height-side)/2;
  context.fillStyle='#ffffff';context.fillRect(0,0,256,256);context.drawImage(bitmap,x,y,side,side,0,0,256,256);
  const data=canvas.toDataURL('image/jpeg',0.82);
  if(!data.startsWith('data:image/jpeg;base64,')||data.length>131100)throw Error('AVATAR_TOO_LARGE');
  return data;
 }finally{bitmap.close()}
}
export function bindAccountProfile(locale='ru'){
 const accountId=verifiedAccount()?.accountId;if(!accountId)return;
 globalThis.addEventListener?.('pagehide',clearProfile);
 readProfile(accountId).catch(()=>{});
 const root=document.querySelector('[data-unified-account]'),overview=root?.querySelector('[data-unified-logout]');
 if(!root||!overview||root.querySelector('[data-personalize]'))return;
 const panel=document.createElement('section');panel.className='account-panel glass-panel';panel.dataset.personalize='';
 panel.innerHTML='<h2>Ваш профиль</h2><p data-profile-login></p><div class="profile-photo-row"><img data-photo-preview class="profile-photo" alt="Ваш аватар" hidden><div><label class="btn">Выбрать фото<input data-photo-file type="file" accept="image/jpeg,image/png,image/webp" hidden></label><p>JPEG, PNG или WebP, до 8 МБ. Фото будет обрезано по центру до квадрата.</p><div class="account-actions"><button type="button" class="btn primary" data-photo-save disabled>Сохранить фото</button><button type="button" class="btn" data-photo-remove disabled>Удалить фото</button></div></div></div><p data-photo-status role="status"></p>';
 root.append(panel);
 const preview=panel.querySelector('[data-photo-preview]'),file=panel.querySelector('[data-photo-file]'),save=panel.querySelector('[data-photo-save]'),remove=panel.querySelector('[data-photo-remove]'),status=panel.querySelector('[data-photo-status]');
 let profile=null,prepared=null,busy=false,generation=0;
 const current=()=>panel.isConnected&&verifiedAccount()?.accountId===accountId;
 const show=value=>{profile=value;preview.hidden=!value.avatar;if(value.avatar)preview.src=value.avatar;else preview.removeAttribute('src');remove.disabled=!value.avatar;panel.querySelector('[data-profile-login]').textContent=value.username?'Логин: '+value.username:'Имя: '+value.displayName};
 readProfile(accountId).then(value=>{if(current())show(value)}).catch(error=>{if(current())status.textContent=controlMessage(error)});
 file.addEventListener('change',async()=>{
  const attempt=++generation;if(!file.files?.[0])return;
  save.disabled=true;
  try{const data=await prepareAvatar(file.files[0]);if(attempt!==generation||!current())return;prepared=data;preview.src=data;preview.hidden=false;save.disabled=!profile;status.textContent='Предпросмотр. Нажмите «Сохранить фото».'}
  catch(error){if(current())status.textContent=controlMessage(error)}
  finally{file.value=''}
 });
 async function mutate(removePhoto){
  if(busy||!profile||!current()||!removePhoto&&!prepared)return;busy=true;save.disabled=true;remove.disabled=true;file.disabled=true;status.textContent='Сохраняем изменения…';
  try{
   const value=await accountControlRequest('/api/v2/account/profile/avatar'+(removePhoto?'/remove':''),{accountId,method:'POST',body:{requestId:crypto.randomUUID(),version:profile.avatarVersion,...(!removePhoto?{jpegBase64:prepared.slice('data:image/jpeg;base64,'.length)}:{})}});
   if(!current())return;prepared=null;cached={accountId,promise:Promise.resolve(value)};show(value);applyPhoto(value);status.textContent=removePhoto?'Фото удалено.':'Фото сохранено.';
  }catch(error){if(current())status.textContent=controlMessage(error)}
  finally{busy=false;if(current()){file.disabled=false;save.disabled=!prepared;remove.disabled=!profile?.avatar}}
 }
 save.addEventListener('click',()=>mutate(false));remove.addEventListener('click',()=>mutate(true));
}
