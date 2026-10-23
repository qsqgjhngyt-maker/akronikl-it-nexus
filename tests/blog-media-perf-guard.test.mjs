import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {bindBlogMedia,createBlogMediaLoader} from '../core/blog-layout.js';

const deferred=()=>{let resolve;const promise=new Promise(yes=>{resolve=yes});return{promise,resolve}};
const photo=(label='synthetic editor photo')=>{
  const bytes=Buffer.from(label),id=createHash('sha256').update(bytes).digest('hex'),data=bytes.toString('base64');
  return{id,src:'data:image/jpeg;base64,'+data,dto:{media:{id,mime:'image/jpeg',data,width:80,height:50}}};
};
const imageRoot=ids=>{
  const images=ids.map(id=>{
    const attrs=new Map([['aria-busy','true']]),classes=new Set();
    return{dataset:{blogMedia:id},isConnected:true,src:'placeholder',alt:'Фото',parentElement:null,attrs,
      classList:{add:c=>classes.add(c),remove:c=>classes.delete(c),contains:c=>classes.has(c)},
      setAttribute:(key,value)=>attrs.set(key,value),removeAttribute:key=>attrs.delete(key),closest:()=>null};
  });
  return{images,isConnected:true,querySelectorAll:()=>images};
};

test('Повторно проверенное фото снимает aria-busy без сетевого запроса', async () => {
  const bytes = Buffer.from('NEXUS verified public image fixture');
  const id = createHash('sha256').update(bytes).digest('hex');
  const src = 'data:image/jpeg;base64,' + bytes.toString('base64');
  const attrs = new Map([['aria-busy', 'true']]);
  const image = {
    dataset: {blogMedia: id}, isConnected: true, src: '', alt: 'Фото', parentElement: null,
    classList: {add() {}, remove() {}, contains() { return false; }},
    setAttribute(key, value) { attrs.set(key, value); },
    removeAttribute(key) { attrs.delete(key); },
    closest() { return null; }
  };
  const root = {isConnected: true, querySelectorAll() { return [image]; }};
  let requests = 0;
  await bindBlogMedia(root, {
    localImages: new Map([[id, src]]),
    async fetchImpl() { requests++; throw Error('Повторный запрос запрещён'); }
  });
  assert.equal(requests, 0);
  assert.equal(image.src, src);
  assert.equal(attrs.has('aria-busy'), false);
});

test('Один редактор объединяет in-flight canvas/list; повторная обложка использует проверенные bytes',async t=>{
  const p=photo(),gate=deferred();let requests=0;
  const mediaLoader=createBlogMediaLoader({privateRead:async()=>{requests++;await gate.promise;return p.dto}});
  const canvas=imageRoot([p.id]),list=imageRoot([p.id]);
  const binds=Promise.all([bindBlogMedia(canvas,{mediaLoader}),bindBlogMedia(list,{mediaLoader})]);
  assert.equal(requests,1);gate.resolve();await binds;
  assert.equal(canvas.images[0].src,p.src);assert.equal(list.images[0].src,p.src);
  const before=requests;
  for(let i=0;i<2;i++){const cover=imageRoot([p.id]);await bindBlogMedia(cover,{mediaLoader});assert.equal(cover.images[0].src,p.src);assert.equal(cover.images[0].attrs.has('aria-busy'),false)}
  assert.equal(requests-before,0);
  t.diagnostic('Concurrent canvas/list: 1 GET; two cover rerenders after verification: 0 GET');mediaLoader.dispose();
});

test('Обложка, список и макет делят общий предел трёх запросов',async()=>{
  const photos=Array.from({length:6},(_,i)=>photo('queue photo '+i)),byId=new Map(photos.map(p=>[p.id,p])),gate=deferred();
  let active=0,peak=0,requests=0;
  const mediaLoader=createBlogMediaLoader({privateRead:async path=>{
    requests++;active++;peak=Math.max(peak,active);
    try{await gate.promise;return byId.get(path.split('=')[1]).dto}finally{active--}
  }});
  const roots=[imageRoot([photos[0].id]),imageRoot(photos.slice(1).map(p=>p.id)),imageRoot(photos.map(p=>p.id))];
  const binds=Promise.all(roots.map(root=>bindBlogMedia(root,{mediaLoader})));
  assert.equal(requests,3);assert.equal(peak,3);gate.resolve();await binds;
  assert.equal(requests,6);assert.equal(peak,3);
  for(const root of roots)for(const img of root.images)assert.equal(img.src,byId.get(img.dataset.blogMedia).src);
  mediaLoader.dispose();
});

test('Новый редактор и новый публичный показ проверяют фото заново',async()=>{
  const p=photo();let requests=0;
  const privateRead=async()=>{requests++;return p.dto};
  const first=createBlogMediaLoader({privateRead}),second=createBlogMediaLoader({privateRead});
  await first.load(p.id);await second.load(p.id);assert.equal(requests,2);first.dispose();second.dispose();
  requests=0;const fetchImpl=async()=>{requests++;return Response.json(p.dto)};
  await bindBlogMedia(imageRoot([p.id]),{fetchImpl});await bindBlogMedia(imageRoot([p.id]),{fetchImpl});
  assert.equal(requests,2,'Public publication must be rechecked for each new view');
});

