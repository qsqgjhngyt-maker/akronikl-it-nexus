"""Local Kitsune speech model. JSON on stdin/stdout; no API or downloads."""
import argparse, base64, contextlib, hashlib, io, json, os, queue, socket, sys, threading, time, importlib.util
from pathlib import Path

# Redirected Windows stdin defaults to cp1251. Never let the transport change text.
sys.stdin.reconfigure(encoding="utf-8", errors="strict")
sys.stdout.reconfigure(encoding="utf-8", errors="strict")
started = time.perf_counter()

for name in ("HF_HUB_OFFLINE", "TRANSFORMERS_OFFLINE", "HF_DATASETS_OFFLINE", "HF_HUB_DISABLE_TELEMETRY"):
    os.environ[name] = "1"
os.environ["TOKENIZERS_PARALLELISM"] = "false"

def deny_network(*args, **kwargs):
    raise RuntimeError("LOCAL_SPEECH_NETWORK_DISABLED")

socket.create_connection = deny_network
socket.socket.connect = deny_network
p = argparse.ArgumentParser()
p.add_argument("--model-dir", required=True)
p.add_argument("--reference", required=True)
p.add_argument("--reference-text", required=True)
p.add_argument("--speaker-only", action="store_true")
p.add_argument("--greedy-codes", action="store_true")
args = p.parse_args()

cancelled = threading.Event()
stream_audio = False
frames = []
class SpeechCancelled(Exception):
    pass

try:
    print("LOCAL_SPEECH_STAGE_IMPORT", file=sys.stderr, flush=True)
    with contextlib.redirect_stdout(sys.stderr):
        import torch
        torch.set_num_threads(2)
        torch.set_num_interop_threads(1)
        import numpy as np
        import soundfile as sf
        from qwen_tts import Qwen3TTSModel
        from transformers import StoppingCriteria, StoppingCriteriaList
        imports_ms = (time.perf_counter() - started) * 1000
        print("LOCAL_SPEECH_STAGE_MODEL", file=sys.stderr, flush=True)
        if not torch.cuda.is_available():
            raise RuntimeError("LOCAL_SPEECH_CUDA_UNAVAILABLE")
        model = Qwen3TTSModel.from_pretrained(args.model_dir, device_map="cuda:0", dtype=torch.bfloat16,
                                            attn_implementation="sdpa", local_files_only=True)
        loaded_ms = (time.perf_counter() - started) * 1000
        class CancelGeneration(StoppingCriteria):
            def __call__(self, input_ids, scores, **kwargs):
                return cancelled.is_set()
        talker_generate = model.model.talker.generate
        def interruptible_talker(*a, **kw):
            kw["stopping_criteria"] = StoppingCriteriaList([*(kw.get("stopping_criteria") or []), CancelGeneration()])
            return talker_generate(*a, **kw)
        model.model.talker.generate = interruptible_talker
        # Reject output which hit the length ceiling; never serve a silently
        # truncated recording as though the whole requested text was spoken.
        generate_codes = model.model.generate
        codec_frames = 0
        code_generation_ms = 0
        def checked_codes(*a, **kw):
            global codec_frames, code_generation_ms
            code_started = time.perf_counter()
            try:
                result = generate_codes(*a, **kw)
            except Exception:
                # The SDK can stack an empty codec list when cancellation stops
                # the initial prefill. This is an acknowledged cancellation,
                # never an incomplete waveform or a reason to reload weights.
                if cancelled.is_set():
                    raise SpeechCancelled() from None
                raise
            code_generation_ms = (time.perf_counter() - code_started) * 1000
            if cancelled.is_set():
                raise SpeechCancelled()
            codec_frames = max(int(c.shape[0]) for c in result[0])
            if codec_frames >= int(kw.get("max_new_tokens", 512)) - 1:
                raise RuntimeError("SPEECH_OUTPUT_LIMIT")
            if stream_audio and (not frames or not torch.equal(torch.stack(frames, dim=1)[0], result[0][0])):
                raise RuntimeError('SPEECH_STREAM_FRAMES_DIFFER')
            return result
        model.model.generate = checked_codes
        prompt = model.create_voice_clone_prompt(ref_audio=args.reference,
                                                 ref_text=None if args.speaker_only else args.reference_text,
                                                 x_vector_only_mode=args.speaker_only)
        reference_ready_ms = (time.perf_counter() - started) * 1000
        accelerator = None
        if args.greedy_codes:
            try:
                spec = importlib.util.spec_from_file_location('akronikl_qwen_greedy', Path(__file__).with_name('qwen-greedy-predictor.py'))
                helper = importlib.util.module_from_spec(spec)
                spec.loader.exec_module(helper)
                accelerator = helper.GreedyCodePredictor(model.model.talker.code_predictor, torch)
                # Build off the request path. This generates no user audio and changes no weights.
                with torch.inference_mode():
                    accelerator.build(torch.zeros((1, 2, model.model.talker.config.hidden_size), device='cuda:0', dtype=torch.bfloat16))
                model.model.talker.code_predictor.generate = accelerator
            except Exception as error:
                print('LOCAL_SPEECH_GRAPH_UNAVAILABLE ' + str(type(error).__name__), file=sys.stderr, flush=True)
                accelerator = None
        graph_ready_ms = (time.perf_counter() - started) * 1000
        if accelerator is not None:
            # Genuine private warmup also validates the first eight real predictor calls.
            # This WAV is never returned as an answer to a user's request.
            with torch.inference_mode():
                torch.manual_seed(1729)
                warm_wavs, _ = model.generate_voice_clone(text='Готово.', language='Russian', voice_clone_prompt=prompt,
                    non_streaming_mode=True, temperature=.65, top_p=.85, max_new_tokens=64, subtalker_dosample=False)
                del warm_wavs
        accelerator_ready = accelerator is not None and accelerator.stats['failure'] is None and accelerator.stats['verified'] >= accelerator.verify_calls
        print("LOCAL_SPEECH_STAGE_READY", file=sys.stderr, flush=True)
    print(json.dumps({"ready": True, "localOnly": True, "sampleRate": 24000, "inputEncoding": "utf-8", "protocolVersion": 2,
        "streaming": args.speaker_only and accelerator_ready, "accelerated": accelerator_ready,
        "optimizer": {k: accelerator.stats[k] for k in ('verified', 'mismatches', 'fallbacks')} if accelerator is not None else None, "timings": {
        "importsMs": imports_ms, "modelLoadMs": loaded_ms - imports_ms,
        "referenceMs": reference_ready_ms - loaded_ms, "graphSetupMs": graph_ready_ms - reference_ready_ms,
        "prewarmMs": (time.perf_counter() - started) * 1000 - graph_ready_ms,
        "totalMs": (time.perf_counter() - started) * 1000}}), flush=True)
