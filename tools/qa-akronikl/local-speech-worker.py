"""Local Kitsune speech model. JSON on stdin/stdout; no API or downloads."""
import argparse, base64, contextlib, hashlib, io, json, os, queue, socket, sys, threading, time

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
            return result
        model.model.generate = checked_codes
        prompt = model.create_voice_clone_prompt(ref_audio=args.reference,
                                                 ref_text=None if args.speaker_only else args.reference_text,
                                                 x_vector_only_mode=args.speaker_only)
        print("LOCAL_SPEECH_STAGE_READY", file=sys.stderr, flush=True)
    print(json.dumps({"ready": True, "localOnly": True, "sampleRate": 24000, "inputEncoding": "utf-8", "protocolVersion": 2, "timings": {
        "importsMs": imports_ms, "modelLoadMs": loaded_ms - imports_ms,
        "referenceMs": (time.perf_counter() - started) * 1000 - loaded_ms,
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
            if set(command) != {"id", "text", "textSha256"} or active_id is not None:
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
        print(json.dumps({"started": request["id"]}), flush=True)
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
            if not 0.25 <= duration <= 100 or float(np.sqrt(np.mean(audio * audio))) < 0.0005:
                raise ValueError("SPEECH_AUDIO_INVALID")
            data = io.BytesIO()
            sf.write(data, np.clip(audio, -0.98, 0.98), sr, format="WAV", subtype="PCM_16")
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
