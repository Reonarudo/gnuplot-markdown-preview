# Changelog

## 0.3.0

- Render through [gnuplot-renderer](https://github.com/Reonarudo/gnuplot-renderer) 1.0.0, shipped in the extension, instead of a vendored copy of gnuplot. The engine is the same gnuplot 6.0.2 WebAssembly build.
- **Requires VS Code 1.101 or later.** Older versions keep 0.2.5.
- A render that runs past three seconds no longer stops plotting until the window is reloaded: that plot shows a timeout and the next one renders. **Gnuplot: Refresh Data** retries it.
- Errors give their line and column in the fence, and data-file errors point at the operand.
- `print` output and gnuplot's warnings are shown above the plot.
- Editing a fence keeps its previous plot in view until the new one is ready, instead of flashing a loading message. A fence seen for the first time, including one without data files, briefly shows the loading message.
- Plot element ids are derived from the plot's content, not random per render.
- If the renderer cannot load, plots say so and the cause is logged to the **Gnuplot Markdown Preview** output channel.

## 0.2.5

- Gracefully ignore malformed and unknown fence attributes while continuing to render plots.
- Preserve safely parsed alt text and captions; use the first valid value for duplicate attributes.

## 0.2.3

- Support optional quoted `alt` and `caption` attributes on gnuplot fences.
- Expose alt text as the plot’s accessible name and render captions beneath plots.
- Escape attribute text and report malformed, duplicate, or unsupported attributes locally.

## 0.2.2

- Avoid false initialization timeouts when a busy extension host delays delivery of the worker's ready message.
- Report workers that exit during startup directly, and explain how to retry a genuine startup timeout.
- Add regression coverage for delayed message delivery, early exit, and unresponsive startup.

## 0.2.1

- Add real VS Code demo screenshots to the README and packaged Marketplace assets.
- Documentation-only update; rendering behavior is unchanged.

## 0.2.0

- Render literal relative CSV, DAT, and TXT data files inside trusted local workspaces.
- Refresh plots when saved data changes, including missing-file recovery.
- Isolate data per document and render; enforce workspace boundaries, read-only snapshots, and size limits.
- Add **Gnuplot: Refresh Data** and real VS Code integration tests.
- Preserve self-contained plots in Restricted Mode and unsupported file providers.

## 0.1.0

- Render gnuplot fences in VS Code's built-in Markdown Preview.
- Bundle gnuplot 6.0.2 as WebAssembly; no system installation required.
- Support functions, inline datablocks, and 3D SVG plots.
- Preserve unrelated code fences and show localized rendering errors.
- Add bounded caching, SVG sanitization, shell-free execution, and render limits.