except Exception:
    print(json.dumps({"ready": False, "code": "SPEECH_UNAVAILABLE"}), flush=True)
    sys.exit(1)

jobs = queue.Queue(maxsize=1)
active_id = None
def emit_result(value):
    global active_id
    active_id = None
    print(json.dumps(value), flush=True)
def read_commands():
    global active_id
    try:
        for line in sys.stdin:
            command = json.loads(line)
            if set(command) == {"cancel"}:
                if command["cancel"] == active_id:
                    cancelled.set()
                continue
            if set(command) not in ({"id", "text", "textSha256"}, {"id", "text", "textSha256", "stream"}) or ('stream' in command and command['stream'] is not True) or active_id is not None:
                continue
            active_id = command["id"]
            cancelled.clear()
            jobs.put(command)
    finally:
        cancelled.set()
        jobs.put(None)
threading.Thread(target=read_commands, daemon=True).start()

while True:
    request = jobs.get()
    if request is None:
        break
    try:
        if not isinstance(request["text"], str) or not 1 <= len(request["text"]) <= 240:
            raise ValueError("SPEECH_REQUEST_INVALID")
        text_hash = hashlib.sha256(request["text"].encode("utf-8")).hexdigest()
        if text_hash != request["textSha256"]:
            raise ValueError("SPEECH_TEXT_ENCODING_INVALID")
        if cancelled.is_set():
            raise SpeechCancelled()
        synthesis_started = time.perf_counter()
        frames, emitted_samples, packet_sequence = [], 0, 0
        stream_audio = request.get('stream') is True
        if stream_audio and not args.speaker_only:
            raise ValueError('SPEECH_STREAM_UNAVAILABLE')
        def emit_chunk(audio, sample_rate):
            global emitted_samples, packet_sequence
            if cancelled.is_set():
                raise SpeechCancelled()
            if len(audio) <= emitted_samples:
                return
            part = np.asarray(audio[emitted_samples:], dtype=np.float32)
            data = io.BytesIO()
            sf.write(data, np.clip(part, -.98, .98), sample_rate, format='WAV', subtype='PCM_16')
            # stdout is redirected during model calls. Protocol packets always use the real pipe.
            packet = {'id': request['id'], 'chunk': True, 'seq': packet_sequence, 'offsetSamples': emitted_samples,
                      'samples': len(part), 'sampleRate': sample_rate, 'textSha256': text_hash,
                      'audio': base64.b64encode(data.getvalue()).decode('ascii'),
                      'availableMs': (time.perf_counter() - synthesis_started) * 1000}
            if cancelled.is_set():
                raise SpeechCancelled()
            print(json.dumps(packet), file=sys.__stdout__, flush=True)
            emitted_samples += len(part)
            packet_sequence += 1
        def stream_hook(module, inputs, output):
            if cancelled.is_set():
                raise SpeechCancelled()
            codes = output.hidden_states[-1]
            if codes is None:
                return
            if codes.shape != (1, 16):
                raise ValueError('SPEECH_CODEC_SHAPE_CHANGED')
            if int(codes[0, 0]) == model.model.talker.config.codec_eos_token_id:
                return
            frames.append(codes.detach().clone())
            if len(frames) % 12 == 0:
                prefix = torch.stack(frames, dim=1)[0]
                wavs_prefix, prefix_sr = model.model.speech_tokenizer.decode([{'audio_codes': prefix}])
                emit_chunk(np.asarray(wavs_prefix[0], dtype=np.float32), prefix_sr)
        hook = model.model.talker.register_forward_hook(stream_hook) if stream_audio else None
        print(json.dumps({"started": request["id"]}), flush=True)
        try:
            with contextlib.redirect_stdout(sys.stderr), torch.inference_mode():
                print("LOCAL_SPEECH_STAGE_SYNTHESIS", file=sys.stderr, flush=True)
                torch.manual_seed(1729)
                wavs, sr = model.generate_voice_clone(text=request["text"], language="Russian", voice_clone_prompt=prompt,
                                                      non_streaming_mode=True, temperature=0.65, top_p=0.85, max_new_tokens=512,
                                                      subtalker_dosample=not args.greedy_codes)
                if cancelled.is_set():
                    raise SpeechCancelled()
                audio = np.nan_to_num(np.asarray(wavs[0], dtype=np.float32).reshape(-1))
                duration = len(audio) / sr
                if not 0.25 <= duration <= 100 or float(np.sqrt(np.mean(audio * audio))) < 0.0005 or emitted_samples > len(audio):
                    raise ValueError("SPEECH_AUDIO_INVALID")
                if stream_audio:
                    emit_chunk(audio, sr)
                data = io.BytesIO()
                sf.write(data, np.clip(audio, -0.98, 0.98), sr, format="WAV", subtype="PCM_16")
        finally:
            if hook is not None:
                hook.remove()
        emit_result({"id": request["id"], "audio": base64.b64encode(data.getvalue()).decode("ascii"),
                          "duration": duration, "sampleRate": sr, "codecFrames": codec_frames,
                          "textSha256": text_hash, "timings": {"synthesisMs": (time.perf_counter() - synthesis_started) * 1000,
                          "codeGenerationMs": code_generation_ms}})
        del wavs, audio, data
    except SpeechCancelled:
        emit_result({"id": request["id"], "code": "SPEECH_CANCELLED"})
    except Exception:
        emit_result({"id": request.get("id") if isinstance(request, dict) else None,
                          "code": "SPEECH_CANCELLED" if cancelled.is_set() else "SPEECH_SYNTHESIS_FAILED"})
    finally:
        del request
