# Startup timeout regression

The reported symptom was `Gnuplot could not start: Gnuplot initialization timed out.` in local VS Code. Activation retains its failure renderer, so one startup failure appears in every subsequent fence until the window reloads.

The regression command is `node --import tsx --test --test-name-pattern='ready worker survives' test/renderer.test.ts`. It starts the real WASM worker, blocks the caller's event loop for 10.5 seconds, then requires successful initialization and an SVG plot. Before the fix it failed with the exact initialization timeout, on two runs. After the fix it passes.

The cause reproduced here is delayed ready-message delivery, not slow WASM compilation: publishing a shared readiness flag before the message prevents the timeout callback from discarding an already initialized worker. The 10-second genuine startup limit and three-second render limit remain unchanged. This reproduction does not prove that every timeout in the user's environment has the same cause.

Additional regression tests cover worker exit during initialization and genuinely unresponsive startup. Type checking and all 25 tests pass locally. No temporary debug instrumentation was added.
