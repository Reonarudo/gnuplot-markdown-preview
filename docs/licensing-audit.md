# Dependency, API, and licensing audit (2026-09-16)

## Decision

Use an independently built gnuplot 6.0.2 WebAssembly runtime, not the npm gnuplot-wasm binary. Its upstream repository was inspected at commit `86f9a76b6ffe0e0498c9165e60f1c93913b7f015` and the npm tarball at version 0.1.0.

The npm wrapper initializes asynchronously and exposes synchronous `render(script, options)`. It prepends `set term svg` and `set output 'plot.svg'`; later user commands can override both. It snapshots/restores WASM linear memory because gnuplot's CLI assumes process teardown. It returns SVG plus diagnostics and throws on a nonzero exit. We independently implement the same necessary CLI lifecycle, using our own policy and worker protocol.

The npm build script uses unmodified official 6.0.2 but does not pin its compiler image. Its generated Node adapter actually implements `system()` via the host shell. Therefore WebAssembly alone is not a sufficient security boundary. The package contains no gnuplot license file. Those issues rule out publishing it unchanged.

## Replacement provenance

The official 6.0.2 archive hash, full license, component notices, build command, and binary hashes accompany this repository. `scripts/build-wasm.sh` recreates the build from that archive with Emscripten 6.0.9. There are no source patches. The compiler's browser-only adapter implements system calls as unsupported, includes no Node filesystem backend, and does not inherit the user's process environment. We export only FS, callMain, and HEAPU8 to our worker.

Audit of gnuplot's Copyright permits distribution of unmodified software with copyright and permission notices. Extra patch/version/contact conditions apply to modified-source binaries. We retain upstream contacts and provide project support contacts in either case. The source component notices and compiler/runtime library notices accompany every VSIX. Own extension code remains MIT.

## API checks

- [Native Markdown extension contract and preview styles](https://code.visualstudio.com/api/extension-guides/markdown-extension): return extendMarkdownIt, contribute markdown.markdownItPlugins and markdown.previewStyles.
- VS Code's markdown extension loader awaits extension activation before obtaining its export. Our activation awaits one initialized worker; fence callbacks remain synchronous.
- [Manifest](https://code.visualstudio.com/api/references/extension-manifest): Visualization category, PNG icon, and publisher metadata.
- [Publishing](https://code.visualstudio.com/api/working-with-extensions/publishing-extension): Microsoft recommends Entra workload identity; the documented initial PAT route requires Marketplace Manage. Global PAT retirement: December 1, 2026.
- The reference pikchr extension was inspected for contribution shape. Its renderer returns raw text for unrelated fences; we preserve the original renderer instead and test that behavior.

## Security and limits

WASM uses 64 MiB fixed linear memory in an isolated Node worker with an empty process environment. Only the trusted adapter and fixed WASM file are read from the host. Gnuplot sees an in-memory filesystem restricted to script.gp and plot.svg; it cannot read workspace or host files. Shell, pipes, and backticks have no functioning host bridge. Output remains untrusted and is parsed as XML, with passive SVG elements/attributes allowed and scripts, foreignObject, external references, animation and event handlers removed. DOCTYPE/entity declarations and malformed output are rejected. Every plot gets unique IDs to avoid collisions between plots and cached occurrences.

A synchronous request waits at most three seconds; after a timeout the worker is terminated and the user must reload the window. Input is capped at 64,000 characters and output at 4 MB. A 96-entry LRU includes error results. Each render restores linear memory and removes temporary files. No native process is used to execute user programs.

Direct set terminal/output commands are rejected; indirect manipulation cannot access the host and must still produce a complete, sanitized SVG. Output policy does not serve as the shell/filesystem security boundary. Plots retain a white background for predictable contrast in dark themes.
