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
| Waiting for you | Waves beside a "?" bubble while Claude asks you a question or a permission prompt is open. After you approve a long command, Clawd goes back to work once the command starts running. |
| Running tests or a build that passes | Hops with happy eyes beside a green check. |
| Running tests or a build that fails | Squashes down with closed eyes beside a red X. |
| Done with a turn | Jumps with happy eyes and sparkles. |
| Hitting an error | Shows X eyes, a sweat drop, and a red "!". |

## Time of day

Clawd follows your computer's local time:

- From midnight to 6 a.m., Clawd wears a striped nightcap in every mood.
- From 6 to 11 a.m., an idle Clawd has a steaming mug of coffee beside it. When the context battery is showing, the battery takes its place.

## Test and build results

Clawd reacts for 3 seconds when Claude runs a check: tests, a build, a type check, or a linter.

- A command counts as a check when it starts with a test or build tool, such as `npm test`, `pnpm run build`, `npx vitest`, `pytest`, `go test`, `cargo build`, `tsc`, `eslint`, `make`, or `claude plugin test`. Steps after `&&`, `;`, or `|` count too. A command that only mentions a word, such as `git commit -m "add test"`, doesn't.
- A check fails when the command exits with an error, or its output shows a failure count above zero ("2 failed") or `FAIL`. Otherwise it passes.
- When a check is the last thing in a turn, Clawd keeps showing its result for 3 seconds after the turn ends, instead of the "done!" cheer.

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

## Update

```bash
claude plugin marketplace update clawd-pet
claude plugin update pet@clawd-pet
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

To preview the time of day, fake the hour for 10 seconds with `/pet hour <0-23>`, such as `/pet hour 8`.

To turn Clawd off while you focus, run `/pet off`. Clawd stays off in new sessions too, until you run `/pet on`. The context toast at 80% still shows while Clawd is off.

To collapse the band for now, press `ctrl+x ctrl+a` or click `[-]`.

## Develop

The pet is a hooks-module plugin in `plugins/pet`:

- `hooks/register.tsx` turns turn and tool events into moods and draws the band.
- `hooks/sprites.ts` holds the pixel art. Each terminal cell draws 2 x 2 pixels with quarter-block characters.
- `tests/pet.test.ts` holds the tests.

To load your working copy in one session:

```bash
claude --plugin-dir ./plugins/pet
```

Loading the plugin this way also writes the plugin API's types to `plugins/pet/.claude-plugin/types/`. That folder is gitignored, because Claude Code writes it to match your installed version. Until you load the plugin once, your editor reports false errors such as "Cannot find module 'claude-code'".

To check your changes:

```bash
claude plugin validate ./plugins/pet
claude plugin test ./plugins/pet
npx -p typescript tsc -p ./plugins/pet
```

## Uninstall

```bash
claude plugin uninstall pet@clawd-pet
```
