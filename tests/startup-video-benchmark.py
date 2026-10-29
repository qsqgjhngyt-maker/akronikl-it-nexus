from pathlib import Path
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlsplit, parse_qs, unquote
import threading, time, json, mimetypes, re, traceback, os
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent.parent
W=Path(os.environ.get('NEXUS_INTRO_WORK','/tmp/nexus-intro-smooth')); OUT=W/'evidence'; OUT.mkdir(parents=True,exist_ok=True)
class Link:
 def __init__(self,mbps):self.rate=mbps*1000000/8;self.next=0;self.lock=threading.Lock()
 def send(self,n):
  with self.lock:
   now=time.monotonic();self.next=max(self.next,now)+n/self.rate;target=self.next
  time.sleep(max(0,target-time.monotonic()))
class Handler(BaseHTTPRequestHandler):
 def log_message(self,*a):pass
 def do_GET(self):
  u=urlsplit(self.path);q=parse_qs(u.query);p=unquote(u.path)
  if p=='/':
   version=q.get('v',['before'])[0];gen='cinematic-v4' if version=='before' else 'cinematic-v6'
   body=f'''<!doctype html><html lang="ru"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#02060b;color:#fff;font-family:system-ui"><main>Nexus — готовая оболочка</main><footer class="entry-footer"></footer><script type="module">import {{installStartupIntro}} from '/{version}/core/startup-intro.js';installStartupIntro({{surface:'entry',videoBase:location.origin+'/intro-media/{gen}/'}});</script></body></html>'''.encode()
   return self.respond(body,'text/html')
  if p=='/favicon.ico':return self.respond(b'','image/png')
  if p.startswith('/before/'):
   name=p[len('/before/'):];file=(W/'before'/name).resolve()
   if not file.is_file():file=(ROOT/name).resolve()
  elif p.startswith('/after/'):file=(ROOT/p[len('/after/'):]).resolve()
  else:file=(ROOT/p.lstrip('/')).resolve()
  if not (file.is_relative_to(W) or file.is_relative_to(ROOT)) or not file.is_file():return self.respond(b'missing','text/plain',404)
  movie=file.suffix in ('.mp4','.webm')
  if movie and self.server.missing:return self.respond(b'missing','text/plain',404)
  body=file.read_bytes();mime={'.js':'text/javascript','.mjs':'text/javascript'}.get(file.suffix,mimetypes.guess_type(file)[0] or 'application/octet-stream')
  if not movie:return self.respond(body,mime)
  size=len(body);start=0;end=size-1;header=self.headers.get('Range');code=200
  if header:
   m=re.match(r'bytes=(\d*)-(\d*)$',header)
   if not m:return self.respond(b'','text/plain',416)
   if m[1]:start=int(m[1]);end=min(end,int(m[2])) if m[2] else end
   else:start=max(0,size-int(m[2]))
   if start>end or start>=size:return self.respond(b'','text/plain',416)
   code=206
  self.server.requests.append({'path':p,'start':start,'end':end,'bytes':end-start+1})
  self.send_response(code);self.send_header('Content-Type',mime);self.send_header('Content-Length',str(end-start+1));self.send_header('Accept-Ranges','bytes');self.send_header('Access-Control-Allow-Origin','*');self.send_header('Cache-Control','no-store')
  if code==206:self.send_header('Content-Range',f'bytes {start}-{end}/{size}')
  self.end_headers()
  try:
   time.sleep(.12)
   for i in range(start,end+1,32768):
    chunk=body[i:min(i+32768,end+1)];self.server.link.send(len(chunk));self.wfile.write(chunk);self.wfile.flush()
  except (BrokenPipeError,ConnectionResetError):pass
 def respond(self,body,mime,status=200):
  self.send_response(status);self.send_header('Content-Type',mime);self.send_header('Content-Length',str(len(body)));self.send_header('Cache-Control','no-store');self.end_headers()
  try:self.wfile.write(body)
  except (BrokenPipeError,ConnectionResetError):pass
