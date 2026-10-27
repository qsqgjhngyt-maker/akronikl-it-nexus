# Только изолированная feature-сборка; image не публикуется этим Dockerfile.
ARG EMSDK_IMAGE=emscripten/emsdk:3.1.56@sha256:f9479effb0d095fea1c8501b57c18d13876a5e3bfebcb71f0da68a0fe49c935f
FROM ${EMSDK_IMAGE}
RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends python3-pip cmake ninja-build g++ libgl1 libglib2.0-0 libfontconfig1 libdbus-1-3 && rm -rf /var/lib/apt/lists/*
RUN python3 -m pip install --no-cache-dir aqtinstall==3.3.0
RUN python3 -m aqt install-qt linux desktop 6.8.3 linux_gcc_64 --archives qtbase icu -O /opt/qt && python3 -m aqt install-qt all_os wasm 6.8.3 wasm_singlethread --archives qtbase -O /opt/qt
ENV QT_HOST_PATH=/opt/qt/6.8.3/gcc_64
ENV CMAKE_PREFIX_PATH=/opt/qt/6.8.3/wasm_singlethread
ENV LD_LIBRARY_PATH=/opt/qt/6.8.3/gcc_64/lib
WORKDIR /work
