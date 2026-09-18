# Changelog

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