INSTRUMENT=r'''(()=>{
const m=window.__measure={events:[],frames:[],quality:[],finished:null,videoCount:0,maxVideoCount:0,logoMutations:0};let first=0,last=0;
localStorage.setItem('test:progress','preserved');sessionStorage.setItem('test:session','preserved');
function sample(e){const v=e.target;if(!(v instanceof HTMLVideoElement))return;const t=performance.now();m.events.push({event:e.type,at:t,time:v.currentTime,src:v.currentSrc.split('/').slice(-3).join('/'),current:v.hasAttribute('data-current'),ready:v.readyState});if(e.type==='playing'&&!first){first=t;m.firstPlaying=t;}if(e.type==='timeupdate'||e.type==='ended'){const q=v.getVideoPlaybackQuality?.();if(q)m.quality.push({at:t,time:v.currentTime,total:q.totalVideoFrames,dropped:q.droppedVideoFrames,src:v.currentSrc});}}
for(const type of ['playing','waiting','stalled','ended','error','loadedmetadata','loadeddata','timeupdate'])document.addEventListener(type,sample,true);
const seen=new WeakSet();new MutationObserver(mutations=>{
const vs=[...document.querySelectorAll('[data-startup-intro] video')];m.maxVideoCount=Math.max(m.maxVideoCount,vs.length);
for(const change of mutations)if(change.attributeName==='data-logo-visible')m.logoMutations++;
for(const v of vs)if(!seen.has(v)){seen.add(v);m.videoCount++;if(v.requestVideoFrameCallback){const cb=(now,data)=>{if(v.isConnected&&!v.paused&&v.hasAttribute('data-current')){m.frames.push({at:now,media:data.mediaTime,presented:data.presentedFrames,gap:last?now-last:0});last=now;}if(v.isConnected)v.requestVideoFrameCallback(cb);};v.requestVideoFrameCallback(cb);}}
}).observe(document,{childList:true,subtree:true,attributes:true,attributeFilter:['data-logo-visible']});
addEventListener('nexus:intro-finished',e=>{m.finished={...e.detail,at:performance.now()};m.storagePreserved=localStorage.getItem('test:progress')==='preserved'&&sessionStorage.getItem('test:session')==='preserved';});
})();'''
def run(browser,version,variant,mbps,extra='normal'):
 s=ThreadingHTTPServer(('127.0.0.1',0),Handler);s.requests=[];s.link=Link(mbps);s.missing=extra=='missing';threading.Thread(target=s.serve_forever,daemon=True).start()
 c=browser.new_context(viewport={'width':390,'height':844} if variant=='mobile' else {'width':1440,'height':900},reduced_motion='reduce' if extra=='reduced' else 'no-preference')
 c.add_init_script(INSTRUMENT);p=c.new_page();errors=[];p.on('pageerror',lambda e:errors.append(str(e)))
 label=f'{version}-{variant}-{mbps:g}mbps-{extra}';row={'label':label,'version':version,'variant':variant,'mbps':mbps,'case':extra};print('START',label,flush=True)
 try:
  p.goto(f'http://127.0.0.1:{s.server_port}/?v={version}',wait_until='domcontentloaded');p.wait_for_selector('[data-startup-intro]',timeout=5000)
  if extra=='skip':p.locator('.nexus-intro-skip').click();p.wait_for_function('window.__measure.finished!==null',timeout=1000)
  elif extra=='resize':p.wait_for_function('window.__measure.firstPlaying>0',timeout=10000);p.wait_for_timeout(1000);p.set_viewport_size({'width':844,'height':390})
  if extra=='normal':
   try:p.wait_for_function('window.__measure.firstPlaying>0',timeout=10000);p.wait_for_timeout(500);p.screenshot(path=str(OUT/(label+'.png')))
   except Exception:pass
  p.wait_for_function('window.__measure.finished!==null',timeout=40000)
  m=p.evaluate('window.__measure');row.update({'reason':m['finished']['reason'],'firstPlayingMs':round(m.get('firstPlaying',0)),'finishMs':round(m['finished']['at']),'playedSeconds':m['finished']['playedSeconds'],'maxVideoCount':m['maxVideoCount'],'logoMutations':m['logoMutations'],'storagePreserved':m['storagePreserved'],'errors':errors,'videoRequests':len(s.requests),'requests':s.requests})
  frames=m['frames'];row['maxFrameGapMs']=round(max((x['gap'] for x in frames),default=0),1);row['frameGapsOver200ms']=sum(x['gap']>200 for x in frames)
  waits=[];wait=None;started=False
  for ev in m['events']:
   if ev['event']=='playing':
    if wait is not None:waits.append(ev['at']-wait);wait=None
    started=True
   elif ev['event']=='waiting' and started and ev['current'] and wait is None:wait=ev['at']
  row['rebufferCount']=len(waits);row['rebufferMs']=round(sum(waits));row['maxDroppedFrames']=max((v['dropped'] for v in m['quality']),default=0)
  (OUT/(label+'.json')).write_text(json.dumps({'summary':row,'raw':m},ensure_ascii=False,indent=2));print('RESULT',json.dumps(row,ensure_ascii=False),flush=True)
 except Exception as e:row['failure']=str(e);traceback.print_exc()
 finally:c.close();s.shutdown();s.server_close()
 return row
if __name__=='__main__':
 import sys
 matrix=[('before','desktop',5),('after','desktop',5),('before','mobile',3),('after','mobile',3),('after','desktop',15),('after','mobile',15)]
 if '--quick' in sys.argv:matrix=[('after','mobile',3)]
 if '--failures' in sys.argv:matrix=[('after','mobile',3,'missing'),('after','desktop',3,'skip'),('after','mobile',3,'reduced'),('after','mobile',15,'resize')]
 with sync_playwright() as pw:
  b=pw.chromium.launch(executable_path=os.environ.get('NEXUS_CHROME_PATH'),headless=True,args=['--no-sandbox']);rows=[run(b,*x) for x in matrix];b.close()
 name='failure-cases.json' if '--failures' in sys.argv else 'browser-comparison.json'
 (OUT/name).write_text(json.dumps({'scope':'Chromium Linux, synthetic shared-bandwidth HTTP Range; mobile viewport, NOT physical phones','rows':rows},ensure_ascii=False,indent=2))
 for row in rows:
  if row.get('version')!='after':continue
  assert 'failure' not in row,row
  assert row['storagePreserved'] and not row['errors'],row
  assert row['maxVideoCount']==1,row
  expected={'skip':'skip','missing':'fallback','reduced':'fallback'}.get(row['case'],'ended')
  assert row['reason']==expected,row
  if row['case']=='normal':
   assert row['rebufferCount']==0,row
   assert row['frameGapsOver200ms']==0,row
 print('AUTOMATED PASS: реализация и синтетический транспорт. Physical mobile LIVE не заявляется.')
