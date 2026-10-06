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

## Context battery

Clawd shows how full the context window is, so you know when to run `/compact`.

- When the context is 50% full or more, a battery appears beside Clawd every time Clawd is idle or asleep. The battery drains as the context fills: green, then yellow from 65%, then red from 80%.
- While Claude works, Clawd holds the prop for its task instead. The battery comes back each time Claude finishes.
- A "context N%" line in the same color shows under the mood name in every mood.
- At 80%, a toast tells you once to run `/compact`.
- The battery and the line go away when the context drops below 50%, for example after `/compact`.

Claude Code measures the context after each turn, so a new or just-compacted session shows nothing until its next turn ends.

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

To preview the battery, set a fake context fill with `/pet context <percent>`, such as `/pet context 72`. Your next prompt replaces it with the real value.

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
