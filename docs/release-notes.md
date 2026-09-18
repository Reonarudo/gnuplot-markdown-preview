# Gnuplot Markdown Preview v0.2.0

- Plot relative CSV, DAT, and TXT files in trusted local workspaces.
- Refresh file-backed plots when saved data changes, with missing-file recovery.
- Keep each document and render isolated using read-only WASM data snapshots.
- Enforce workspace boundaries, input limits, and Restricted Mode behavior.
- Add **Gnuplot: Refresh Data** and real VS Code integration coverage.

External data currently requires a saved Markdown document inside a local workspace. Remote data providers, computed filenames, binary data, and external scripts are not supported. Function and inline-data plotting remain available without external file access.
