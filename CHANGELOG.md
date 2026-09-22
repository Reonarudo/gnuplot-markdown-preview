# Changelog

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
