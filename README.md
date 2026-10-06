# Clawd Pet

Clawd, the Claude Code mascot, lives in the band above your prompt and acts out what Claude is doing.

| Claude is... | Clawd... |
| --- | --- |
| Idle | Breathes, blinks, and looks around. Falls asleep after a minute. |
| Thinking | Looks up beside a thought bubble. |
| Reading a file | Hops beside a book whose page flips. |
| Editing a file | Hops while a pencil writes. |
| Searching | Hops while a magnifier sweeps. |
| Running a command | Hops beside a terminal with a blinking cursor. |
| Browsing the web | Hops beside a turning globe. |
| Running a subagent | Brings a small helper Clawd. |
| Done with a turn | Jumps with happy eyes and sparkles. |
| Hitting an error | Shows X eyes, a sweat drop, and a red "!". |

## Requirements

- Claude Code in the terminal (tested on 2.1.289). The desktop app doesn't draw the pet.
- A terminal with 24-bit color and a font that has block characters, such as Windows Terminal, iTerm2, kitty, or Ghostty.

## Install

```bash
claude plugin marketplace add iamphduc/clawd-pet
claude plugin install pet@clawd-pet
```

Then start a new session or run `/reload-plugins`.

## Use

Clawd reacts on its own. To preview a mood, run `/pet <mood> [seconds]`:

```text
/pet happy
/pet helper 5
/pet
```

`/pet` with no mood lists them all.

To hide the band, press `ctrl+x ctrl+a` or click `[-]`.

## Develop

The pet is a hooks-module plugin in `plugins/pet`:

- `hooks/register.tsx` turns turn and tool events into moods and draws the band.
- `hooks/sprites.ts` holds the pixel art. Each terminal cell draws 2 x 2 pixels with quarter-block characters.
- `tests/pet.test.ts` holds the tests.

To load your working copy in one session:

```bash
claude --plugin-dir ./plugins/pet
```

To check your changes:

```bash
claude plugin validate ./plugins/pet
claude plugin test ./plugins/pet
```

## Uninstall

```bash
claude plugin uninstall pet@clawd-pet
```
