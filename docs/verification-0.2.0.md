# Version 0.2.0 verification

- Strict TypeScript check and 22 automated tests pass on macOS arm64.
- Real WASM tests cover CSV/whitespace data, multiple files, empty-filename reuse, 3D input, read-only enforcement, cleanup, source isolation, and the existing execution/sanitization safeguards.
- Coordinator tests verify no external reads in Restricted Mode or unsupported providers, stale-load discard, disposal, and file-count limits.
- Extension-host integration passes on VS Code 1.95.0 and 1.137.0: initial asynchronous loading, two-document path isolation, locked-preview refresh when the active editor differs, save/delete/recreate, unsaved documents, traversal errors, size errors, normal fences, and unique plot IDs.
- The actual 0.2.0 VSIX passes layout checks and the same real extension-host suite outside the source tree on VS Code 1.137.0.
- Local path containment rejects symlink components, but is not an OS sandbox against a hostile process racing directory replacements. External data requires workspace trust; remote data providers are deliberately unsupported.

- Packaged visual check passed in the Gnuplot Marketplace Test profile: CSV and whitespace plots rendered, a saved CSV change appeared automatically, and creating a missing file replaced its error with a third plot. Temporary fixture changes were restored.
- During the first long-running installed session, a plot hit the 3-second renderer timeout. Reloading the window recovered it, and subsequent save/recovery checks passed. The trigger was not isolated; the timeout protection remains enabled.

Pending: cross-platform CI, GitHub release, personal-account Marketplace upload, and installation verification of the published 0.2.0 artifact.
