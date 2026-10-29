# The view toggle

Every `gnuplot` fence below carries a button in its top corner that flips it between the plot
and the fence's source. This file is the fixture for `npm run test:preview` and the document for
the manual checklist (the source-toggle spec in `onnx-markdown-preview`, section 9.5): open it in
a development window and view it in a light, a dark and a high-contrast theme.

## 1. A plain fence

```gnuplot
set grid
plot sin(x) title "sin(x)"
```

## 2. Captioned: the button stays at the column edge

```gnuplot {caption="Figure 1: a cosine"}
set grid
plot cos(x) title "cos(x)"
```

## 3. Alt text: the plot has an accessible name

```gnuplot {alt="A straight line through the origin"}
plot x
```

## 4. Error card: the source view shows the body alone

```gnuplot
plot sin(x) with nothing
this is invalid gnuplot
```

## 5. Long lines and a tall body: horizontal scroll, height jump

```gnuplot
# A composed plot, with a comment line that runs well past the width of the preview column so the source view has to scroll sideways
set grid
set xrange [-10:10]
set yrange [-2:2]
set key top left
set title "Damped oscillations"
f(x) = exp(-abs(x)/5) * sin(2*x)
g(x) = exp(-abs(x)/5) * cos(2*x)
h(x) = exp(-abs(x)/5)
plot f(x) title "f", \
     g(x) title "g", \
     h(x) title "envelope" dashtype 2, \
     -h(x) notitle dashtype 2
```

## 6. Two identical bodies: flip the second one only, then edit this heading

```gnuplot
plot x**2
```

```gnuplot
plot x**2
```

## 7. An ordinary fence: no toggle, VS Code's own copy button on hover

```json
{ "compare": "hover me: the copy button is top-right, on hover only" }
```

## 8. Right-to-left container: the button moves to the left

<div dir="rtl">

```gnuplot
plot atan(x)
```

</div>

## 9. Quirks

A fence seen for the first time shows *Loading gnuplot plot…* until it is prepared; the toggle
is already there, and a flip made while it loads survives the swap to the plot. Editing a fence
keeps its previous plot until the new one is ready, while the source view already shows the
edited body. `print` output and gnuplot's warnings appear above the plot and hide with it in
source view:

```gnuplot
print "printed above the plot"
plot sinh(x) title "sinh(x)"
```

A plot that reads a data file re-renders with the same body when the file is saved, so the key
matches and the flip survives the refresh. Here the file is missing, so the rendering is an
error card and the source view is the fence as written:

```gnuplot
set datafile separator comma
plot "nowhere.csv" using 1:2 with lines
```

A plot that runs past three seconds shows a timeout card, which the toggle treats like any error
card.