test('Плохая SHA и временная ошибка не попадают в кеш и не блокируют адресный retry',async()=>{
  const p=photo(),wrong=photo('wrong bytes');let requests=0;
  const loader=createBlogMediaLoader({privateRead:async()=>{
    requests++;if(requests===1)throw Error('synthetic network failure');
    return requests===2?{media:{...p.dto.media,data:wrong.dto.media.data}}:p.dto;
  }});
  await assert.rejects(loader.load(p.id),/network failure/);assert.equal(loader.peek(p.id),undefined);
  await assert.rejects(loader.load(p.id),/Контрольная сумма/);assert.equal(loader.peek(p.id),undefined);
  assert.equal(await loader.load(p.id),p.src);assert.equal(requests,3);assert.equal(loader.peek(p.id),p.src);loader.dispose();
});

test('Отмена одного DOM-bind не отменяет общий запрос другого живого представления',async()=>{
  const p=photo(),gate=deferred(),cancel=new AbortController();let transportSignal,requests=0;
  const mediaLoader=createBlogMediaLoader({privateRead:async(_path,{signal})=>{requests++;transportSignal=signal;await gate.promise;return p.dto}});
  const removed=imageRoot([p.id]),current=imageRoot([p.id]);
  const binds=Promise.all([bindBlogMedia(removed,{mediaLoader,signal:cancel.signal}),bindBlogMedia(current,{mediaLoader})]);
  cancel.abort();assert.equal(transportSignal.aborted,false);gate.resolve();await binds;
  assert.equal(requests,1);assert.equal(removed.images[0].src,'placeholder');assert.equal(current.images[0].src,p.src);
  assert.equal(removed.images[0].classList.contains('blog-media-unavailable'),false);mediaLoader.dispose();
});

test('Dispose отменяет transport/очередь, очищает bytes и игнорирует поздний private ответ',async()=>{
  const photos=Array.from({length:5},(_,i)=>photo('dispose photo '+i)),byId=new Map(photos.map(p=>[p.id,p])),gate=deferred(),signals=[],localImages=new Map();
  let requests=0;
  const loader=createBlogMediaLoader({localImages,privateRead:async(path,{signal})=>{
    requests++;signals.push(signal);await gate.promise;return byId.get(path.split('=')[1]).dto;
  }});
  const results=Promise.allSettled(photos.map(p=>loader.load(p.id)));assert.equal(requests,3);
  loader.dispose();const settled=await results;
  assert.ok(settled.every(r=>r.status==='rejected'&&r.reason.name==='AbortError'));
  assert.ok(signals.every(signal=>signal.aborted));gate.resolve();await new Promise(resolve=>setImmediate(resolve));
  assert.equal(requests,3);assert.equal(localImages.size,0);assert.equal(loader.peek(photos[0].id),undefined);
  await assert.rejects(loader.load(photos[0].id),{name:'AbortError'});
});

test('Dispose живого редактора не показывает retry и не возвращает private bytes в DOM',async()=>{
  const p=photo(),gate=deferred(),root=imageRoot([p.id]);let aborted=false;
  const mediaLoader=createBlogMediaLoader({privateRead:async(_path,{signal})=>{
    signal.addEventListener('abort',()=>{aborted=true},{once:true});await gate.promise;return p.dto;
  }});
  const bind=bindBlogMedia(root,{mediaLoader});mediaLoader.dispose();await bind;gate.resolve();await new Promise(resolve=>setImmediate(resolve));
  assert.equal(aborted,true);assert.equal(root.images[0].src,'placeholder');assert.equal(root.images[0].classList.contains('blog-media-unavailable'),false);
  assert.equal(mediaLoader.peek(p.id),undefined);
});

test('Потеря current scope необратимо закрывает старый loader и не переносит кеш между аккаунтами',async()=>{
  const p=photo(),gate=deferred(),localImages=new Map();let current=true,requests=0;
  const loader=createBlogMediaLoader({localImages,isCurrent:()=>current,privateRead:async()=>{requests++;await gate.promise;return p.dto}});
  const pending=loader.load(p.id);const result=assert.rejects(pending,{name:'AbortError'});
  current=false;assert.equal(loader.peek(p.id),undefined);await result;gate.resolve();await new Promise(resolve=>setImmediate(resolve));
  current=true;assert.equal(localImages.size,0);await assert.rejects(loader.load(p.id),{name:'AbortError'});assert.equal(requests,1);
});

test('Обычный публичный bind передаёт abort в fetch и не создаёт retry после отмены',async()=>{
  const p=photo(),cancel=new AbortController(),root=imageRoot([p.id]);let transportSignal;
  const fetchImpl=(_path,{signal})=>{transportSignal=signal;return new Promise((_resolve,reject)=>signal.addEventListener('abort',()=>reject(new DOMException('aborted','AbortError')),{once:true}))};
  const bind=bindBlogMedia(root,{fetchImpl,signal:cancel.signal});cancel.abort();await bind;
  assert.equal(transportSignal.aborted,true);assert.equal(root.images[0].src,'placeholder');assert.equal(root.images[0].classList.contains('blog-media-unavailable'),false);
});
