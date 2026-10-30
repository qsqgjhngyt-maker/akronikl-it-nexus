"""New mixed corpus; old book cache, all source WAV and held-out controls stay intact."""
import sys,csv,json,hashlib,shutil
from pathlib import Path
import numpy as np,soundfile as sf,torch
from scipy.signal import resample_poly
from piper.train.vits.utils import get_cache_id
sys.stdout.reconfigure(encoding='utf-8')
old=Path('private/piper-uyut7-dataset');root=Path('private/piper-uyut7-dataset5');mode=sys.argv[1]
sha=lambda file:hashlib.file_digest(file.open('rb'),'sha256').hexdigest()
if mode=='read':
 if root.exists():raise RuntimeError('REFUSE_DATASET5_OVERWRITE')
 generation=json.loads(Path('evidence/TEACHER5_GENERATION.json').read_text(encoding='utf-8'))
 if generation['status']!='LOCAL_TEACHER_GENERATION_FINISHED_NOT_ASR_OR_HUMAN_VERIFIED' or generation['generated']!=32:raise RuntimeError('TEACHER_CORPUS_INCOMPLETE')
 (root/'cache').mkdir(parents=True);(root/'wav').mkdir()
 for file in (old/'cache-pilot4').iterdir():
  if file.suffix in ('.pt','.txt'):shutil.copy2(file,root/'cache'/file.name)
 with (old/'train.csv').open(encoding='utf-8',newline='') as stream:book=list(csv.reader(stream,delimiter='|'))
 if len(book)!=148:raise RuntimeError('BOOK_TRAIN_COUNT_CHANGED')
 rows=[{'id':r[0],'text':r[-1],'source':'book','cacheKey':get_cache_id(i,r[-1],speaker_id=None)} for i,r in enumerate(book,1)]
 teacher=json.loads(Path('private/teacher5/PRIVATE_MANIFEST.json').read_text(encoding='utf-8'));controls=[];new=[];quality=[]
 for r in teacher:
  file=Path(r['file'])
  if sha(file)!=r['wavSha256']:raise RuntimeError('TEACHER_WAV_CHANGED')
  audio,sr=sf.read(file,dtype='float32',always_2d=True);audio=audio.mean(axis=1)
  duration=len(audio)/sr;rms=float(np.sqrt(np.mean(audio**2)));clipping=float((np.abs(audio)>=.999).mean())
  if not np.isfinite(audio).all() or not 1<=duration<=15 or rms<.001 or clipping>.03:raise RuntimeError('TEACHER_ACOUSTIC_BOUNDS_FAILED_'+r['id'])
  normalized=resample_poly(audio,147,160) if sr==24000 else resample_poly(audio,22050,sr)
  dest=root/'wav'/(r['id']+'.wav');sf.write(dest,normalized,22050,subtype='PCM_16')
  item={'id':str(dest.resolve()),'text':r['text'],'source':'approved-fast-speaker','wavSha256':sha(dest),'duration':len(normalized)/22050}
  quality.append({'id':r['id'],'split':r['split'],'duration':duration,'rms':rms,'clipping':clipping,'rawSha256':r['wavSha256'],'resampledSha256':item['wavSha256']})
  if r['split']=='control':controls.append(item);continue
  item['cacheKey']=get_cache_id(len(rows)+1,item['text'],speaker_id=None);rows.append(item);new.append(item)
 if len(new)!=28 or len(controls)!=4:raise RuntimeError('TEACHER_SPLIT_CHANGED')
 if {r['text'] for r in rows}&{r['text'] for r in controls}:raise RuntimeError('CONTROL_TEXT_OVERLAP')
 control_audio={r['wavSha256'] for r in controls}
 fit_audio={r.get('wavSha256') or sha(old/'wav'/r['id']) for r in rows}
 if control_audio&fit_audio:raise RuntimeError('CONTROL_AUDIO_OVERLAP')
 for filename,items in (('train.csv',rows),('teacher-control.csv',controls)):
  with (root/filename).open('w',encoding='utf-8',newline='') as stream:csv.writer(stream,delimiter='|',lineterminator='\n').writerows((r['id'],r['text']) for r in items)
 (root/'PRIVATE_MANIFEST.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 (root/'PRIVATE_CONTROLS.json').write_text(json.dumps(controls,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 (root/'PRIVATE_TEACHER_AUDIO_AUDIT.json').write_text(json.dumps(quality,indent=2)+'\n',encoding='utf-8')
 print(json.dumps(new,ensure_ascii=True))
elif mode=='finish':
 new=json.loads(Path('private/teacher5/WASM_TRAIN_PHONEMES.json').read_text(encoding='utf-8'));rows=json.loads((root/'PRIVATE_MANIFEST.json').read_text(encoding='utf-8'))
 torch.set_num_threads(4);torch.set_num_interop_threads(2)
 from piper.train.vits.mel_processing import spectrogram_torch
 def direct_features(file):
  audio,sr=sf.read(file,dtype='float32',always_2d=True)
  if sr!=22050 or audio.shape[1]!=1:raise RuntimeError('FEATURE_INPUT_MUST_ALREADY_BE_MONO_22050')
  waveform=torch.from_numpy(audio[:,0].copy())
  spectrum=spectrogram_torch(y=waveform.unsqueeze(0),n_fft=1024,sampling_rate=22050,hop_size=256,win_size=1024,center=False).squeeze(0)
  return waveform,spectrum
 equivalence=[]
 for index in (0,73,147):
  r=rows[index];audio,spec=direct_features(old/'wav'/r['id']);key=r['cacheKey']
  previous_audio=torch.load(old/'cache-pilot4'/(key+'.audio.pt'),map_location='cpu',weights_only=True)
  previous_spec=torch.load(old/'cache-pilot4'/(key+'.spec.pt'),map_location='cpu',weights_only=True)
  if not torch.equal(audio,previous_audio) or spec.shape!=previous_spec.shape or not torch.allclose(spec,previous_spec,atol=1e-6,rtol=1e-5):raise RuntimeError('DIRECT_FEATURES_DIFFER_FROM_PREVIOUS_PIPELINE')
  equivalence.append({'cacheKeySha256':hashlib.sha256(key.encode()).hexdigest(),'audioExact':True,'specMaxAbsDelta':float((spec-previous_spec).abs().max())})
 for r in new:
  if not r['ids'] or any(type(i)!=int or i<0 or i>=256 for i in r['ids']):raise RuntimeError('INVALID_TEACHER_PHONEMES')
  torch.save(torch.LongTensor(r['ids']),root/'cache'/(r['cacheKey']+'.phonemes.pt'))
  (root/'cache'/(r['cacheKey']+'.phonemes.txt')).write_text(''.join(r['phonemes'])+'\n',encoding='utf-8')
  audio,spec=direct_features(Path(r['id']));torch.save(audio,root/'cache'/(r['cacheKey']+'.audio.pt'));torch.save(spec,root/'cache'/(r['cacheKey']+'.spec.pt'))
 from piper_training_environment import prepare_native_data
 from piper.train.vits.dataset import VitsDataModule
 prepare_native_data()
 data=VitsDataModule(csv_path=root/'train.csv',audio_dir=old/'wav',cache_dir=root/'cache',config_path=root/'voice-pilot5.onnx.json',voice_name='uyut7-pilot5',espeak_voice='ru',sample_rate=22050,num_speakers=1,batch_size=4,num_workers=0,validation_split=.05,num_test_examples=0,trim_silence=False)
 data.prepare_data()
 for r in new:
  if torch.load(root/'cache'/(r['cacheKey']+'.phonemes.pt'),map_location='cpu',weights_only=True).tolist()!=r['ids']:raise RuntimeError('NATIVE_REPLACED_WASM_IDS')
 proof={'status':'MIXED_APPROVED_STYLE_DATA_PREPARED_NOT_ASR_OR_HUMAN_VERIFIED','bookTrainRows':148,'teacherTrainRows':28,'teacherControlRows':4,'totalFitInputRows':len(rows),'sampleRate':22050,'teacherMode':'accepted speaker-only plus greedy-codes','teacherTrainingWeight':4,'teacherControlsUsedInFit':False,'originalBookHoldoutReadOrUsed':False,'originalSourcesModified':False,'cloudCalls':0,'teacherAudioBoundsPassed':True,'duplicateRowsAdded':False,'plannedSampler':'WeightedRandomSampler on training subset only, replacement, teacher weight4/book weight1','internalValidationIsIndependentTest':False,'directSoundfileTorchFeatureEquivalence':equivalence,'librosaAudioFirstCallBypassed':True}
 Path('evidence/PILOT5_MIXED_DATASET.json').write_text(json.dumps(proof,indent=2)+'\n',encoding='utf-8');print(json.dumps(proof),flush=True)
else:raise RuntimeError('INVALID_MODE')
