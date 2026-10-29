"""Hash-check the official Russian checkpoint and make a tensor-only local copy."""
import sys,pathlib,json,hashlib
from pathlib import Path
import torch
sys.stdout.reconfigure(encoding='utf-8')
root=Path('dependencies/training-base-dmitri');source=root/'base.ckpt';target=root/'initial-weights.pt'
if target.exists():raise RuntimeError('REFUSE_CONVERTED_CHECKPOINT_OVERWRITE')
expected='744a4824dcb149cda87248ec38bd9f92dad93f842ab1da51deeb27a074e47ba6'
actual=hashlib.file_digest(source.open('rb'),'sha256').hexdigest()
if actual!=expected:raise RuntimeError('BASE_SOURCE_HASH_MISMATCH')
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
proof={'status':'TENSOR_ONLY_RUSSIAN_BASE_CONVERTED','voice':'dmitri','sourceSha256':actual,'convertedSha256':hashlib.file_digest(target.open('rb'),'sha256').hexdigest(),'bytes':target.stat().st_size,'tensorKeys':len(weights),'tensorElements':sum(v.numel() for v in weights.values()),'architecture':{k:parameters[k] for k in fields if k in parameters},'sourceModified':False,'optimizerStateTransferred':False}
Path('evidence/TRAIN_BASE_DMITRI_CONVERSION.json').write_text(json.dumps(proof,indent=2)+'\n',encoding='utf-8');print(json.dumps(proof),flush=True)
