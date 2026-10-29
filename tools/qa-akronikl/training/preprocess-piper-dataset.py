import os,sys,time,json,faulthandler
from pathlib import Path
sys.stdout.reconfigure(encoding='utf-8');sys.stderr.reconfigure(encoding='utf-8');faulthandler.dump_traceback_later(60,repeat=True)
os.environ['HF_HUB_OFFLINE']='1';os.environ['PYTHONDONTWRITEBYTECODE']='1'
from piper.train.vits.dataset import VitsDataModule
from piper_training_environment import prepare_native_data
prepare_native_data()
root=Path('private/piper-uyut7-dataset').resolve();at=time.perf_counter()
data=VitsDataModule(csv_path=root/'train.csv',audio_dir=root/'wav',cache_dir=root/'cache',config_path=root/'voice.onnx.json',voice_name='uyut7-pilot',espeak_voice='ru',sample_rate=22050,num_speakers=1,batch_size=4,num_workers=0,validation_split=.05,num_test_examples=0,trim_silence=False)
data.prepare_data();data.setup('fit')
proof={'status':'PREPROCESSED_NOT_TRAINED','trainItems':len(data.train_dataset),'internalValidationItems':len(data.val_dataset),'externalHoldoutItems':21,'cacheFiles':len(list((root/'cache').glob('*'))),'wallMs':(time.perf_counter()-at)*1000,'apiCalls':0}
Path('evidence/TRAIN_PREPROCESS.json').write_text(json.dumps(proof,indent=2)+'\n',encoding='utf-8');print(json.dumps(proof),flush=True);faulthandler.cancel_dump_traceback_later()
