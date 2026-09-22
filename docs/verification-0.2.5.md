# Version 0.2.5 verification

- All 30 automated tests pass, including graceful handling of malformed, unknown, and duplicate attributes, escaped values, and preservation of actual plotting errors.
- The 0.2.5 VSIX passes the real VS Code 1.138.0 integration suite locally, including rendering a plot with malformed and unknown attributes alongside a valid caption.
- [Cross-platform CI](https://github.com/Reonarudo/gnuplot-markdown-preview/actions/runs/35730127817) passes on Linux, Windows, and macOS, plus the minimum VS Code compatibility job.
- The [release workflow](https://github.com/Reonarudo/gnuplot-markdown-preview/actions/runs/35730130538) passes. The downloaded release VSIX matches its published SHA-256: `941a068a655a1f7a0a345a5f6e10762b07376bb8289b47581492cc8003e005a0`.
- Publishing used the personal ReoX86 publisher. Installation from Marketplace by ID at version 0.2.5 succeeded in an isolated environment; extension/worker bundles and preview styles match the tested release byte for byte.
