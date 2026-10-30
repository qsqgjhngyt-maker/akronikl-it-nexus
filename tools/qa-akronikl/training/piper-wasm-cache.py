"""Private train-only cache preparation. Original cache and external holdout stay intact."""
import sys,csv,json,hashlib,shutil
from pathlib import Path
import torch
from piper.train.vits.utils import get_cache_id
sys.stdout.reconfigure(encoding='utf-8')
root=Path('private/piper-uyut7-dataset');source=root/'cache';mode=sys.argv[1]
if mode=='read':
 rows=[]
 with (root/'train.csv').open(encoding='utf-8',newline='') as stream:
  for number,row in enumerate(csv.reader(stream,delimiter='|'),1):
   key=get_cache_id(number,row[-1],speaker_id=None)
   ids=torch.load(source/(key+'.phonemes.pt'),map_location='cpu',weights_only=True).reshape(-1).tolist()
   rows.append({'id':row[0],'text':row[-1],'cacheKey':key,'oldIds':ids})
 print(json.dumps(rows,ensure_ascii=True))
elif mode=='assemble':
 rows=json.loads(Path('private/piper4-wasm-phonemes.json').read_text(encoding='utf-8'));target=root/'cache-pilot4'
 if target.exists():raise RuntimeError('REFUSE_WASM_CACHE_OVERWRITE')
 target.mkdir();manifest=[];changed=0
 for row in rows:
  key=row['cacheKey'];ids=row['ids']
  if not ids or any(type(i)!=int or i<0 or i>=256 for i in ids):raise RuntimeError('INVALID_WASM_PHONEME_IDS')
  for suffix in ('.audio.pt','.spec.pt','.txt'):
   original=source/(key+suffix);before=hashlib.file_digest(original.open('rb'),'sha256').hexdigest();destination=target/(key+suffix);shutil.copy2(original,destination)
   if hashlib.file_digest(destination.open('rb'),'sha256').hexdigest()!=before:raise RuntimeError('CACHE_COPY_CHANGED')
  torch.save(torch.LongTensor(ids),target/(key+'.phonemes.pt'))
  (target/(key+'.phonemes.txt')).write_text(''.join(row['phonemes'])+'\n',encoding='utf-8')
  changed+=ids!=row['oldIds'];manifest.append({'cacheKeySha256':hashlib.sha256(key.encode()).hexdigest(),'textSha256':hashlib.sha256(row['text'].encode()).hexdigest(),'oldIdsSha256':hashlib.sha256(json.dumps(row['oldIds']).encode()).hexdigest(),'wasmIdsSha256':hashlib.sha256(json.dumps(ids).encode()).hexdigest(),'changed':ids!=row['oldIds']})
 proof={'status':'BROWSER_WASM_TRAIN_CACHE_PREPARED_NOT_QUALITY_ACCEPTED','rows':len(rows),'changedRows':changed,'unchangedRows':len(rows)-changed,'runtime':'Exact browser piper_phonemize.wasm/data and ru CLI, one module per text','originalCacheModified':False,'externalHoldoutReadOrUsed':False,'cloudCalls':0,'networkRequests':0,'maxId':max(max(r['ids']) for r in rows),'manifest':manifest}
 Path('evidence/PILOT4_WASM_TRAIN_CACHE.json').write_text(json.dumps(proof,indent=2)+'\n',encoding='utf-8');print(json.dumps({k:v for k,v in proof.items() if k!='manifest'}))
else:raise RuntimeError('INVALID_MODE')
