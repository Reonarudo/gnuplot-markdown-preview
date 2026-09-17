# Gnuplot Markdown Preview

Render `gnuplot` code fences directly in VS Code's built-in Markdown Preview, locally with bundled WebAssembly. No system gnuplot installation is required.

## Example

````markdown
```gnuplot
set grid
set xrange [-10:10]

plot sin(x) title "sin(x)", \
     cos(x) title "cos(x)"
```
````

Open the normal Markdown Preview to see an inline SVG plot in place of the fence.

## Features

- Real gnuplot syntax, using gnuplot 6.0.2 compiled to WebAssembly.
- Local rendering with no network service or native gnuplot process.
- Crisp SVG output and responsive plot sizing.
- Inline datasets, multiple functions, and 3D plots.
- Normal Markdown and other fenced languages remain unchanged.
- Localized errors and an in-memory plot cache.

## Usage

1. Install **Gnuplot Markdown Preview** (`ReoX86.gnuplot-markdown-preview`).
2. Open a Markdown file.
3. Add a fenced block with the language exactly `gnuplot`.
4. Run **Markdown: Open Preview** from the Command Palette, or press **Ctrl+Shift+V** on Windows/Linux and **Cmd+Shift+V** on macOS. Use **Markdown: Open Preview to the Side** for an editor-and-preview layout.

## Examples

### Multiple functions

```gnuplot
set xrange [-10:10]
set grid
plot sin(x), cos(x), atan(x)
```

### Inline data

```gnuplot
$data << EOD
0 0
1 1
2 4
3 9
4 16
EOD
plot $data using 1:2 with linespoints title "Squares"
```

### 3D surface

```gnuplot
set hidden3d
splot sin(sqrt(x*x+y*y))
```

See [examples/demo.md](https://github.com/Reonarudo/gnuplot-markdown-preview/blob/main/examples/demo.md) for a complete preview fixture.

## Output and errors

The preview selects the SVG terminal and output file for you. Omit `set terminal` and `set output`: direct terminal/output changes are rejected with a local error. Programs should produce one plot, or a single `set multiplot` composition. Scripts that fail, select incompatible output indirectly, or produce no complete SVG show an error block without breaking the rest of the preview.

Every program starts with clean gnuplot memory. Variables and datablocks do not carry between fences. Plots use a white background in both light and dark editor themes.

## Limitations in 0.1.0

- External `.dat` / `.csv` files, workspace files, `load` scripts, and shell pipelines are not supported. Use inline datablocks.
- SVG is the only supported output. Other terminal types and interactive terminal features are unavailable.
- The bundled build excludes native GUI, bitmap, Lua, plugin, and optional external-library features.
- Maximum source: 64,000 characters; maximum SVG: 4 MB; WASM memory: 64 MiB; render time: three seconds.
- After a render timeout the worker stops. Run **Developer: Reload Window** to resume plotting.
- Desktop VS Code and remote extension hosts are supported; browser-only VS Code is not.
- A document with many distinct expensive plots can take time to render. The 96-entry cache avoids repeating identical work.

## Security

Gnuplot executes inside the bundled WebAssembly environment, never by invoking a system gnuplot process. The runtime is built without Node shell/filesystem bridges and only sees restricted in-memory files. Markdown cannot access host files or invoke the host shell through gnuplot. SVG is sanitized before inclusion: scripts, event handlers, executable HTML, and external resources are excluded. No telemetry is collected.

See [the audit](https://github.com/Reonarudo/gnuplot-markdown-preview/blob/main/docs/licensing-audit.md) for the build provenance and security boundaries.

## Development

Use Node 24 LTS and npm:

```sh
npm ci
npm run lint
npm run build
npm test
npm run package
npm run test:package
```

Press F5 to launch the Extension Development Host and open `examples/demo.md`. The normal build copies audited WASM assets from `vendor/gnuplot`. Rebuilding WASM itself requires Emscripten 6.0.9 and `bash scripts/build-wasm.sh`; compiler prerequisites are unnecessary for normal extension development.

GitHub Actions checks the build and packaged rendering path. Tags create a GitHub Release containing the tested VSIX. Marketplace publishing is an explicit authenticated step; see [publishing.md](https://github.com/Reonarudo/gnuplot-markdown-preview/blob/main/docs/publishing.md).

## Roadmap

1. Workspace-relative CSV/data files with explicit dependency tracking.
2. Theme-aware plots.
3. Fence rendering options for dimensions and appearance.
4. Cache invalidation for future external data dependencies.

## License

The extension's original code and artwork are [MIT licensed](https://github.com/Reonarudo/gnuplot-markdown-preview/blob/main/LICENSE). Bundled gnuplot uses its own license. Compiler runtime and XML parser notices are retained in [THIRD_PARTY_NOTICES.md](https://github.com/Reonarudo/gnuplot-markdown-preview/blob/main/THIRD_PARTY_NOTICES.md) and the accompanying notice files.
