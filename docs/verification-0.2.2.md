# Startup timeout regression

The reported symptom was `Gnuplot could not start: Gnuplot initialization timed out.` in local VS Code. Activation retains its failure renderer, so one startup failure appears in every subsequent fence until the window reloads.

The regression command is `node --import tsx --test --test-name-pattern='ready worker survives' test/renderer.test.ts`. It starts the real WASM worker, blocks the caller's event loop for 10.5 seconds, then requires successful initialization and an SVG plot. Before the fix it failed with the exact initialization timeout, on two runs. After the fix it passes.

The cause reproduced here is delayed ready-message delivery, not slow WASM compilation: publishing a shared readiness flag before the message prevents the timeout callback from discarding an already initialized worker. The 10-second genuine startup limit and three-second render limit remain unchanged. This reproduction does not prove that every timeout in the user's environment has the same cause.

Additional regression tests cover worker exit during initialization and genuinely unresponsive startup. Type checking and all 25 tests pass locally. No temporary debug instrumentation was added.

The packaged extension passes the real VS Code 1.138.0 integration suite locally. [Cross-platform CI](https://github.com/Reonarudo/gnuplot-markdown-preview/actions/runs/35523065003) passes on Linux, Windows, and macOS, including the VS Code 1.95.0 compatibility job. The [release workflow](https://github.com/Reonarudo/gnuplot-markdown-preview/actions/runs/35523066374) also passes.

Tag `v0.2.2` points to `02f88ccefd804251bed943879f27c0ec557d97b6`. The downloaded release VSIX matches its published SHA-256 checksum: `2598f10d81448dbf3770af83616e83e4d71f61549f40d0bebdc269ce054f23c8`.

Marketplace validation completed on 2026-09-20 under the personal ReoX86 publisher. Installing `ReoX86.gnuplot-markdown-preview@0.2.2` into an isolated VS Code environment succeeded. The installed extension, worker, WASM adapter, and WASM binary match the tested release byte for byte.
