# Version 0.2.0 plan: relative data files

Status: implementation in release verification, 2026-09-19. The user selected relative CSV/data files as the release priority and authorized implementation. The context/refresh integration passed on VS Code 1.95.0 and 1.137.0; external data remains limited to local file workspaces. See verification-0.2.0.md for release evidence.

## User outcome

A saved Markdown document can plot a nearby data file in the built-in Markdown Preview:

````markdown
```gnuplot
set datafile separator comma
plot "./data/results.csv" using 1:2 with linespoints title "Results"
```
````

Paths resolve relative to the Markdown document, regardless of the active editor or process working directory. Saving a referenced file updates its plots. Gnuplot interprets the original bytes and its normal datafile options; the extension does not implement a separate CSV parser.

## Proposed scope and defaults

- Support literal relative `.csv`, `.dat`, and `.txt` operands in `plot` and `splot`, including multiple files and subdirectories. Keep existing functions, inline datasets, and unrelated fences working.
- Permit `../` only when the resolved file remains inside the Markdown document's own workspace folder. Do not cross into a different folder of a multi-root workspace.
- Require a trusted workspace for external reads. In Restricted Mode, function and inline-data plots continue working; external-file plots explain that workspace trust is required. Do not request trust automatically.
- Require a saved Markdown document inside a workspace for external data. Unsaved/outside-workspace documents retain self-contained plotting and receive a useful error for file references.
- Read saved file contents. Unsaved changes in an open data editor take effect after save.
- Initial proposed limits: 1 MiB per file, 4 MiB total and 16 unique files per plot; a 32 MiB byte budget for the shared data cache. Retain the existing source, SVG, memory, and execution limits. Validate these defaults using representative data before release.
- Start with local filesystem workspaces. Investigate SSH/WSL/dev-container support during the first milestone; include it only if path containment and file watching can be verified on that provider. Unsupported providers get explicit errors for external data, without losing self-contained rendering.
- Defer theme changes, fence sizing/options, binary data, computed filenames, globbing, URLs, absolute paths, shell pipelines, `load`/`call` scripts, and output-file writes. This is data input support, not general filesystem access.

## Architecture and first release gate

The existing renderer accepts only source text, caches by source, and blocks synchronously while its worker runs. The worker currently permits only its script and SVG files. Both interfaces need explicit data inputs.

1. **Prove document context and refresh first.** Exercise two previews with identical plot text but different document directories, including a locked preview while the active editor changes. Confirm a first-render loading state can resolve after an asynchronous read and that a saved data-file change refreshes the built-in preview without editing Markdown or looping. Check the minimum supported VS Code version and current stable. Do not use the active editor as a document-path fallback.
2. **Resolve and load dependencies asynchronously.** A small document-scoped coordinator discovers supported references, validates paths, reads through `vscode.workspace.fs`, deduplicates in-flight requests, and produces immutable file snapshots. The synchronous fence renderer consumes ready snapshots or returns an escaped loading/error block while work is pending. Do not block the extension host waiting for a file read that itself requires the host event loop.
3. **Pass explicit inputs to the runtime.** A render request contains the source plus validated virtual filenames and bytes. Mount only these files in WASM memory, permit read-only access to them, and retain the existing controlled script/output paths. Validate read/write modes, reserved-name collisions, normalized paths, and cleanup after success or failure. Keep the host filesystem and shell inaccessible to gnuplot.
4. **Cache by full input identity.** Include document URI, source, normalized dependency paths, and content digests. Keep a reverse dependency index so saves, creation, deletion, and renames invalidate affected plots and cached errors. Debounce refreshes, discard stale read completions, bound caches and watchers, and dispose document state when no longer needed.

The current upstream Markdown engine supplies `env.currentDocument` during rendering, but not during tokenization. Treat this as an implementation detail to verify, not a guaranteed public extension API. The exact refresh mechanism is also an investigation item. If either cannot be made reliable on the supported versions, stop the feature implementation and document the alternative before proceeding; do not silently ship first-render or stale-data failures.

## File-access rules

- Dependency discovery must understand strings, escaping, comments, line continuations, inline datablocks, and multiple plot operands. Do not use a broad quoted-string regex that mistakes titles or labels for filenames. Define and test the supported syntax explicitly; preserve gnuplot's empty-filename reuse where supported.
- Reject paths outside the containing workspace, URI schemes, device/UNC paths, and traversal through symlinks. For the initial local implementation, reject symlink components under the workspace root and check canonical containment before reading. Address path replacement races in the feasibility work; do not claim hostile-filesystem isolation from lexical normalization alone.
- Check sizes before reading where possible and after reading unconditionally. Limit concurrent reads, total cached bytes, and outstanding loads.
- Only validated data snapshots enter WASM. Missing, denied, oversized, or unsupported inputs produce local errors without revealing unrelated host paths.
- File reads must not enable `load`, shell commands, arbitrary writes, or reuse of a prior plot's files. SVG sanitization remains mandatory.

## Implementation milestones

| Milestone | Deliverable | Acceptance gate |
| --- | --- | --- |
| 1. Integration feasibility | Small development-host fixture and documented context/refresh/provider findings | First load, two-document isolation, and save-triggered refresh work on minimum/current VS Code |
| 2. One-file vertical slice | One literal CSV reference, trusted local workspace, asynchronous load, read-only WASM input | Real CSV renders end to end; denied/missing files show useful errors |
| 3. Generalize and bound | Multiple files, subdirectories, whitespace data, limits and cleanup | No cross-document or cross-render data leakage; access-policy tests pass |
| 4. Dependency lifecycle | Content-aware cache, watcher invalidation, stale-request handling | Save/delete/recreate/rename and Markdown Save As cannot display stale results |
| 5. Release | Examples, docs, full regression tests, exact VSIX and Marketplace verification | All gates below pass before publishing 0.2.0 |

## Tests and release acceptance

- Real WASM fixtures: comma-separated and whitespace data, headers using gnuplot options, spaces/Unicode in filenames, multiple files, `plot` and `splot`, empty-filename reuse, comments/labels that resemble paths.
- Policy fixtures: absolute paths, traversal, sibling workspace folders, symlinks, reserved names, write attempts, missing/deleted files, size/count limits, and unsupported providers. No file reads in Restricted Mode.
- Lifecycle fixtures: same source in different directories, changed bytes with unchanged file size, rapid saves during loading, errors becoming valid after file creation, document move/Save As, and cleanup after failure.
- Regression fixtures: all 0.1.0 behavior, sanitization, execution limits, unique SVG IDs, inline data, and unrelated fenced languages.
- Test the packaged VSIX outside the source tree. Visually check file-backed plots, error recovery, save-triggered refresh, and responsiveness in the native preview. Run supported-platform CI; verify Windows path handling, and explicitly document any untested remote provider.
- Update README, changelog, examples with committed sample data, and verification records. Bump to 0.2.0 only at release preparation. Tag the tested commit, attach the exact tested VSIX to GitHub, publish that asset, then install by Marketplace ID and repeat the visual checks.
- Retain the personal ReoX86 publishing path. Do not use university tenant identities, credentials, resources, or service connections.

## References

- [VS Code Markdown extension API](https://code.visualstudio.com/api/extension-guides/markdown-extension)
- [Upstream Markdown engine: document context and synchronous rendering](https://github.com/microsoft/vscode/blob/main/extensions/markdown-language-features/src/markdownEngine.ts)
- Existing implementation: `src/markdown.ts`, `src/renderer.ts`, `src/worker.ts`; release procedure: [publishing.md](publishing.md).
