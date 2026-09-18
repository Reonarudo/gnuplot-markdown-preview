# File-backed plots

Open the repository folder in a trusted VS Code workspace, then open the built-in Markdown Preview. Save a change to `data/results.csv` to update the plot.

## CSV

```gnuplot
set datafile separator comma
set grid
plot "./data/results.csv" using 1:2 with linespoints title "Saved CSV data"
```

## Whitespace data and functions

```gnuplot
set grid
plot "./data/reference.dat" using 1:2 with linespoints title "Reference", x*x title "x squared"
```

## Localized missing-file error

```gnuplot
plot "./data/missing.csv" using 1:2
```

Create `data/missing.csv` containing two numeric columns to recover automatically. Use **Gnuplot: Refresh Data** to explicitly reload all data snapshots.
