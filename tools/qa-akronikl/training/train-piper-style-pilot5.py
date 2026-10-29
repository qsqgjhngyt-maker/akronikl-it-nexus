"""Bounded fresh-optimizer adaptation from actual trial4 to approved teacher style."""
import os,sys,json,time,hashlib,traceback,faulthandler,socket,logging
from pathlib import Path
sys.stdout.reconfigure(encoding='utf-8');sys.stderr.reconfigure(encoding='utf-8')
os.environ.update(HF_HUB_OFFLINE='1',TRANSFORMERS_OFFLINE='1',HF_HUB_DISABLE_TELEMETRY='1',WANDB_MODE='disabled',OMP_NUM_THREADS='4',MKL_NUM_THREADS='4',PYTHONDONTWRITEBYTECODE='1')
run=Path('private/piper-uyut7-pilot-5').resolve();root=Path('private/piper-uyut7-dataset5').resolve();base=Path('private/piper-uyut7-pilot-4/last.ckpt').resolve()
if run.exists():raise RuntimeError('REFUSE_PILOT5_OVERWRITE')
run.mkdir(parents=True);began=time.monotonic();state={'status':'INITIALIZING','accepted':False,'cloudCalls':0,'base':'Own trial4 checkpoint, warmstart paths cleared, fresh optimizers','maxGlobalSteps':8000,'priorGlobalSteps':6000,'twoOptimizerUpdatesPerMinibatch':True,'learningRateG':5e-5,'learningRateD':2.5e-5,'teacherWeight':4,'maxTrainingLoopMinutes':45}
def save():(run/'PROGRESS.json').write_text(json.dumps(state,indent=2)+'\n',encoding='utf-8')
save();faulthandler.enable(all_threads=True)
try:
 import torch,lightning as L
 from torch.utils.data import DataLoader,WeightedRandomSampler
 from lightning.pytorch import Trainer
 from lightning.pytorch.callbacks import Callback
 from lightning.pytorch.loggers import CSVLogger
 from piper.train.vits.dataset import VitsDataModule,UtteranceCollate
 from piper.train.vits.lightning import VitsModel
 from piper_training_environment import prepare_native_data
 prepare_native_data();logging.basicConfig(level=logging.INFO)
 if not torch.cuda.is_available():raise RuntimeError('CUDA_UNAVAILABLE')
 torch.set_num_threads(4);torch.set_num_interop_threads(2);torch.backends.cuda.matmul.allow_tf32=True;torch.backends.cudnn.allow_tf32=True;L.seed_everything(20261029,workers=True)
 def deny(*a,**kw):raise RuntimeError('PILOT5_NETWORK_DISABLED')
 socket.create_connection=deny;socket.socket.connect=deny
 proof=json.loads(Path('evidence/PILOT5_MIXED_DATASET.json').read_text(encoding='utf-8'))
 if proof['totalFitInputRows']!=176 or proof['teacherControlsUsedInFit'] is not False:raise RuntimeError('PILOT5_DATA_REQUIRED')
 rows=json.loads((root/'PRIVATE_MANIFEST.json').read_text(encoding='utf-8'));teacher_names={r['cacheKey']+'.phonemes.pt' for r in rows if r['source']=='approved-fast-speaker'}
 class MixedData(VitsDataModule):
  def train_dataloader(self):
   subset=self.train_dataset;utts=subset.dataset.utts
   weights=[4.0 if utts[i].phoneme_ids_path.name in teacher_names else 1.0 for i in subset.indices]
   count=sum(w==4 for w in weights);state['sampler']={'teacherRows':count,'bookRows':len(weights)-count,'expectedTeacherFraction':sum(w for w in weights if w==4)/sum(weights),'replacement':True,'csvDuplicated':False};save()
   return DataLoader(subset,batch_size=4,sampler=WeightedRandomSampler(weights,num_samples=len(weights),replacement=True,generator=torch.Generator().manual_seed(20261029)),num_workers=0,collate_fn=UtteranceCollate(is_multispeaker=False,segment_size=self.segment_size),drop_last=True,pin_memory=True)
 data=MixedData(csv_path=root/'train.csv',audio_dir=Path('private/piper-uyut7-dataset/wav').resolve(),cache_dir=root/'cache',config_path=root/'voice-pilot5.onnx.json',voice_name='uyut7-pilot5',espeak_voice='ru',sample_rate=22050,num_speakers=1,batch_size=4,num_workers=0,validation_split=.05,num_test_examples=0,trim_silence=False)
 state['baseCheckpointSha256']=hashlib.file_digest(base.open('rb'),'sha256').hexdigest();save()
 # Explicit overrides prevent old hparams from restoring Dmitri on_fit_start.
 model=VitsModel.load_from_checkpoint(base,map_location='cpu',weights_only=False,warmstart_ckpt=None,vocoder_warmstart_ckpt=None,learning_rate=5e-5,learning_rate_d=2.5e-5,mos_metric=None)
 if model._warmstart_ckpt is not None or model._vocoder_warmstart_ckpt is not None:raise RuntimeError('STALE_WARMSTART_WOULD_RESET_TRIAL4')
 expected=torch.load(base,map_location='cpu',weights_only=False)['state_dict'];expected={k:v for k,v in expected.items() if k.startswith('model_g.')}
 teacher_ids={r['cacheKey']:r['ids'] for r in json.loads(Path('private/teacher5/WASM_TRAIN_PHONEMES.json').read_text(encoding='utf-8'))}
 book_ids={r['cacheKey']:r['ids'] for r in json.loads(Path('private/piper4-wasm-phonemes.json').read_text(encoding='utf-8'))}
 class Progress(Callback):
  def __init__(self):self.saved=set()
  def on_train_start(self,trainer,module):
   actual=module.state_dict()
   if any(k not in actual or not torch.equal(actual[k].detach().cpu(),v) for k,v in expected.items()):raise RuntimeError('ACTUAL_GENERATOR_DIFFERS_FROM_TRIAL4')
   if [o.param_groups[0]['lr'] for o in trainer.optimizers]!=[5e-5,2.5e-5]:raise RuntimeError('OLD_OPTIMIZER_LR_RESTORED')
   for row in rows:
    wanted=(teacher_ids if row['source']=='approved-fast-speaker' else book_ids)[row['cacheKey']]
    if torch.load(root/'cache'/(row['cacheKey']+'.phonemes.pt'),map_location='cpu',weights_only=True).tolist()!=wanted:raise RuntimeError('WASM_IDS_CHANGED_BEFORE_FIT')
   state['actualGeneratorKeysVerifiedAgainstTrial4']=len(expected);state['actualWasmRowsVerified']=len(rows);state['actualOptimizerLearningRates']=[o.param_groups[0]['lr'] for o in trainer.optimizers];save();expected.clear()
  def on_train_batch_end(self,trainer,module,outputs,batch,batch_idx):
   step=int(trainer.global_step)
   if step%10==0 or batch_idx==0:
    losses={k:float(v.detach().cpu()) for k,v in trainer.callback_metrics.items() if hasattr(v,'numel') and v.numel()==1}
    if any(not torch.isfinite(torch.tensor(v)) for v in losses.values()):raise RuntimeError('NONFINITE_METRIC')
    state.update(status='TRAINING',globalStep=step,epoch=trainer.current_epoch,elapsedSeconds=time.monotonic()-began,losses=losses,peakGpuMiB=torch.cuda.max_memory_allocated()/1024**2);save();print(json.dumps({'step':step,'epoch':trainer.current_epoch,'seconds':round(state['elapsedSeconds'],1)}),flush=True)
   if (step==200 or step%1000==0) and step not in self.saved:trainer.save_checkpoint(run/f'step-{step:06d}.ckpt');self.saved.add(step)
 trainer=Trainer(accelerator='gpu',devices=1,precision='32-true',max_steps=8000,max_epochs=200,max_time='00:00:45:00',default_root_dir=run,logger=CSVLogger(run,'metrics'),callbacks=[Progress()],enable_checkpointing=False,enable_progress_bar=False,enable_model_summary=False,num_sanity_val_steps=1,limit_val_batches=2,log_every_n_steps=5,check_val_every_n_epoch=1,deterministic=False)
 trainer.fit(model,datamodule=data);trainer.save_checkpoint(run/'last.ckpt');state.update(status='PILOT_FINISHED_NOT_ACCEPTED',globalStep=int(trainer.global_step),epoch=trainer.current_epoch,elapsedSeconds=time.monotonic()-began,checkpoint=str(run/'last.ckpt'));save()
except BaseException:
 state.update(status='FAIL',elapsedSeconds=time.monotonic()-began,failure=traceback.format_exc()[-14000:]);save();raise
