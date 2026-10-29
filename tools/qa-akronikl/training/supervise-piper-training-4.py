"""Independent deadlines, immutable logs and real export for Russian-base trial 4."""
import sys,time,json,subprocess,hashlib,os
from pathlib import Path
sys.stdout.reconfigure(encoding='utf-8');sys.stderr.reconfigure(encoding='utf-8')
root=Path.cwd();proof=root/'evidence/TRAINING_SUPERVISOR_attempt4.json';started=time.time();state={'status':'VERIFYING_BASE','supervisorPid':os.getpid(),'startedAt':started,'cloudCalls':0,'trainingRun':'private/piper-uyut7-pilot-4','externalTrainingTimeoutMinutes':65,'externalExportTimeoutMinutes':15,'previousQualityFailPreserved':True}
def save():proof.write_text(json.dumps(state,indent=2)+'\n',encoding='utf-8')
if proof.exists():raise RuntimeError('REFUSE_SUPERVISOR_OVERWRITE')
save()
def bounded(command,stdout_name,stderr_name,timeout):
 with (root/'evidence'/stdout_name).open('x',encoding='utf-8') as stdout,(root/'evidence'/stderr_name).open('x',encoding='utf-8') as stderr:
  child=subprocess.Popen(command,cwd=root,stdout=stdout,stderr=stderr,creationflags=subprocess.CREATE_NO_WINDOW)
  state.update(status='CHILD_RUNNING',childPid=child.pid,childScript=command[2]);save()
  try:return child.wait(timeout=timeout)
  except subprocess.TimeoutExpired:
   import psutil
   if child.poll() is None:
    process=psutil.Process(child.pid)
    for descendant in process.children(recursive=True):
     try:descendant.kill()
     except psutil.NoSuchProcess:pass
    try:process.kill()
    except psutil.NoSuchProcess:pass
   raise RuntimeError('OWNED_CHILD_DEADLINE_EXCEEDED')
try:
 base=root/'dependencies/training-base-dmitri/initial-weights.pt';metadata=json.loads((root/'evidence/TRAIN_BASE_DMITRI_CONVERSION.json').read_text(encoding='utf-8'))
 if hashlib.file_digest(base.open('rb'),'sha256').hexdigest()!=metadata['convertedSha256']:raise RuntimeError('BASE_CHANGED_AFTER_CONVERSION')
 code=bounded([sys.executable,'-u','train-piper-russian-pilot4.py'],'PILOT_4.stdout.txt','PILOT_4.stderr.txt',3900);state['trainingExitCode']=code
 if code:raise RuntimeError('TRAINING_FAILED_INSPECT_PILOT_PROGRESS')
 output=root/'private/piper-uyut7-export-4/ru_RU-uyut7-medium.onnx'
 code=bounded([sys.executable,'-u','export-piper-pilot.py','private/piper-uyut7-pilot-4/last.ckpt',str(output),'private/piper-uyut7-dataset/voice-pilot4.onnx.json'],'PILOT_EXPORT_4.stdout.txt','PILOT_EXPORT_4.stderr.txt',900);state['exportExitCode']=code
 if code:raise RuntimeError('EXPORT_FAILED_INSPECT_LOG')
 state.update(status='EXPORTED_AWAITING_REAL_SYNTHESIS_AND_VOICE_REVIEW',output=str(output))
except BaseException as e:state.update(status='FAIL',failure=str(e))
finally:state['finishedAt']=time.time();save();print(json.dumps(state),flush=True)
if state['status']=='FAIL':sys.exit(1)
