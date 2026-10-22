# Third-party notices

The extension's original TypeScript, tests, build scripts, and artwork are MIT licensed (see LICENSE). This does not relicense bundled software.

## Gnuplot renderer

Plots are rendered by [gnuplot-renderer](https://github.com/Reonarudo/gnuplot-renderer) (MIT), shipped in this extension under `node_modules/@reonarudo/gnuplot-renderer/`. It carries the **unmodified official gnuplot 6.0.2 release** compiled to WebAssembly with Emscripten 6.0.9. Its own `THIRD_PARTY_NOTICES.md` and `licenses/` directory give the engine's provenance and licenses; keep them with any redistribution:

- Gnuplot 6.0.2, copyright 1986–1993, 1998, 2004 Thomas Williams, Colin Kelley, with additional contributors identified in `licenses/GNUPLOT-SOURCE-NOTICES.txt`. Gnuplot is under its own license (`licenses/GNUPLOT-COPYRIGHT`), not MIT or GPL. No source changes or patches were applied, so the license's additional conditions for binaries compiled from modified source do not apply.
- The Emscripten runtime (MIT / University of Illinois/NCSA; `licenses/EMSCRIPTEN-LICENSE`), musl libc (`licenses/MUSL-COPYRIGHT`) and LLVM runtime / libc++ components (`licenses/LLVM-LICENSE`) linked into the engine.

Upstream contacts: https://www.gnuplot.info/ and gnuplot-info@lists.sourceforge.net. Extension integration support: Reonarudo, https://github.com/Reonarudo/gnuplot-markdown-preview/issues.

## xmldom

[`@xmldom/xmldom`](https://github.com/xmldom/xmldom), used by the renderer's SVG sanitizer, is shipped under `node_modules/@xmldom/xmldom/` with its MIT license. The exact version is locked in package-lock.json.

## gnuplot-wasm evaluation

`gnuplot-wasm@0.1.0` was evaluated but **is not redistributed**. Its package metadata claims MIT, but that does not replace gnuplot's license, its npm archive lacks the gnuplot copyright notice, and it includes a Node adapter with a `child_process.spawnSync` shell bridge. No code from it was copied.
