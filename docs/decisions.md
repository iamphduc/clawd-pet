# Design decisions

This page records choices about Clawd's art that might look like mistakes, and
why they're on purpose. Read it before you change `plugins/pet/hooks/sprites.ts`.

## Pixels and cells

Each terminal cell holds 2 x 2 pixels, drawn with quarter-block characters, and
each cell can show only two colors. A terminal cell is about twice as tall as it
is wide, so one pixel looks tall and narrow on screen.

## Draw wide art at an even x

Props use `wide()` art: each character becomes two pixels side by side, which
looks square on screen. Always stamp wide art at an even x.

At an odd x, each square straddles two cells. Those cells then have to share
their two colors with whatever is next to them, and the edges show stray pixels
or the wrong color.

## Keep the error mood's thin X eyes

The error mood's X eyes are 3 x 3 pixels, so they look tall and thin. This is
on purpose.

A 3 x 3 X is the smallest X the pixels allow. Drawn with square `wide()` pixels,
it looks chunky. The following versions were tried and rejected:

- A square X
- A thin X and a big X, both made of half-width pixels
- A dark X
- A `> <` wince
- Plain red eyes

The Raster that draws Clawd accepts only characters in the Basic Multilingual
Plane, so finer pixels such as sextants and octants aren't available.
