import csv,json,hashlib,wave,sys,re
from pathlib import Path
import numpy as np
import soundfile as sf
from scipy.signal import resample_poly
sys.stdout.reconfigure(encoding='utf-8')
source=Path('C:/Users/User/Desktop/Уют-7_Neural_Studio_R1/Уют-7_Neural_Studio_R1/output/parts')
root=Path('private/piper-uyut7-dataset')
if root.exists():raise RuntimeError('REFUSE_DATASET_OVERWRITE')
(root/'wav').mkdir(parents=True);rows=[];excluded=[]
for file in sorted(source.glob('*_narrator.wav')):
 meta=json.loads(file.with_suffix('.json').read_text(encoding='utf-8'));text=meta.get('text','').strip();audio,sr=sf.read(file,dtype='float32',always_2d=True)
 duration=len(audio)/sr;rms=float(np.sqrt(np.mean(audio**2)));clipped=float(np.mean(np.abs(audio)>=.999))
 if meta.get('role')!='narrator' or not text or not 1.2<=duration<=18 or rms<.001 or clipped>.03:
  excluded.append({'source':file.name,'duration':duration,'rms':rms,'clipFraction':clipped,'reason':'Candidate filter: role/text/duration/RMS/clipping'});continue
 if audio.shape[1]!=1:audio=audio.mean(axis=1,keepdims=True)
 rendered=resample_poly(audio[:,0],147,160) if sr==24000 else resample_poly(audio[:,0],22050,sr)
 identifier=file.stem;destination=root/'wav'/(identifier+'.wav');sf.write(destination,rendered,22050,subtype='PCM_16')
 # Keep chunks of the same source paragraph together in the holdout split.
 group='_'.join(file.stem.split('_')[:2]);holdout=int(hashlib.sha256(group.encode()).hexdigest()[:8],16)%10==0
 rows.append({'id':identifier,'source':file.name,'group':group,'split':'validation' if holdout else 'train','duration':len(rendered)/22050,'text':text,'sourceSha256':hashlib.sha256(file.read_bytes()).hexdigest(),'wavSha256':hashlib.sha256(destination.read_bytes()).hexdigest(),'textSha256':hashlib.sha256(text.encode('utf-8')).hexdigest(),'rms':rms,'clipFraction':clipped})
for split in ('train','validation'):
 with (root/(split+'.csv')).open('w',encoding='utf-8',newline='') as stream:
  writer=csv.writer(stream,delimiter='|',lineterminator='\n');writer.writerows((r['id']+'.wav',r['text']) for r in rows if r['split']==split)
with (root/'metadata.csv').open('w',encoding='utf-8',newline='') as stream:
 writer=csv.writer(stream,delimiter='|',lineterminator='\n');writer.writerows((r['id']+'.wav',r['text']) for r in rows)
(root/'PRIVATE_MANIFEST.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
proof={'status':'CANDIDATE_DATASET_NOT_ASR_OR_HUMAN_VERIFIED','sampleRate':22050,'sourceModified':False,'apiCalls':0,'files':[{k:v for k,v in r.items() if k!='text'} for r in rows],'excluded':excluded,'trainCount':sum(r['split']=='train' for r in rows),'validationCount':sum(r['split']=='validation' for r in rows),'durationMinutes':sum(r['duration'] for r in rows)/60,'sameParagraphAcrossSplits':False}
Path('evidence/PIPER_UYUT7_DATASET.json').write_text(json.dumps(proof,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({k:v for k,v in proof.items() if k not in ('files','excluded')},ensure_ascii=False))
