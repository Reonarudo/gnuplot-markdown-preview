#!/usr/bin/env bash
# Rebuild from unmodified official source using Emscripten 6.0.9.
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
BUILD=$(mktemp -d)
trap 'rm -rf "$BUILD"' EXIT
emcc --version | head -1 | grep -F '6.0.9' >/dev/null
curl --fail --location https://downloads.sourceforge.net/project/gnuplot/gnuplot/6.0.2/gnuplot-6.0.2.tar.gz -o "$BUILD/source.tar.gz"
node -e 'const fs=require("fs"),c=require("crypto");if(c.createHash("sha256").update(fs.readFileSync(process.argv[1])).digest("hex")!=="f68a3b0bbb7bbbb437649674106d94522c00bf2f285cce0c19c3180b1ee7e738")process.exit(1)' "$BUILD/source.tar.gz"
tar xzf "$BUILD/source.tar.gz" -C "$BUILD"
cd "$BUILD/gnuplot-6.0.2"
emconfigure ./configure --disable-largefile --disable-plugins --disable-history-file \
 --disable-x11-mbfonts --disable-x11-external --disable-raise-console --disable-wxwidgets \
 --without-libcerf --without-latex --without-kpsexpand --without-x --without-x-dcop \
 --without-aquaterm --without-readline --without-lua --without-row-help \
 --without-wx-multithreaded --without-bitmap-terminals --without-tektronix \
 --without-gpic --without-tgif --without-mif --without-regis --without-cairo --without-qt
emmake make -C src -j4 gnuplot CFLAGS='-O2' \
 LDFLAGS='-O2 -g0 -sMODULARIZE=1 -sEXPORT_ES6=1 -sENVIRONMENT=web,worker -sEXPORTED_RUNTIME_METHODS=FS,callMain,HEAPU8 -sINCOMING_MODULE_JS_API=wasmBinary,noFSInit,print,printErr -sINVOKE_RUN=0 -sEXIT_RUNTIME=0 -sINITIAL_MEMORY=67108864 -sSTACK_SIZE=5242880 -sDYNAMIC_EXECUTION=0 -sASSERTIONS=0'
cp src/gnuplot "$ROOT/vendor/gnuplot/gnuplot.mjs"
cp src/gnuplot.wasm "$ROOT/vendor/gnuplot/gnuplot.wasm"
