# Gnuplot Markdown Preview 0.4.0 verification

Release: the view toggle on every claimed fence (source-toggle spec in `onnx-markdown-preview`). Publisher: ReoX86.
Source tag: `v0.4.0` (`d11c59d7c7cf6f57a63f00059ade0f8e8f0aadfc`).

- GitHub release: https://github.com/Reonarudo/gnuplot-markdown-preview/releases/tag/v0.4.0, built by `release.yml` from the tag (https://github.com/Reonarudo/gnuplot-markdown-preview/actions/runs/40857446599): lint, build, 33 unit tests, packaging and the packaged-VSIX host test under Xvfb.
- VSIX: `gnuplot-markdown-preview-0.4.0.vsix`, **1 126 388 bytes, 52 files** (0.3.0: 1 121 910 bytes; the growth is `media/preview.js` and the toggle's stylesheet).
- SHA-256: `0b5bde96128318b2df8c8c7b1dcc97a1e2bfc2a47e85b015a3ab7af02c3f11c3`.
- CI passed on Linux, Windows, macOS and the VS Code 1.101.0 minimum-version job: https://github.com/Reonarudo/gnuplot-markdown-preview/actions/runs/40857446066
- The release asset was downloaded, checked against the release's `SHA256SUMS`, and passed `npm run test:package -- <asset>` on VS Code 1.144.0 (2026-10-29).
- `npm run test:preview` on the tagged commit: **8 live checks passed** on VS Code 1.144.0 (2026-10-29), the required line for the first release carrying the toggle (spec 9.7).
- The manual checklist (spec 9.5: three themes, copy-button row, RTL container, focus ring, scroll sync, the extension's quirks) was done on `examples/view-toggle.md` in a development window and accepted by the user on 2026-10-29.

## Marketplace

Published on 2026-10-29 with `npx vsce publish --packagePath <release asset>`, so the Marketplace and GitHub carry the same bytes:
https://marketplace.visualstudio.com/items?itemName=ReoX86.gnuplot-markdown-preview

- Listing: 0.4.0 has engine `^1.101.0`; 0.3.0 keeps `^1.101.0` and the older releases `^1.95.0`.
- Installed by ID (`ReoX86.gnuplot-markdown-preview@0.4.0`) into an isolated temporary profile with VS Code 1.139.0's CLI. The installed files equal the release asset; `package.json` differs only by the `__metadata` the installer adds.

The normal profile was not modified.
