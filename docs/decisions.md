# Design decisions

This page records choices that might look like mistakes, and why they're on
purpose. Read the art sections before you change the sprite code: each mood's
art in `plugins/pet/hooks/moods/`, and the shared drawing tools in
`plugins/pet/hooks/pixels.ts`.

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

## Don't wave for prompts

Every prompt from Claude covers the band: questions, permission prompts, and
MCP dialogs. While one is open, you see the prompt, not Clawd. So Clawd doesn't
track open prompts, and the "needs you" wave can only be seen with `/pet waiting` or
`/pet demo`.

The code that waved for permission prompts (#27) and MCP dialogs (#32) was
removed in #34, after testing by hand on Claude Code 2.1.295. If a later
version stops covering the band, that code can come back from git history.

## Release every change you want installed

`claude plugin update` only fetches new code when the version number changes.
A merged fix doesn't reach installed copies until a release PR bumps the
version in both `plugins/pet/.claude-plugin/plugin.json` and
`.claude-plugin/marketplace.json`, as #33 and #36 did. Use a patch bump for
fixes and a minor bump when a release adds a feature.
