"""Own child deadlines and immutable logs for adaptation5, no cloud usage."""
import sys,os,time,json,subprocess
from pathlib import Path
sys.stdout.reconfigure(encoding='utf-8');sys.stderr.reconfigure(encoding='utf-8')
root=Path.cwd();proof=root/'evidence/TRAINING_SUPERVISOR_attempt5.json'
if proof.exists():raise RuntimeError('REFUSE_SUPERVISOR5_OVERWRITE')
state={'status':'INITIALIZING','supervisorPid':os.getpid(),'cloudCalls':0,'trainingRun':'private/piper-uyut7-pilot-5','startedAt':time.time(),'trainingTimeoutMinutes':65,'exportTimeoutMinutes':15}
def save():proof.write_text(json.dumps(state,indent=2)+'\n',encoding='utf-8')
save()
def bounded(command,label,timeout):
 with (root/'evidence'/(label+'.stdout.txt')).open('x',encoding='utf-8') as out,(root/'evidence'/(label+'.stderr.txt')).open('x',encoding='utf-8') as err:
  child=subprocess.Popen(command,cwd=root,stdout=out,stderr=err,creationflags=subprocess.CREATE_NO_WINDOW);state.update(status='CHILD_RUNNING',childPid=child.pid,childScript=command[2]);save()
  try:return child.wait(timeout=timeout)
  except subprocess.TimeoutExpired:
   import psutil
   if child.poll() is None:
    p=psutil.Process(child.pid)
    for descendant in p.children(recursive=True):
     try:descendant.kill()
     except psutil.NoSuchProcess:pass
    try:p.kill()
    except psutil.NoSuchProcess:pass
   raise RuntimeError('OWNED_CHILD_DEADLINE_EXCEEDED')
try:
 code=bounded([sys.executable,'-u','train-piper-style-pilot5.py'],'PILOT_5',3900);state['trainingExitCode']=code
 if code:raise RuntimeError('TRAINING5_FAILED')
 output=root/'private/piper-uyut7-export-5/ru_RU-uyut7-medium.onnx'
 code=bounded([sys.executable,'-u','export-piper-pilot.py','private/piper-uyut7-pilot-5/last.ckpt',str(output),'private/piper-uyut7-dataset5/voice-pilot5.onnx.json'],'PILOT_EXPORT_5',900);state['exportExitCode']=code
 if code:raise RuntimeError('EXPORT5_FAILED')
 state.update(status='EXPORTED_AWAITING_REAL_SYNTHESIS_AND_VOICE_REVIEW',output=str(output))
except BaseException as e:state.update(status='FAIL',failure=str(e))
finally:state['finishedAt']=time.time();save();print(json.dumps(state),flush=True)
if state['status']=='FAIL':sys.exit(1)
