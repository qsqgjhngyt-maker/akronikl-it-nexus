"""Separate graph experiment. Never replaces original weights or accepts voice quality."""
import sys,json,hashlib,time,copy
from pathlib import Path
import numpy as np,onnx,onnxsim,onnxruntime as ort
sys.stdout.reconfigure(encoding='utf-8')
source=Path(sys.argv[1]);output=Path(sys.argv[2]);proof=Path(sys.argv[3])
if output.exists() or proof.exists():raise RuntimeError('REFUSE_OPTIMIZATION_OVERWRITE')
output.parent.mkdir(parents=True,exist_ok=True);at=time.perf_counter();model=onnx.load(source)
optimized,valid=onnxsim.simplify(model,check_n=0)
if not valid:raise RuntimeError('SIMPLIFICATION_GRAPH_CHECK_FAILED')
onnx.checker.check_model(optimized);onnx.save(optimized,output)
options=ort.SessionOptions();options.intra_op_num_threads=2;options.inter_op_num_threads=1
rows=json.loads(Path('private/piper4-wasm-phonemes.json').read_text(encoding='utf-8'))
samples=[min(rows,key=lambda r:len(r['ids'])),sorted(rows,key=lambda r:len(r['ids']))[len(rows)//2],max(rows,key=lambda r:len(r['ids']))]
checks=[]
for noise in (0.0,.667):
 # Identical explicit random seeds apply only to validation clones, not shipped models.
 clones=[copy.deepcopy(m) for m in (model,optimized)]
 for m in clones:
  number=0
  for node in m.graph.node:
   if node.op_type=='RandomNormalLike':
    number+=1;node.attribute.extend([onnx.helper.make_attribute('seed',float(1234+number))])
 sessions=[ort.InferenceSession(m.SerializeToString(),options,providers=['CPUExecutionProvider']) for m in clones]
 for row in samples:
  ids=np.array([row['ids']],dtype=np.int64);feed={'input':ids,'input_lengths':np.array([ids.shape[1]],dtype=np.int64),'scales':np.array([noise,1.0,.8 if noise else 0.0],dtype=np.float32)}
  values=[];times=[]
  for session in sessions:
   began=time.perf_counter();values.append(session.run(None,feed)[0]);times.append(time.perf_counter()-began)
  same_shape=values[0].shape==values[1].shape
  delta=float(np.max(np.abs(values[0]-values[1]))) if same_shape else None
  close=same_shape and bool(np.allclose(values[0],values[1],atol=1e-4,rtol=1e-3))
  checks.append({'inputIds':ids.shape[1],'textSha256':hashlib.sha256(row['text'].encode()).hexdigest(),'noise':noise,'sameShape':same_shape,'maxAbsDelta':delta,'allclose':close,'cpuSeconds':times})
  if not close:raise RuntimeError('GRAPH_AUDIO_EQUIVALENCE_FAILED_'+str(checks[-1]))
report={'status':'GRAPH_NUMERIC_EQUIVALENCE_PASS_NOT_VOICE_ACCEPTANCE','sourceSha256':hashlib.file_digest(source.open('rb'),'sha256').hexdigest(),'outputSha256':hashlib.file_digest(output.open('rb'),'sha256').hexdigest(),'nodesBefore':len(model.graph.node),'nodesAfter':len(optimized.graph.node),'quantization':False,'onnxsimVersion':onnxsim.__version__,'externalModelCalls':0,'gpuInference':False,'originalModified':False,'validationChecks':checks,'elapsedSeconds':time.perf_counter()-at}
proof.write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8');print(json.dumps(report),flush=True)
