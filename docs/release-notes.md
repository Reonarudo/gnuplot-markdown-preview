# Gnuplot Markdown Preview v0.4.0

Every plot now carries a view toggle in its top corner that flips the fence between the plot and its source text, highlighted as the preview highlights any code block. A flipped fence stays flipped while you edit, after *Markdown: Refresh Preview* and when the preview is reopened; flip it back to see the plot again.

- The toggle is also present on error cards and on the *Loading gnuplot plot…* placeholder, and a flip made while a fence is loading survives the swap to its plot.
- Captions and `print` output hide with the plot in source view; a data-file refresh keeps the flip.
- It is a reader's control; no fence attribute presets it.
- Still requires VS Code 1.101 or later.
