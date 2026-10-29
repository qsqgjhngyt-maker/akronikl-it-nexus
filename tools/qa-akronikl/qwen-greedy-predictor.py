"""Instance-local, bounded CUDA graph for the existing greedy residual codebooks.

No weights, sampling settings, installed packages or global model classes change.
Unsupported generation requests retain the original Transformers implementation.
"""
from types import SimpleNamespace
import time, hashlib, inspect, copy
from pathlib import Path


class GreedyCodePredictor:
    def __init__(self, module, torch, verify_calls=8):
        self.module, self.torch, self.original = module, torch, module.generate
        self.verify_calls = verify_calls
        self.graph = self.inputs = self.output = None
        self.stats = {"calls": 0, "accelerated": 0, "verified": 0, "mismatches": 0,
                      "fallbacks": 0, "buildMs": None, "failure": None}
        self.groups = len(module.lm_head)
        source = inspect.getsourcefile(type(module))
        if not source or hashlib.sha256(Path(source).read_bytes()).hexdigest() != '25c42656bcf810f06ef6bc1839bd7083f3c8cfedac3a147c4060b4262b1c96a0':
            raise RuntimeError('UNREVIEWED_QWEN_SDK')
        config = module.generation_config
        if (self.groups != 15 or config.eos_token_id is not None
                or config.num_beams != 1 or config.repetition_penalty != 1.0
                or config.no_repeat_ngram_size or config.bad_words_ids
                or config.forced_bos_token_id is not None or config.forced_eos_token_id is not None
                or config.suppress_tokens or config.begin_suppress_tokens):
            raise RuntimeError("UNSUPPORTED_PREDICTOR_GENERATION_CONFIG")
        self.config_snapshot = copy.deepcopy({k: v for k, v in config.to_dict().items() if not k.startswith('_')})

    def loop(self, inputs):
        cache, token, tokens = None, None, []
        for step in range(self.groups):
            result = self.module.forward(
                inputs_embeds=inputs if step == 0 else None,
                input_ids=token if step else None,
                past_key_values=cache, generation_steps=step,
                use_cache=True, output_hidden_states=False, return_dict=True)
            token = result.logits[:, -1:, :].argmax(dim=-1)
            cache = result.past_key_values
            tokens.append(token)
        return self.torch.cat(tokens, dim=1)

    def build(self, inputs):
        torch = self.torch
        started = time.perf_counter()
        self.inputs = torch.empty_like(inputs)
        self.inputs.copy_(inputs)
        stream = torch.cuda.Stream()
        stream.wait_stream(torch.cuda.current_stream())
        with torch.cuda.stream(stream):
            for _ in range(3):
                self.loop(self.inputs)
        torch.cuda.current_stream().wait_stream(stream)
        torch.cuda.synchronize()
        graph = torch.cuda.CUDAGraph()
        with torch.cuda.graph(graph):
            output = self.loop(self.inputs)
        self.graph, self.output = graph, output
        self.stats["buildMs"] = (time.perf_counter() - started) * 1000

    def __call__(self, *args, **kwargs):
        self.stats["calls"] += 1
        inputs = kwargs.get("inputs_embeds")
        allowed = {"inputs_embeds", "max_new_tokens", "do_sample", "top_p", "top_k", "temperature",
                   "output_hidden_states", "return_dict_in_generate"}
        supported = (not args and set(kwargs) <= allowed and inputs is not None
                     and inputs.is_cuda and inputs.shape[:2] == (1, 2)
                     and kwargs.get("max_new_tokens") == self.groups
                     and kwargs.get("do_sample") is False
                     and kwargs.get("return_dict_in_generate") is True
                     and {k: v for k, v in self.module.generation_config.to_dict().items() if not k.startswith('_')} == self.config_snapshot)
        if self.inputs is not None and (inputs is None or inputs.shape != self.inputs.shape or inputs.dtype != self.inputs.dtype or inputs.device != self.inputs.device):
            supported = False
        if not supported or self.stats["failure"]:
            self.stats["fallbacks"] += 1
            return self.original(*args, **kwargs)
        if self.graph is None:
            self.build(inputs)
        self.inputs.copy_(inputs)
        self.graph.replay()
        sequences = self.output.clone()
        if self.stats["verified"] < self.verify_calls:
            reference = self.original(*args, **kwargs)
            if not self.torch.equal(sequences, reference.sequences):
                self.stats["mismatches"] += 1
                self.stats["failure"] = "GREEDY_CODES_DIFFER"
                self.stats["fallbacks"] += 1
                return reference
            self.stats["verified"] += 1
        self.stats["accelerated"] += 1
        return SimpleNamespace(sequences=sequences)
