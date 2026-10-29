"""Local Kitsune speech model. JSON on stdin/stdout; no API or downloads."""
import argparse, base64, contextlib, gc, io, json, os, socket, sys

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
args = p.parse_args()

try:
    print("LOCAL_SPEECH_STAGE_IMPORT", file=sys.stderr, flush=True)
    with contextlib.redirect_stdout(sys.stderr):
        import torch
        torch.set_num_threads(2)
        torch.set_num_interop_threads(1)
        import numpy as np
        import soundfile as sf
        from qwen_tts import Qwen3TTSModel
        print("LOCAL_SPEECH_STAGE_MODEL", file=sys.stderr, flush=True)
        if not torch.cuda.is_available():
            raise RuntimeError("LOCAL_SPEECH_CUDA_UNAVAILABLE")
        model = Qwen3TTSModel.from_pretrained(args.model_dir, device_map="cuda:0", dtype=torch.bfloat16,
                                            attn_implementation="sdpa", local_files_only=True)
        # Reject output which hit the length ceiling; never serve a silently
        # truncated recording as though the whole requested text was spoken.
        generate_codes = model.model.generate
        codec_frames = 0
        def checked_codes(*a, **kw):
            global codec_frames
            result = generate_codes(*a, **kw)
            codec_frames = max(int(c.shape[0]) for c in result[0])
            if codec_frames >= int(kw.get("max_new_tokens", 512)) - 1:
                raise RuntimeError("SPEECH_OUTPUT_LIMIT")
            return result
        model.model.generate = checked_codes
        prompt = model.create_voice_clone_prompt(ref_audio=args.reference, ref_text=args.reference_text,
                                                 x_vector_only_mode=False)
        print("LOCAL_SPEECH_STAGE_READY", file=sys.stderr, flush=True)
    print(json.dumps({"ready": True, "localOnly": True, "sampleRate": 24000}), flush=True)
except Exception:
    print(json.dumps({"ready": False, "code": "SPEECH_UNAVAILABLE"}), flush=True)
    sys.exit(1)

for line in sys.stdin:
    request = None
    try:
        request = json.loads(line)
        if set(request) != {"id", "text"} or not isinstance(request["text"], str) or not 1 <= len(request["text"]) <= 240:
            raise ValueError("SPEECH_REQUEST_INVALID")
        with contextlib.redirect_stdout(sys.stderr), torch.inference_mode():
            print("LOCAL_SPEECH_STAGE_SYNTHESIS", file=sys.stderr, flush=True)
            torch.manual_seed(1729)
            wavs, sr = model.generate_voice_clone(text=request["text"], language="Russian", voice_clone_prompt=prompt,
                                                  non_streaming_mode=True, temperature=0.65, top_p=0.85, max_new_tokens=512)
            audio = np.nan_to_num(np.asarray(wavs[0], dtype=np.float32).reshape(-1))
            duration = len(audio) / sr
            if not 0.25 <= duration <= 100 or float(np.sqrt(np.mean(audio * audio))) < 0.0005:
                raise ValueError("SPEECH_AUDIO_INVALID")
            data = io.BytesIO()
            sf.write(data, np.clip(audio, -0.98, 0.98), sr, format="WAV", subtype="PCM_16")
        print(json.dumps({"id": request["id"], "audio": base64.b64encode(data.getvalue()).decode("ascii"),
                          "duration": duration, "sampleRate": sr, "codecFrames": codec_frames}), flush=True)
        del wavs, audio, data
    except Exception:
        print(json.dumps({"id": request.get("id") if isinstance(request, dict) else None,
                          "code": "SPEECH_SYNTHESIS_FAILED"}), flush=True)
    finally:
        del request
        gc.collect()
