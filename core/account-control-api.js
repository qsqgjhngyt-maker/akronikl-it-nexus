import {verifiedAccount} from './account-storage.js';
import {SERVER_ACCOUNT_ORIGIN} from './server-account-origin.js';
import {hasVaryWildcard} from './private-response-policy.js';
const messages={BLOG_MEDIA_UPSTREAM_NETWORK_FAILED:'Сервер не смог связаться с хранилищем фото. Загрузка не подтверждена. Код: PHOTO_NETWORK.',BLOG_MEDIA_UPSTREAM_REDIRECT_REJECTED:'Хранилище фото вернуло перенаправление. Загрузка остановлена защитой. Код: PHOTO_REDIRECT.',BLOG_MEDIA_UPSTREAM_MIME_REJECTED:'Хранилище фото вернуло неожиданный ответ. Код: PHOTO_RESPONSE.',BLOG_MEDIA_UPSTREAM_COOKIE_REJECTED:'Ответ хранилища фото отклонён защитой. Код: PHOTO_COOKIE.',BLOG_MEDIA_UPSTREAM_CACHE_REJECTED:'Ответ хранилища фото отклонён защитой кеширования. Код: PHOTO_CACHE.',BLOG_MEDIA_UPSTREAM_VARY_REJECTED:'Ответ хранилища фото не подтвердил защиту от кеширования. Код: PHOTO_VARY.',BLOG_MEDIA_UPSTREAM_DTO_REJECTED:'Хранилище фото не подтвердило корректное сохранение. Код: PHOTO_CONFIRMATION.',INGRESS_REJECTED:'Сервер отклонил защищённую передачу Cookie. Действие не выполнено. Войдите снова.',ORIGIN_REJECTED:'Сервер отклонил адрес источника запроса. Откройте Nexus по его основному адресу.',WRITE_ORIGIN_REQUIRED:'Сервер отклонил подтверждение запроса. Действие не выполнено.',INVALID_INPUT:'Сервер отклонил формат запроса. Черновик оставлен в редакторе.',INPUT_TOO_LARGE:'Размер запроса превышает допустимый. Выберите фото меньшего размера.',CONTENT_EDITOR_UPDATE_REQUIRED:'Обновите интерфейс Nexus перед редактированием или публикацией статьи с новой вёрсткой. Сохранённые данные не изменены.',
 BLOG_IMAGE_INVALID:'Не удалось подготовить фото. Выберите JPEG, PNG или WebP меньшего размера.',
 CONTENT_MEDIA_UNAVAILABLE:'Хранилище фото пока не включено. Сохраните текст статьи и дождитесь подключения.',
 CONTENT_MEDIA_QUOTA:'Хранилище фотографий заполнено. Статья и прежние фотографии сохранены; новая загрузка не выполняется.',
 ADMIN_REQUIRED:'Управление пользователями доступно только администратору.',
 SELF_DELETE_UNAVAILABLE:'Самостоятельное удаление аккаунта пока недоступно.',
 SELF_DELETE_FRESH_LOGIN_REQUIRED:'Повторно подтвердите вход, затем откройте удаление заново.',
 ADMIN_FRESH_PASSKEY_REQUIRED:'Подтвердите вход ключом доступа, затем повторите действие.',
 ADMIN_ACCOUNT_PROTECTED:'Аккаунт администратора защищён от блокировки и удаления.',
 ALPHA_CAPACITY_REACHED:'Все места заняты. Увеличьте лимит или освободите место.',
 ALPHA_LIMIT_BELOW_OCCUPIED:'Лимит не может быть меньше числа занятых и зарезервированных мест.',
 ALPHA_ACCESS_CLOSED:'Доступ к Nexus закрыт.',
 CONTROL_CONFLICT:'Данные изменились или действие уже было отправлено. Обновите список перед новой попыткой.',
 INVALID_STATE:'Для текущего состояния это действие недоступно.',
 RESTORE_WITHOUT_LOGIN_METHOD:'Приглашение не было использовано. Создайте новое приглашение.',
 REMOVE_BEFORE_PURGE:'Сначала уберите пользователя из активных пользователей.',
 SHARED_PROJECT_TRANSFER_REQUIRED:'У пользователя есть совместные проекты. Перед полным удалением нужно решить вопрос владения.',
 PURGE_SCHEMA_REVIEW_REQUIRED:'Для полного удаления нужна проверка состава серверных данных.',
 PURGE_EXTERNAL_STORAGE_REVIEW_REQUIRED:'Обнаружены файлы во внешнем хранилище. Полное удаление требует дополнительной проверки.',
 PURGE_CONFIRMATION_REQUIRED:'Введите указанную фразу подтверждения полностью.',
 PURGE_APPROVAL_REJECTED:'Подтверждение истекло или данные изменились. Откройте предварительный просмотр заново.',
 PURGE_NOT_ENABLED:'Полное удаление пока не включено.',
 AVATAR_INVALID:'Не удалось обработать фото. Выберите другой JPEG, PNG или WebP.',
 AVATAR_DIMENSIONS:'Не удалось подготовить размер фото. Выберите изображение снова.',
 AVATAR_TOO_LARGE:'Фото слишком большое. Выберите изображение меньшего размера.',
 RATE_LIMITED:'Слишком много запросов. Подождите минуту.',
 CONTROL_UNAVAILABLE:'Сервис управления аккаунтом сейчас недоступен.',
 ALPHA_CONTROL_UNAVAILABLE:'Управление альфа-тестированием пока не включено.',
 SESSION_REQUIRED:'Сессия завершена. Войдите снова.',
 ACCOUNT_SESSION_CHANGED:'Аккаунт изменился. Войдите снова.'
};
export const controlMessage=error=>error?.name==='NotAllowedError'?'Подтверждение отменено. Можно попробовать снова.':messages[error?.code||error?.message]||'Не удалось подтвердить действие. Оно не повторяется автоматически.';
export async function accountControlRequest(path,{method='GET',body,accountId=verifiedAccount()?.accountId,fetchImpl=globalThis.fetch,signal}={}){
 if(location.origin!==SERVER_ACCOUNT_ORIGIN||!accountId||verifiedAccount()?.accountId!==accountId)throw Object.assign(Error('SESSION_REQUIRED'),{code:'SESSION_REQUIRED'});
 if(typeof path!=='string'||!/^\/api\/v2\/account\/(?:control(?:\/|$)|profile(?:\/|$))/.test(path)||!['GET','POST'].includes(method))throw Error('INVALID_INPUT');
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
 try{
  const response=await fetchImpl(path,{method,credentials:'same-origin',cache:'no-store',redirect:'error',signal:signal?AbortSignal.any([signal,controller.signal]):controller.signal,headers:{accept:'application/json','x-nexus-account-expectation':accountId,...(method==='POST'?{'content-type':'application/json','x-nexus-account-control':'1'}:{})},...(method==='POST'?{body:JSON.stringify(body)}:{})});
  if(!response.headers.get('content-type')?.toLowerCase().startsWith('application/json')||response.headers.get('cache-control')!=='no-store'||!hasVaryWildcard(response.headers.get('vary')))throw Error('CONTROL_UNAVAILABLE');
  const text=await response.text();if(text.length>262144)throw Error('CONTROL_UNAVAILABLE');
  const data=JSON.parse(text);
  if(verifiedAccount()?.accountId!==accountId)throw Error('ACCOUNT_SESSION_CHANGED');
  if(!response.ok){
   const code=Object.hasOwn(messages,data?.error?.code)?data.error.code:'CONTROL_UNAVAILABLE';
   if(['SESSION_REQUIRED','ACCOUNT_SESSION_CHANGED'].includes(code))globalThis.window?.dispatchEvent(new Event('nexus:session-ended'));
   throw Object.assign(Error(code),{code,status:response.status});
  }
  return data;
 }finally{clearTimeout(timer)}
}
