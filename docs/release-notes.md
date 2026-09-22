# Gnuplot Markdown Preview v0.2.3

Gnuplot fences now accept optional `alt` and `caption` attributes:

````markdown
```gnuplot {alt="Sine curve" caption="Figure 1: Sine wave"}
plot sin(x)
```
````

Alt text provides an accessible plot description. Captions appear beneath the plot. Both values are plain text and support single or double quotes. Invalid or unsupported attributes produce a local fence error. Existing bare gnuplot fences work unchanged.
