# Version 0.2.3 verification

- Type checking and all 29 automated tests pass locally, including quoted attributes, escaping, invalid syntax, optional values, loading status, and unchanged plain fences.
- Packaged VS Code 1.138.0 integration passes. It verifies accessible names and escaped captions with real SVG rendering, plus attributes on file-backed plots through loading and dependency refresh.
- [Cross-platform CI](https://github.com/Reonarudo/gnuplot-markdown-preview/actions/runs/35710527300) and the [release workflow](https://github.com/Reonarudo/gnuplot-markdown-preview/actions/runs/35710526968) pass.
- Downloaded release VSIX SHA-256 matches the published checksum: `072d4f7c331d75777da28722f6769651d786012e1e3ec7a6f762b455094d11dd`.
- Marketplace validation completed under the personal ReoX86 publisher. Installation by Marketplace ID at version 0.2.3 succeeded; installed extension/worker bundles and caption styles match the release. The public listing shows the new syntax documentation.

Alt text is exposed through an image role with an escaped accessible name. Captions use `figure` and `figcaption`. Values are plain text; Markdown/HTML formatting and arbitrary fence attributes are intentionally unsupported.
