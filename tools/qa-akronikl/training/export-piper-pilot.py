"""Export an actual pilot checkpoint with Torch's compatible legacy ONNX exporter."""
import sys,json,hashlib,time,shutil
from pathlib import Path
import torch
from piper.train.vits.lightning import VitsModel
checkpoint=Path(sys.argv[1]).resolve();output=Path(sys.argv[2]).resolve()
if output.exists():raise RuntimeError('REFUSE_EXPORT_OVERWRITE')
output.parent.mkdir(parents=True,exist_ok=True);at=time.perf_counter()
model=VitsModel.load_from_checkpoint(checkpoint,map_location='cpu',weights_only=False);generator=model.model_g.eval()
with torch.no_grad():generator.dec.remove_weight_norm()
def forward(text,lengths,scales):
 return generator.infer(text,lengths,noise_scale=scales[0],length_scale=scales[1],noise_scale_w=scales[2])[0].unsqueeze(1)
generator.forward=forward
torch.manual_seed(1234);inputs=(torch.randint(0,generator.n_vocab,(1,50),dtype=torch.long),torch.LongTensor([50]),torch.FloatTensor([.667,1,.8]))
torch.onnx.export(generator,inputs,str(output),opset_version=15,input_names=['input','input_lengths','scales'],output_names=['output'],dynamic_axes={'input':{0:'batch_size',1:'phonemes'},'input_lengths':{0:'batch_size'},'output':{0:'batch_size',2:'time'}},dynamo=False)
config=Path(sys.argv[3] if len(sys.argv)>3 else 'private/piper-uyut7-dataset/voice.onnx.json');shutil.copyfile(config,Path(str(output)+'.json'))
proof={'status':'EXPORTED_NOT_QUALITY_ACCEPTED','checkpoint':str(checkpoint),'output':str(output),'onnxSha256':hashlib.sha256(output.read_bytes()).hexdigest(),'configSha256':hashlib.sha256(Path(str(output)+'.json').read_bytes()).hexdigest(),'bytes':output.stat().st_size,'exportSeconds':time.perf_counter()-at,'sampleRate':22050}
Path(str(output)+'.PROOF.json').write_text(json.dumps(proof,indent=2)+'\n',encoding='utf-8');print(json.dumps(proof),flush=True)
