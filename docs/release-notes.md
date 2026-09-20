# Gnuplot Markdown Preview v0.2.2

Fix a false startup timeout when another extension keeps the VS Code extension host busy. The renderer now checks a shared worker readiness flag before declaring initialization timed out, so a delayed ready message does not discard an initialized renderer. Workers that exit during startup report their exit immediately. Genuine startup and render time limits remain enforced.

After updating, run **Developer: Reload Window** to clear an initialization failure retained by the previous version.
