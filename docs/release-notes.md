# Gnuplot Markdown Preview v0.3.0

Plots are now rendered by [gnuplot-renderer](https://github.com/Reonarudo/gnuplot-renderer) 1.0.0, the same library that renders gnuplot on reonarudo.github.io, instead of a copy inside the extension. The engine is still the unmodified gnuplot 6.0.2 compiled to WebAssembly. **Requires VS Code 1.101 or later**; older versions stay on 0.2.5.

- A runaway plot times out on its own; later plots keep rendering, without a window reload.
- Errors give their line and column; `print` output and warnings appear above the plot.
- Editing a fence keeps its previous plot until the new one is ready.
