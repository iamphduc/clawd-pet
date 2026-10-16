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

## Stay with background subagents

A background subagent lets the main turn end right away, while the subagent
keeps working. If Clawd cheered and then fell asleep, it would look done while
work was still running.

So when the main turn ends, Clawd asks `$.agent.list()` how many subagents are
still pending, running, or waiting. If any are, Clawd shows "with a helper"
with a count. It asks again every 2 seconds and goes idle when none are left.
Teammates don't count, because they idle between messages.

Clawd polls the engine's list instead of keeping its own count from spawn and
`turn.complete` events. A count kept in the plugin is lost when the plugin
reloads, and one missed event would leave Clawd waiting forever.

## Hide Clawd when the band is too short

In fullscreen mode, Claude Code gives the band at most half the terminal's
height, with the prompt's rows included. Clawd needs 6 rows, plus 1 for its top
margin. A band with fewer rows scrolls and shows only the top of Clawd with an
"n more" row, which looks broken.

So when the band has fewer than 6 rows, Clawd hides and Claude Code draws the
band. With exactly 6 rows, Clawd drops its top margin. Cropping Clawd to the
rows that fit was offered instead, but any partial Clawd looks wrong. A smaller
Clawd was tried earlier and dropped, because quarter blocks are the finest
pixels the Raster allows.

## Release every change you want installed

`claude plugin update` only fetches new code when the version number changes.
A merged fix doesn't reach installed copies until the version in both
`plugins/pet/.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json`
goes up. Use a patch bump for fixes and a minor bump when a release adds a
feature.

Bump the version in the same PR as the change, so one merge ships it. A
separate release PR, as #33, #36, and #44 were, costs an extra merge and ships
nothing if it merges before the change does.
