#!/bin/sh
# SPDX-License-Identifier: GPL-3.0-only
# Выполняется внутри pinned SDK container, network=none, source mount readonly.
set -eu
mkdir /work/source /work/qt-build /work/qt-sdk
tar --no-same-owner -xJf /input/qtbase-everywhere-src-6.8.3.tar.xz -C /work/source --strip-components=1
emcmake cmake -S /work/source -B /work/qt-build -G Ninja \
 -DCMAKE_BUILD_TYPE=Release -DCMAKE_INSTALL_PREFIX=/work/qt-sdk \
 -DQT_HOST_PATH=/opt/qt/6.8.3/gcc_64 \
 -DQT_BUILD_EXAMPLES=OFF -DQT_BUILD_TESTS=OFF \
 -DBUILD_SHARED_LIBS=OFF -DQT_FEATURE_thread=OFF
cmake --build /work/qt-build --parallel 2
cmake --install /work/qt-build
cp /work/qt-build/CMakeCache.txt /output/CMakeCache.txt
cp /work/qt-build/config.summary /output/config.summary
tar -cJf /output/rebuilt-qt-6.8.3-sdk.tar.xz -C /work/qt-sdk .
printf 'QT_SOURCE_REBUILD_PASS\n'
