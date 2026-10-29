import sys,os,json,csv,hashlib,shutil
from pathlib import Path
sys.stdout.reconfigure(encoding='utf-8');os.environ.update(OMP_NUM_THREADS='4',MKL_NUM_THREADS='4',PYTHONDONTWRITEBYTECODE='1')
import torch,numpy as np,soundfile as sf
from scipy.signal import resample_poly
from piper.train.vits.utils import get_cache_id
root=Path(__file__).resolve().parent;old=root.parent/'cloud-dialogue-round-20261029';dataset=root/'private/dataset6';mode=sys.argv[1]
sha=lambda p:hashlib.file_digest(p.open('rb'),'sha256').hexdigest()
if mode=='read':
 if dataset.exists():raise RuntimeError('REFUSE_DATASET6_OVERWRITE')
 (dataset/'cache').mkdir(parents=True);(dataset/'wav').mkdir()
 oldrows=json.loads((old/'private/teacher5/PRIVATE_MANIFEST.json').read_text(encoding='utf-8'))
 new=json.loads((root/'evidence/TEACHER6_GENERATION.json').read_text(encoding='utf-8'))
 if new['status']!='GENERATED_NOT_HUMAN_OR_ASR_VERIFIED' or new['generated']!=32 or new['afterClose']['resident']:raise RuntimeError('TEACHER6_NOT_READY')
 rows=[];controls=[]
 for row in oldrows+new['rows']:
  file=Path(row['file'])
  if sha(file)!=row['wavSha256']:raise RuntimeError('TEACHER_SOURCE_CHANGED')
  if row['split']!='train':controls.append({'id':row['id'],'text':row['text'],'sha256':row['wavSha256'],'file':str(file)});continue
  x,sr=sf.read(file,dtype='float32',always_2d=True);x=x.mean(axis=1)
  if not np.isfinite(x).all() or (abs(x)>=.999).mean()>.005 or not 1<len(x)/sr<20:raise RuntimeError('AUDIO_BOUNDS')
  x=resample_poly(x,147,160) if sr==24000 else resample_poly(x,22050,sr)
  # Remove DC and inaudible edge silence; retain internal phrasing and 40/80 ms context.
  x=x-float(x.mean());frame=256;rms=np.sqrt(np.mean(x[:len(x)//frame*frame].reshape(-1,frame)**2,axis=1)+1e-12)
  threshold=max(.0005,float(np.percentile(rms,90))*.008);active=np.flatnonzero(rms>threshold)
  if not len(active):raise RuntimeError('SILENT_TEACHER')
  start=max(0,int(active[0]*frame)-882);end=min(len(x),int((active[-1]+1)*frame)+1764);x=x[start:end]
  gain=min(2.5,.065/max(float(np.sqrt(np.mean(x*x))),1e-6),.97/max(float(abs(x).max()),1e-6));x=x*gain
  dest=dataset/'wav'/(row['id']+'.wav');sf.write(dest,x,22050,subtype='PCM_16')
  label=row.get('qwenPrompt',row['text'])
  item={'id':str(dest.resolve()),'text':label,'source':'approved-fast-speaker-only','cacheKey':get_cache_id(len(rows)+1,label,speaker_id=None),'sha256':sha(dest),'sourceSha256':row['wavSha256'],'duration':len(x)/22050,'gain':gain,'trimStartSamples':start,'trimEndSamples':end}
  rows.append(item)
 canonical=lambda t:' '.join(t.replace('\u0301','').lower().split())
 if len(rows)!=52 or len(controls)!=12 or {canonical(r['text']) for r in rows}&{canonical(r['text']) for r in controls}:raise RuntimeError('DATA_SPLIT_CHANGED')
 if {r['sourceSha256'] for r in rows}&{r['sha256'] for r in controls}:raise RuntimeError('CONTROL_AUDIO_LEAK')
 with (dataset/'train.csv').open('w',encoding='utf-8',newline='') as f:csv.writer(f,delimiter='|',lineterminator='\n').writerows((r['id'],r['text']) for r in rows)
 (dataset/'PRIVATE_MANIFEST.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');(dataset/'PRIVATE_CONTROLS.json').write_text(json.dumps(controls,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 shutil.copyfile(old/'private/piper-uyut7-dataset5/voice-pilot5.onnx.json',dataset/'voice.onnx.json');print(json.dumps(rows,ensure_ascii=True))
elif mode=='finish':
 torch.set_num_threads(4);torch.set_num_interop_threads(2)
 from piper.train.vits.mel_processing import spectrogram_torch
 rows=json.loads((dataset/'PRIVATE_MANIFEST.json').read_text(encoding='utf-8'));phones=json.loads((dataset/'WASM_IDS.json').read_text(encoding='utf-8'))
 if len(phones)!=len(rows):raise RuntimeError('PHONEME_COUNT')
 for row,p in zip(rows,phones):
  if row['id']!=p['id'] or not p['ids'] or any(type(i)!=int or not 0<=i<256 for i in p['ids']):raise RuntimeError('PHONEME_ROWS_CHANGED')
  x,sr=sf.read(row['id'],dtype='float32',always_2d=True)
  if sr!=22050 or x.shape[1]!=1:raise RuntimeError('PCM_SHAPE')
  audio=torch.from_numpy(x[:,0].copy());spec=spectrogram_torch(y=audio.unsqueeze(0),n_fft=1024,sampling_rate=22050,hop_size=256,win_size=1024,center=False).squeeze(0)
  key=dataset/'cache'/row['cacheKey'];torch.save(audio,Path(str(key)+'.audio.pt'));torch.save(spec,Path(str(key)+'.spec.pt'));torch.save(torch.LongTensor(p['ids']),Path(str(key)+'.phonemes.pt'));Path(str(key)+'.phonemes.txt').write_text(p['phonemes']+'\n',encoding='utf-8')
 proof={'status':'TEACHER_ONLY_DATASET_READY_NOT_HUMAN_ACCEPTED','fitRows':len(rows),'externalControlRows':12,'bookRowsUsed':0,'controlsUsedInFit':False,'originalSourcesChanged':False,'sampleRate':22050,'fitSeconds':sum(r['duration'] for r in rows),'cloudCalls':0,'processing':'DC removal, quiet edges only, bounded gain; no spectral denoising or artificial voice replacement','manifestSha256':sha(dataset/'PRIVATE_MANIFEST.json')}
 (root/'evidence/DATASET6.json').write_text(json.dumps(proof,indent=2)+'\n',encoding='utf-8');print(json.dumps(proof),flush=True)
else:raise RuntimeError('MODE')
