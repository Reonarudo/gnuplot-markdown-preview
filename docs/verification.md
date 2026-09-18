# Release verification

Verified on macOS arm64 with VS Code 1.137.0 and Node 24.21.0 (2026-09-17).

- Clean `npm ci`, strict TypeScript checks, production build, and all 13 automated tests passed.
- Real WASM tests cover 2D/multiple functions, inline data, 3D, invalid syntax, state isolation, filesystem/shell attempts, bounded caching, and infinite-loop termination.
- Package inspection confirms a single runtime copy plus README, manifest, PNG icon, and complete notices. Source/tests/dependencies are excluded.
- `npm run test:package` extracts the actual VSIX and activates its bundled entry point outside the source tree: four SVGs, one escaped local error, intact Swift/JavaScript fences, and unique IDs for repeated plots.
- Development Host preview visually verified with other extensions disabled. An installed third-party Markdown plugin in the default profile consumed unrelated fences; the clean host confirmed our plugin preserves them.
- Actual VSIX installed into the dedicated **Gnuplot Preview Test** profile. Built-in Markdown Preview verified in the dark theme: normal code highlighting, function plots, inline data, localized error, and 3D surface. Development-host light-theme rendering also checked.
- Initial VSIX startup encountered one three-second timeout during heavy host startup. Reloading the window recovered and all four plots rendered. Standalone measurements on the same machine: simple plot 147 ms, 3D plot 52 ms. The documented time budget intentionally bounds work under load.
- GitHub CI passed all checks, including extracted-VSIX rendering, on Ubuntu.

## Marketplace verification (2026-09-18)

- Published v0.1.0 through the personal Microsoft account that owns ReoX86. No university tenant resources or publishing identities were used.
- The [public listing](https://marketplace.visualstudio.com/items?itemName=ReoX86.gnuplot-markdown-preview) shows the correct publisher, identifier, version, icon, README, repository, and license links.
- Installed by extension ID into an isolated VS Code environment. The first attempt returned a local signature-verifier `UnknownError` with `Executed: false`; a diagnostic retry succeeded with `Executed: true`, signature integrity/validity/trust checks passing, and no security settings changed.
- VS Code installation metadata confirms `source: gallery`, version `0.1.0`. All 17 installed asset files match the GitHub release VSIX byte-for-byte; publisher and version in the manifest were checked separately.
- Activated the Marketplace-installed entry point and rendered the complete demo: four SVG plots, one localized error, and intact Swift/JavaScript fences passed.
- The final visual check inside the isolated Marketplace-installed VS Code window is pending. UI control stopped because another project window was active; the earlier development-host and local-VSIX visual checks remain valid but are separate checks.
