#!/bin/sh
# Фиксированный CLI: host передаёт только проверенные аргументы и WAV.
/opt/asr/whisper-cli "$@" -otxt -of /tmp/transcript >/tmp/engine.stdout 2>/tmp/engine.stderr
result=$?
if [ "$result" -ne 0 ]; then
  head -c 4096 /tmp/engine.stderr >&2
  exit "$result"
fi
cat /tmp/transcript.txt
