"""Export an actual pilot checkpoint with Torch's compatible legacy ONNX exporter."""
import sys,json,hashlib,time,shutil,os
from pathlib import Path
if len(sys.argv)<3:raise SystemExit('Usage: export-piper-pace.py checkpoint new-output.onnx config.json')
output=Path(sys.argv[2]).resolve()
os.environ.setdefault('NUMBA_CACHE_DIR',str(output.parent/'numba-cache'))
os.environ.setdefault('PYTHONDONTWRITEBYTECODE','1')
import faulthandler
faulthandler.dump_traceback_later(90, repeat=True)
print("IMPORT_TORCH", flush=True)
import torch
print("IMPORT_VITS", flush=True)
from piper.train.vits.lightning import VitsModel
print("IMPORTS_READY", flush=True)
torch.set_num_threads(4)
torch.set_num_interop_threads(2)
checkpoint=Path(sys.argv[1]).resolve();output=Path(sys.argv[2]).resolve()
if output.exists():raise RuntimeError('REFUSE_EXPORT_OVERWRITE')
output.parent.mkdir(parents=True,exist_ok=True);at=time.perf_counter()
print('LOAD_CHECKPOINT', flush=True)
model=VitsModel.load_from_checkpoint(checkpoint,map_location='cpu',weights_only=False,mos_metric=None,warmstart_ckpt=None,vocoder_warmstart_ckpt=None)
print('CHECKPOINT_READY', flush=True);generator=model.model_g.eval()
with torch.no_grad():generator.dec.remove_weight_norm()
def forward(text,lengths,scales,phoneme_pace):
 return generator.infer(text,lengths,noise_scale=scales[0],length_scale=scales[1]*phoneme_pace,noise_scale_w=scales[2])[0].unsqueeze(1)
generator.forward=forward
torch.manual_seed(1234);inputs=(torch.randint(0,generator.n_vocab,(1,50),dtype=torch.long),torch.LongTensor([50]),torch.FloatTensor([.667,1,.8]),torch.ones(1,1,50))
print('EXPORT_ONNX', flush=True)
torch.onnx.export(generator,inputs,str(output),opset_version=15,input_names=['input','input_lengths','scales','phoneme_pace'],output_names=['output'],dynamic_axes={'input':{0:'batch_size',1:'phonemes'},'input_lengths':{0:'batch_size'},'output':{0:'batch_size',2:'time'},'phoneme_pace':{0:'batch_size',2:'phonemes'}},dynamo=False)
config=Path(sys.argv[3] if len(sys.argv)>3 else 'private/piper-uyut7-dataset/voice.onnx.json');shutil.copyfile(config,Path(str(output)+'.json'))
proof={'status':'EXPORTED_NOT_QUALITY_ACCEPTED','checkpoint':str(checkpoint),'output':str(output),'onnxSha256':hashlib.sha256(output.read_bytes()).hexdigest(),'configSha256':hashlib.sha256(Path(str(output)+'.json').read_bytes()).hexdigest(),'bytes':output.stat().st_size,'exportSeconds':time.perf_counter()-at,'sampleRate':22050}
Path(str(output)+'.PROOF.json').write_text(json.dumps(proof,indent=2)+'\n',encoding='utf-8');print(json.dumps(proof),flush=True)
