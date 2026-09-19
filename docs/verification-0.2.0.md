# Version 0.2.0 verification

- Strict TypeScript check and 22 automated tests pass on macOS arm64.
- Real WASM tests cover CSV/whitespace data, multiple files, empty-filename reuse, 3D input, read-only enforcement, cleanup, source isolation, and the existing execution/sanitization safeguards.
- Coordinator tests verify no external reads in Restricted Mode or unsupported providers, stale-load discard, disposal, and file-count limits.
- Extension-host integration passes on VS Code 1.95.0 and 1.137.0: initial asynchronous loading, two-document path isolation, locked-preview refresh when the active editor differs, save/delete/recreate, data renames, Markdown moves, unsaved documents, traversal errors, size errors, normal fences, and unique plot IDs.
- The actual 0.2.0 VSIX passes layout checks and the same real extension-host suite outside the source tree on VS Code 1.137.0.
- Local path containment rejects symlink components, but is not an OS sandbox against a hostile process racing directory replacements. External data requires workspace trust; remote data providers are deliberately unsupported.

- Packaged visual check passed in the Gnuplot Marketplace Test profile: CSV and whitespace plots rendered, a saved CSV change appeared automatically, and creating a missing file replaced its error with a third plot. Temporary fixture changes were restored.
- During the first long-running installed session, a plot hit the 3-second renderer timeout. Reloading the window recovered it, and subsequent save/recovery checks passed. The trigger was not isolated; the timeout protection remains enabled.

## Release evidence

- [Cross-platform CI](https://github.com/Reonarudo/gnuplot-markdown-preview/actions/runs/35402463117) passed on Linux, Windows, and macOS, plus the VS Code 1.95.0 compatibility job.
- Tag `v0.2.0` points to `4519450aa45f7a74a776dc3005c165621d16688a`.
- [Release workflow](https://github.com/Reonarudo/gnuplot-markdown-preview/actions/runs/35402621451) passed and created the [GitHub release](https://github.com/Reonarudo/gnuplot-markdown-preview/releases/tag/v0.2.0).
- Downloaded release VSIX SHA-256: `ae0bb3c310a344cf33ed6f990d8daa998bc300e71e698375dece84cac594948c`, matching the release checksum. Its packaged extension-host suite also passed locally on VS Code 1.137.0 before Marketplace upload.

## Marketplace verification (2026-09-19)

- Uploaded the exact release VSIX through the personal ReoX86 publisher. Marketplace validation completed and the public listing displays the 0.2.0 README and relative-data feature. No university identity, directory, resource, or service connection was used.
- Installed `ReoX86.gnuplot-markdown-preview@0.2.0` by Marketplace ID into an isolated VS Code environment. Signature integrity, validity, and trust checks passed; signature protections were not disabled. Installation metadata records version `0.2.0` and `source: gallery`.
- All 17 installed asset files match the GitHub release VSIX byte-for-byte; publisher and version were checked separately.
- The Marketplace-installed entry point passed the real VS Code 1.137.0 extension-host integration suite, including dependency updates, rename/move handling, error recovery, and static/locked preview behavior.
- Final visual inspection used the exact release artifact in the dedicated Gnuplot Marketplace Test profile, refreshed to replace the earlier local 0.2.0 build. CSV and whitespace plots rendered correctly, with the intentional missing-file error localized. Marketplace installation and runtime checks were performed separately in the isolated gallery installation above.
