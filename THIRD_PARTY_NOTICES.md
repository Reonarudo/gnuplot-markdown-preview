# Third-party notices and binary provenance

The extension's original TypeScript, tests, build scripts, and artwork are MIT licensed (see LICENSE). This does not relicense bundled software.

## Gnuplot 6.0.2

Copyright 1986–1993, 1998, 2004 Thomas Williams, Colin Kelley, with additional contributors identified in `vendor/gnuplot/SOURCE-NOTICES.txt`.

The bundled runtime was compiled from the **unmodified official gnuplot 6.0.2 release**, downloaded from:
https://sourceforge.net/projects/gnuplot/files/gnuplot/6.0.2/gnuplot-6.0.2.tar.gz/download

Source archive SHA-256: `f68a3b0bbb7bbbb437649674106d94522c00bf2f285cce0c19c3180b1ee7e738`.

Full gnuplot redistribution terms are included in `vendor/gnuplot/Copyright`; retain that file and this document with redistributions. Gnuplot is under its own license, not MIT or GPL. Component notices, including BSD-licensed numerical code, are retained in `vendor/gnuplot/SOURCE-NOTICES.txt`.

No gnuplot source changes or patches were applied. Configuration and linker flags select a browser/worker-only Emscripten adapter, disable dynamic execution and optional native dependencies, and set fixed linear memory. Thus the license's additional conditions for binaries compiled from **modified source** do not apply to this build. The extension-specific filesystem and rendering policy lives in our separate TypeScript wrapper.

Build: `scripts/build-wasm.sh`, with Emscripten 6.0.9 (the audited Homebrew toolchain reports `6.0.9-git`). See `docs/licensing-audit.md` and `vendor/gnuplot/SHA256SUMS` for the exact artifacts. Release builds copy the audited vendor artifacts, rather than silently fetching or rebuilding a different compiler/runtime.

Upstream contacts: https://www.gnuplot.info/ and gnuplot-info@lists.sourceforge.net. Extension integration support: Reonarudo, https://github.com/Reonarudo/gnuplot-markdown-preview/issues.

## Emscripten and standard libraries

The generated JavaScript adapter and linked runtime contain Emscripten code (MIT / University of Illinois/NCSA; `vendor/gnuplot/EMSCRIPTEN-LICENSE`), musl libc (`vendor/gnuplot/MUSL-COPYRIGHT`), and LLVM runtime / libc++ components (`vendor/gnuplot/LLVM-LICENSE`). These full notices accompany the binary.

## XML parser

`@xmldom/xmldom` is bundled into the extension for SVG validation. Its MIT license and attribution are in `vendor/gnuplot/XMLDOM-LICENSE`. The exact version is locked in package-lock.json.

## gnuplot-wasm evaluation

`gnuplot-wasm@0.1.0` was evaluated but **is not redistributed**. Its package metadata claims MIT, but that does not replace gnuplot's license. Its build script selects gnuplot 6.0.2, downloads unmodified release source and uses an unpinned Emscripten Docker image. The npm archive lacks the gnuplot copyright notice and includes a Node adapter with a `child_process.spawnSync` shell bridge. We instead built the runtime described above directly from official source. No code from its wrapper was copied.
