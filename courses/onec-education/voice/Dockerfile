FROM debian:bookworm-slim@sha256:99c0b25c46d0214d5a2091092e7908907dcaecd6a962cde0ac700acee222b6f3 AS build
RUN apt-get update && apt-get install -y --no-install-recommends build-essential cmake && rm -rf /var/lib/apt/lists/*
COPY source/ /src/
RUN cmake -S /src -B /build -DCMAKE_BUILD_TYPE=Release -DGGML_NATIVE=ON -DBUILD_SHARED_LIBS=OFF -DWHISPER_BUILD_TESTS=OFF -DWHISPER_BUILD_SERVER=OFF && cmake --build /build --config Release --target whisper-cli -j4
FROM debian:bookworm-slim@sha256:99c0b25c46d0214d5a2091092e7908907dcaecd6a962cde0ac700acee222b6f3
RUN apt-get update && apt-get install -y --no-install-recommends libgomp1 && rm -rf /var/lib/apt/lists/*
COPY --from=build /build/bin/whisper-cli /opt/asr/whisper-cli
COPY --from=build /src/LICENSE /opt/asr/LICENSE
COPY run-asr.sh /opt/asr/run-asr.sh
RUN chmod 0555 /opt/asr/run-asr.sh
ENV HOME=/tmp
USER 65532:65532
WORKDIR /tmp
ENTRYPOINT ["/opt/asr/run-asr.sh"]
