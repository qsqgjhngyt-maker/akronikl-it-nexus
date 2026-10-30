import sys,os,time,json,subprocess,traceback
from pathlib import Path
sys.stdout.reconfigure(encoding='utf-8');root=Path(__file__).resolve().parent;training=root.parent/'cloud-dialogue-round-20261029';python=training/'private/piper-training-env/Scripts/python.exe';proof=root/'evidence/PILOT6_PIPELINE.json'
if proof.exists():raise RuntimeError('REFUSE_PIPELINE_OVERWRITE')
state={'status':'WAITING_LOCAL_TEACHER','cloudCalls':0,'startedAt':time.time()}
def save():proof.write_text(json.dumps(state,indent=2)+'\n',encoding='utf-8')
save()
def run(args,label,timeout):
 with (root/'evidence'/(label+'.stdout.log')).open('x',encoding='utf-8') as a,(root/'evidence'/(label+'.stderr.log')).open('x',encoding='utf-8') as b:
  p=subprocess.Popen(args,cwd=training,stdout=a,stderr=b,creationflags=subprocess.CREATE_NO_WINDOW,env={**os.environ,'PYTHONDONTWRITEBYTECODE':'1','OMP_NUM_THREADS':'4','MKL_NUM_THREADS':'4','HF_HUB_OFFLINE':'1','TRANSFORMERS_OFFLINE':'1'})
  state.update(status=label,childPid=p.pid);save()
  try:code=p.wait(timeout=timeout)
  except subprocess.TimeoutExpired:
   import psutil
   child=psutil.Process(p.pid)
   for c in child.children(recursive=True):
    try:c.kill()
    except psutil.NoSuchProcess:pass
   p.kill();p.wait();raise RuntimeError('OWNED_CHILD_TIMEOUT '+label)
  if code:raise RuntimeError(label+' exit '+str(code))
try:
 deadline=time.monotonic()+22*60
 while True:
  f=root/'evidence/TEACHER6_GENERATION.json'
  if f.exists():
   try:d=json.loads(f.read_text(encoding='utf-8'))
   except json.JSONDecodeError:d={}
   if d.get('status')=='FAIL':raise RuntimeError('TEACHER6_FAILED')
   if d.get('status')=='GENERATED_NOT_HUMAN_OR_ASR_VERIFIED':
    if d['afterClose']['resident']:raise RuntimeError('QWEN_STILL_RESIDENT')
    break
  if time.monotonic()>deadline:raise RuntimeError('TEACHER_WAIT_TIMEOUT')
  time.sleep(3)
 run(['C:/Program Files/nodejs/node.exe','--expose-gc',str(root/'prepare-dataset6.mjs')],'DATASET6',180)
 run([str(python),'-u','-X','utf8',str(root/'train-pilot6.py')],'TRAIN6',25*60)
 for step in (500,1000,2000):
  run([str(python),'-u','-X','utf8',str(root/'export-checkpoint.py'),str(root/f'private/pilot6/step-{step:06d}.ckpt'),str(root/f'private/models/pilot6-step{step}.onnx'),str(root/'private/dataset6/voice.onnx.json')],'EXPORT6_'+str(step),600)
 state.update(status='EXPORTED_NOT_HUMAN_ACCEPTED',finishedAt=time.time())
except BaseException:state.update(status='FAIL',failure=traceback.format_exc(),finishedAt=time.time())
save();print(json.dumps(state),flush=True)
if state['status']=='FAIL':sys.exit(1)
