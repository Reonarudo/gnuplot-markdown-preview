# Gnuplot Markdown Preview

Regular **Markdown** and unrelated code fences remain intact.

```swift
let x = 42
```

```javascript
const message = "Hello, plots!";
```

## Functions

```gnuplot
set grid
plot sin(x)
```

## Multiple functions

```gnuplot
set grid
set xrange [-10:10]
plot sin(x) title "sin(x)", \
     cos(x) title "cos(x)"
```

## Inline data

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

## Localized error

```gnuplot
this is invalid gnuplot
```

The preview continues after the error.

## 3D

```gnuplot
set hidden3d
splot sin(sqrt(x*x+y*y))
```

## Accessible plot with caption

```gnuplot {alt="A sine wave oscillating between minus one and one" caption="Figure 1: Sine wave"}
set grid
plot sin(x) title "sin(x)"
```
