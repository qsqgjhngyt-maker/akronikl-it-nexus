import sys,os,json,time,wave,hashlib,shutil
from pathlib import Path
sys.stdout.reconfigure(encoding='utf-8');os.environ.update(OMP_NUM_THREADS='4',MKL_NUM_THREADS='4',HF_HUB_OFFLINE='1',TRANSFORMERS_OFFLINE='1')
import numpy as np,onnxruntime as ort
from scipy.signal import butter,sosfiltfilt
root=Path(__file__).resolve().parent;task=root.parent;out=root/'evidence/audio-pilot6'
if out.exists():raise RuntimeError('REFUSE_AUDITION6_OVERWRITE')
out.mkdir();rows=json.loads((root/'evidence/PILOT6_HOLDOUT_INPUTS.json').read_text(encoding='utf-8'))
models={'previous8000':task/'dependencies/piper-uyut7-pilot-5/models/ru_RU-uyut7-pilot5-medium.onnx',**{f'new{s}':root/f'private/models/pilot6-step{s}.onnx' for s in (500,1000,2000)}}
sha=lambda file:hashlib.file_digest(file.open('rb'),'sha256').hexdigest()
results=[]
def write(name,audio):
 file=out/name
 with wave.open(str(file),'wb') as w:w.setnchannels(1);w.setsampwidth(2);w.setframerate(22050);w.writeframes((np.clip(audio,-1,1)*32767).astype('<i2').tobytes())
 return {'file':name,'sha256':sha(file),'seconds':len(audio)/22050,'clippedFraction':float(np.mean(np.abs(audio)>=1)),'peakDb':float(20*np.log10(max(float(np.abs(audio).max()),1e-9)))}
for row in rows:
 source=Path(row['reference'])
 if sha(source)!=row['referenceSha256']:raise RuntimeError('REFERENCE_CHANGED')
 shutil.copyfile(source,out/(row['id']+'_qwen.wav'))
for name,model in models.items():
 opts=ort.SessionOptions();opts.intra_op_num_threads=4;opts.inter_op_num_threads=1
 session=ort.InferenceSession(str(model),sess_options=opts,providers=['CPUExecutionProvider'])
 for row in rows:
  ids=np.array([row['ids']],dtype=np.int64);at=time.perf_counter();audio=session.run(None,{'input':ids,'input_lengths':np.array([ids.shape[1]],dtype=np.int64),'scales':np.array([.5,1,.65],dtype=np.float32)})[0].reshape(-1)
  record=write(row['id']+'_'+name+'.wav',audio);record.update(model=name,modelSha256=sha(model),control=row['id'],synthesisMs=(time.perf_counter()-at)*1000,scales=[.5,1,.65]);results.append(record);print(json.dumps(record),flush=True)
  if name=='new2000':
   filtered=sosfiltfilt(butter(2,[50,9200],btype='bandpass',fs=22050,output='sos'),audio)
   filtered[:110]*=np.linspace(0,1,110);filtered[-110:]*=np.linspace(1,0,110)
   r=write(row['id']+'_'+name+'_filtered.wav',filtered);r.update(model=name,control=row['id'],processing='50-9200Hz order2 zero-phase; 5ms boundary fade; no neural denoising or pitch/timing change');results.append(r)
 if name=='new2000':
  code=next(r for r in json.loads((root/'evidence/SAMPLE_INPUTS.json').read_text(encoding='utf-8'))['rows'] if r['id']=='code');parts=[];began=time.perf_counter()
  for chunk in code['chunks']:
   ids=np.array([chunk['ids']],dtype=np.int64);parts.append(session.run(None,{'input':ids,'input_lengths':np.array([ids.shape[1]],dtype=np.int64),'scales':np.array([.5,1,.65],dtype=np.float32)})[0].reshape(-1))
  r=write('cpp_unseen_new2000.wav',np.concatenate(parts));r.update(model=name,control='unseen_cpp',text=code['text'],spoken=code['spoken'],synthesisMs=(time.perf_counter()-began)*1000);results.append(r)
 del session
(root/'evidence/PILOT6_AUDITION.json').write_text(json.dumps({'status':'REAL_HELDOUT_SYNTHESIS_AWAITING_HUMAN_REVIEW','cloudCalls':0,'controlsUsedInFit':False,'qualityAccepted':False,'rows':results},indent=2)+'\n',encoding='utf-8')
