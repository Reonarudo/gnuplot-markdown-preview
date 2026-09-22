# Gnuplot Markdown Preview v0.2.5

Malformed and unknown fence attributes are now silently ignored, so plots continue to render. Valid alt text and captions are retained where parsing is unambiguous; the first valid value wins for duplicate keys. Incomplete outer attribute blocks are ignored entirely.

Actual Gnuplot rendering errors remain visible. Existing attribute text escaping and plain fences are unchanged.
