"""Read the pinned author checkpoint once and retain only tensor weights."""
import sys,pathlib,json,hashlib
from pathlib import Path
import torch
sys.stdout.reconfigure(encoding='utf-8')
root=Path('dependencies/training-base-john');source=root/'base.ckpt';target=root/'initial-weights.pt'
if target.exists():raise RuntimeError('REFUSE_CONVERTED_CHECKPOINT_OVERWRITE')
original=pathlib.PosixPath
try:
 pathlib.PosixPath=pathlib.PurePosixPath
 checkpoint=torch.load(source,map_location='cpu',weights_only=False)
finally:pathlib.PosixPath=original
weights=checkpoint['state_dict']
if not weights or not all(isinstance(k,str) and isinstance(v,torch.Tensor) for k,v in weights.items()):raise RuntimeError('UNEXPECTED_STATE_DICT')
torch.save({'state_dict':weights},target)
parameters=checkpoint.get('hyper_parameters',{})
fields=['sample_rate','inter_channels','hidden_channels','filter_channels','n_heads','n_layers','n_layers_q','resblock','resblock_kernel_sizes','resblock_dilation_sizes','upsample_rates','upsample_initial_channel','upsample_kernel_sizes','gin_channels','num_symbols','num_speakers','use_sdp']
safe={k:parameters[k] for k in fields if k in parameters}
proof={'status':'TENSOR_ONLY_BASE_CONVERTED','sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'convertedSha256':hashlib.sha256(target.read_bytes()).hexdigest(),'bytes':target.stat().st_size,'tensorKeys':len(weights),'tensorElements':sum(v.numel() for v in weights.values()),'architecture':safe,'sourceModified':False,'optimizerStateTransferred':False}
Path('evidence/TRAIN_BASE_CONVERSION.json').write_text(json.dumps(proof,indent=2)+'\n',encoding='utf-8');print(json.dumps(proof),flush=True)
