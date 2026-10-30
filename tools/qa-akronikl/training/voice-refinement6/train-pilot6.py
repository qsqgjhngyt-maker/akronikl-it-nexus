"""Bounded teacher-only trial. Not a quality acceptance or production operation."""
import os,sys,json,time,hashlib,socket,logging,traceback,faulthandler
from pathlib import Path
sys.stdout.reconfigure(encoding='utf-8');sys.stderr.reconfigure(encoding='utf-8')
os.environ.update(HF_HUB_OFFLINE='1',TRANSFORMERS_OFFLINE='1',HF_HUB_DISABLE_TELEMETRY='1',WANDB_MODE='disabled',OMP_NUM_THREADS='4',MKL_NUM_THREADS='4',PYTHONDONTWRITEBYTECODE='1')
root=Path(__file__).resolve().parent;training=root.parent/'cloud-dialogue-round-20261029';sys.path.insert(0,str(training));run=root/'private/pilot6';dataset=root/'private/dataset6';base=training/'private/piper-uyut7-pilot-5/last.ckpt'
if run.exists():raise RuntimeError('REFUSE_PILOT6_OVERWRITE')
run.mkdir(parents=True);began=time.monotonic();state={'status':'INITIALIZING','accepted':False,'cloudCalls':0,'bookRowsUsed':0,'maxGlobalSteps':2000,'learningRateG':2e-5,'learningRateD':1e-5,'priorGlobalSteps':8000,'freshOptimizers':True,'twoOptimizerUpdatesPerMinibatch':True}
def save():(run/'PROGRESS.json').write_text(json.dumps(state,indent=2)+'\n',encoding='utf-8')
save();faulthandler.enable(all_threads=True)
try:
 import torch,lightning as L
 from lightning.pytorch import Trainer
 from lightning.pytorch.callbacks import Callback
 from lightning.pytorch.loggers import CSVLogger
 from piper.train.vits.dataset import VitsDataModule
 from piper.train.vits.lightning import VitsModel
 from piper_training_environment import prepare_native_data
 prepare_native_data();logging.basicConfig(level=logging.INFO)
 if not torch.cuda.is_available():raise RuntimeError('CUDA_UNAVAILABLE')
 torch.set_num_threads(4);torch.set_num_interop_threads(2);torch.backends.cuda.matmul.allow_tf32=True;torch.backends.cudnn.allow_tf32=True;L.seed_everything(20261030,workers=True)
 def deny(*a,**kw):raise RuntimeError('PILOT6_NETWORK_DISABLED')
 socket.create_connection=deny;socket.socket.connect=deny
 proof=json.loads((root/'evidence/DATASET6.json').read_text(encoding='utf-8'))
 if proof['fitRows']!=52 or proof['bookRowsUsed']!=0 or proof['controlsUsedInFit']:raise RuntimeError('WRONG_DATASET')
 phones=json.loads((dataset/'WASM_IDS.json').read_text(encoding='utf-8'))
 data=VitsDataModule(csv_path=dataset/'train.csv',audio_dir=dataset/'wav',cache_dir=dataset/'cache',config_path=dataset/'voice.onnx.json',voice_name='uyut7-pilot6',espeak_voice='ru',sample_rate=22050,num_speakers=1,batch_size=4,num_workers=0,validation_split=.08,num_test_examples=0,trim_silence=False)
 state['baseSha256']=hashlib.file_digest(base.open('rb'),'sha256').hexdigest();save()
 model=VitsModel.load_from_checkpoint(base,map_location='cpu',weights_only=False,warmstart_ckpt=None,vocoder_warmstart_ckpt=None,learning_rate=2e-5,learning_rate_d=1e-5,mos_metric=None)
 if model._warmstart_ckpt is not None or model._vocoder_warmstart_ckpt is not None:raise RuntimeError('STALE_WARMSTART')
 expected=torch.load(base,map_location='cpu',weights_only=False)['state_dict'];expected={k:v for k,v in expected.items() if k.startswith('model_g.')}
 class Progress(Callback):
  def __init__(self):self.saved=set()
  def on_train_start(self,trainer,module):
   actual=module.state_dict()
   if any(k not in actual or not torch.equal(actual[k].detach().cpu(),v) for k,v in expected.items()):raise RuntimeError('GENERATOR_RESET')
   if [o.param_groups[0]['lr'] for o in trainer.optimizers]!=[2e-5,1e-5]:raise RuntimeError('OPTIMIZER_RESET_FAILED')
   for row in phones:
    if torch.load(dataset/'cache'/(row['cacheKey']+'.phonemes.pt'),map_location='cpu',weights_only=True).tolist()!=row['ids']:raise RuntimeError('WASM_IDS_REPLACED')
   state.update(generatorKeysVerified=len(expected),phonemeRowsVerified=len(phones),actualOptimizerLearningRates=[o.param_groups[0]['lr'] for o in trainer.optimizers]);expected.clear();save()
  def on_train_batch_end(self,trainer,module,outputs,batch,batch_idx):
   step=int(trainer.global_step)
   if step%10==0 or batch_idx==0:
    losses={k:float(v.detach().cpu()) for k,v in trainer.callback_metrics.items() if hasattr(v,'numel') and v.numel()==1}
    if any(not torch.isfinite(torch.tensor(v)) for v in losses.values()):raise RuntimeError('NONFINITE_LOSS')
    state.update(status='TRAINING',globalStep=step,epoch=trainer.current_epoch,elapsedSeconds=time.monotonic()-began,losses=losses,peakGpuMiB=torch.cuda.max_memory_allocated()/1024**2);save()
    if step%100==0:print(json.dumps({'step':step,'seconds':round(state['elapsedSeconds'],1)}),flush=True)
   if step in (200,500,1000,2000) and step not in self.saved:trainer.save_checkpoint(run/f'step-{step:06d}.ckpt');self.saved.add(step)
 trainer=Trainer(accelerator='gpu',devices=1,precision='32-true',max_steps=2000,max_epochs=120,max_time='00:00:20:00',default_root_dir=run,logger=CSVLogger(run,'metrics'),callbacks=[Progress()],enable_checkpointing=False,enable_progress_bar=False,enable_model_summary=False,num_sanity_val_steps=1,limit_val_batches=2,log_every_n_steps=5,check_val_every_n_epoch=1)
 trainer.fit(model,datamodule=data);trainer.save_checkpoint(run/'last.ckpt');state.update(status='TRAINED_NOT_QUALITY_ACCEPTED',globalStep=int(trainer.global_step),elapsedSeconds=time.monotonic()-began);save()
except BaseException:state.update(status='FAIL',failure=traceback.format_exc()[-12000:],elapsedSeconds=time.monotonic()-began);save();raise
