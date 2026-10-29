"""Bounded local pilot. Full checkpoints/metrics preserved; no automatic acceptance."""
import os,sys,json,time,traceback,faulthandler,logging,socket
from pathlib import Path
sys.stdout.reconfigure(encoding='utf-8');sys.stderr.reconfigure(encoding='utf-8');faulthandler.dump_traceback_later(120,repeat=True)
for name in ('HF_HUB_OFFLINE','TRANSFORMERS_OFFLINE','HF_HUB_DISABLE_TELEMETRY'):os.environ[name]='1'
os.environ['WANDB_MODE']='disabled';os.environ['OMP_NUM_THREADS']='4';os.environ['MKL_NUM_THREADS']='4';os.environ['PYTHONDONTWRITEBYTECODE']='1'
run=Path(sys.argv[1] if len(sys.argv)>1 else 'private/piper-uyut7-pilot-1').resolve()
if run.exists():raise RuntimeError('REFUSE_TRAINING_RUN_OVERWRITE')
run.mkdir(parents=True);state={'status':'INITIALIZING','trainingAccepted':False,'cloudCalls':0,'maxGlobalSteps':2000,'globalStepScope':'Two optimizer updates per minibatch: generator and discriminator','maxTrainingLoopMinutes':45,'base':'John public-domain checkpoint, tensor-only conversion','startedAt':time.time()};began=time.monotonic()
def save():
 (run/'PROGRESS.json').write_text(json.dumps(state,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
save()
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
 torch.set_num_threads(4);torch.set_num_interop_threads(2);torch.backends.cuda.matmul.allow_tf32=True;torch.backends.cudnn.allow_tf32=True;L.seed_everything(20261029,workers=True)
 # Training and dataset are local. Prevent accidental metric/model downloads.
 def deny_network(*a,**kw):raise RuntimeError('PILOT_NETWORK_DISABLED')
 socket.create_connection=deny_network;socket.socket.connect=deny_network
 root=Path('private/piper-uyut7-dataset').resolve();base=Path('dependencies/training-base-john/initial-weights.pt').resolve()
 if not base.is_file():raise RuntimeError('BASE_CHECKPOINT_REQUIRED')
 data=VitsDataModule(csv_path=root/'train.csv',audio_dir=root/'wav',cache_dir=root/'cache',config_path=root/'voice.onnx.json',voice_name='uyut7-pilot',espeak_voice='ru',sample_rate=22050,num_speakers=1,batch_size=4,num_workers=0,validation_split=.05,num_test_examples=0,trim_silence=False)
 model=VitsModel(sample_rate=22050,batch_size=4,num_speakers=1,num_symbols=256,warmstart_ckpt=str(base),mos_metric=None,learning_rate=1e-4,learning_rate_d=5e-5,lr_decay=.999875)
 initial=torch.load(base,map_location='cpu',weights_only=True)['state_dict'];expected=model.state_dict();generator_keys=[k for k in expected if k.startswith('model_g.')]
 matched=[k for k in generator_keys if k in initial and initial[k].shape==expected[k].shape]
 fraction=sum(expected[k].numel() for k in matched)/sum(expected[k].numel() for k in generator_keys)
 state['generatorWeightMatch']={'matchedKeys':len(matched),'totalKeys':len(generator_keys),'matchedElementFraction':fraction};save()
 if fraction<.99:raise RuntimeError('BASE_GENERATOR_ARCHITECTURE_MISMATCH')
 del initial,expected
 class Progress(Callback):
  def __init__(self):self.saved=0
  def on_train_batch_end(self,trainer,module,outputs,batch,batch_idx):
   step=int(trainer.global_step)
   if step%10==0 or batch_idx==0:
    losses={k:float(v.detach().cpu()) for k,v in trainer.callback_metrics.items() if hasattr(v,'numel') and v.numel()==1}
    if any(not torch.isfinite(torch.tensor(v)) for v in losses.values()):raise RuntimeError('NONFINITE_TRAINING_METRIC')
    state.update(status='TRAINING',globalStep=step,epoch=trainer.current_epoch,elapsedSeconds=time.monotonic()-began,losses=losses,peakGpuMiB=torch.cuda.max_memory_allocated()/1024**2);save();print(json.dumps({'step':step,'epoch':trainer.current_epoch,'seconds':round(state['elapsedSeconds'],1),'losses':losses}),flush=True)
   if step>=self.saved+500:trainer.save_checkpoint(run/f'step-{step:06d}.ckpt');self.saved=step
 trainer=Trainer(accelerator='gpu',devices=1,precision='32-true',max_steps=2000,max_epochs=100,max_time='00:00:45:00',default_root_dir=run,logger=CSVLogger(run,'metrics'),callbacks=[Progress()],enable_checkpointing=False,enable_progress_bar=False,enable_model_summary=False,num_sanity_val_steps=1,limit_val_batches=2,log_every_n_steps=5,check_val_every_n_epoch=1,deterministic=False)
 trainer.fit(model,datamodule=data);trainer.save_checkpoint(run/'last.ckpt');state.update(status='PILOT_FINISHED_NOT_ACCEPTED',globalStep=int(trainer.global_step),epoch=trainer.current_epoch,elapsedSeconds=time.monotonic()-began,checkpoint=str(run/'last.ckpt'));save()
except BaseException:
 state.update(status='FAIL',elapsedSeconds=time.monotonic()-began,failure=traceback.format_exc()[-14000:]);save();raise
finally:faulthandler.cancel_dump_traceback_later()
