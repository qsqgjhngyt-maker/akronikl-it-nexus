#!/bin/sh
set -eu
export HOME=/work
export EM_CACHE=/work/.emscripten_cache
cp -a --no-preserve=ownership /emsdk/upstream/emscripten/cache "$EM_CACHE"
archive=/opt/qt/6.8.3/wasm_singlethread/plugins/platforms/libqwasm.a
object=qwasmbackingstore.cpp.o
ar=/emsdk/upstream/bin/llvm-ar
mkdir /work/source /work/build
tar --no-same-owner -xJf /input/qtbase-everywhere-src-6.8.3.tar.xz -C /work/source --strip-components=1
patch --batch --fuzz=0 -d /work/source -p1 < /build-input/qt-empty-backing-store.patch
emcmake cmake -S /work/source -B /work/build -G Ninja \
 -DCMAKE_BUILD_TYPE=Release -DCMAKE_INSTALL_PREFIX=/work/qt-sdk \
 -DQT_HOST_PATH=/opt/qt/6.8.3/gcc_64 -DQT_BUILD_EXAMPLES=OFF \
 -DQT_BUILD_TESTS=OFF -DBUILD_SHARED_LIBS=OFF -DQT_FEATURE_thread=OFF
target=$(ninja -C /work/build -t targets all | awk -v object="$object" 'index($1, "/" object ":") {sub(/:$/, "", $1); print $1}')
test -n "$target"
printf 'Rebuilding Qt object %s\n' "$target"
ninja -C /work/build -j4 "$target"
cp "$archive" /output/libqwasm.a
"$ar" t "$archive" > /work/members-before
test "$(grep -cx "$object" /work/members-before)" -eq 1
"$ar" r /output/libqwasm.a "/work/build/$target"
"$ar" t /output/libqwasm.a > /work/members-after
cmp /work/members-before /work/members-after
"$ar" p /output/libqwasm.a "$object" > /output/"$object"
cmp /output/"$object" "/work/build/$target"
cp /work/build/config.summary /output/config.summary
sha256sum "$archive" /output/libqwasm.a /output/"$object"
