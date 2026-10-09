# Clawd Pet

Clawd, the Claude Code mascot, lives above your prompt and acts out what Claude is doing. When you run several sessions side by side, one glance tells you which one is working, which one needs you, and which one is done.

<img src="docs/demo.gif" alt="Clawd above the prompt: thinking, editing, running tests, cheering when they pass, waving, then done" width="588">

This is an unofficial fan project, not affiliated with or endorsed by Anthropic.

## Install

```bash
claude plugin marketplace add iamphduc/clawd-pet
claude plugin install pet@clawd-pet
```

Then start a new session or run `/reload-plugins`.

You need Claude Code in a terminal with 24-bit color and block characters, such as Windows Terminal, iTerm2, kitty, or Ghostty. Clawd is tested on Claude Code 2.1.295. The desktop app doesn't show Clawd.

## Moods

| When Claude is... | Clawd... | |
| --- | --- | --- |
| Idle | Breathes, blinks, and looks around. | <img src="docs/moods/idle.png" alt="Clawd idle" width="248"> |
| Idle for a minute | Falls asleep. | <img src="docs/moods/sleeping.png" alt="Clawd asleep" width="248"> |
| Thinking | Looks up beside a thought bubble. | <img src="docs/moods/thinking.png" alt="Clawd thinking" width="248"> |
| Reading a file | Reads a book and turns the page. | <img src="docs/moods/reading.png" alt="Clawd reading" width="248"> |
| Editing a file | Hops while a pencil writes. | <img src="docs/moods/editing.png" alt="Clawd editing" width="248"> |
| Searching | Scans with a magnifier. | <img src="docs/moods/searching.png" alt="Clawd searching" width="248"> |
| Running a command | Hops beside a rocket. | <img src="docs/moods/running.png" alt="Clawd running a command" width="248"> |
| Browsing the web | Watches a page load. | <img src="docs/moods/web.png" alt="Clawd browsing" width="248"> |
| Running a subagent | Brings a small helper. | <img src="docs/moods/subagent.png" alt="Clawd with a helper" width="248"> |
| Waiting for you | Waves beside a "?". Claude's prompt covers the band, so you see this only with `/pet waiting`. | <img src="docs/moods/waiting.png" alt="Clawd waving" width="248"> |
| Passing tests or a build | Hops as a green check draws. | <img src="docs/moods/passed.png" alt="Clawd after passing checks" width="248"> |
| Failing tests or a build | Droops beside a red X. | <img src="docs/moods/failed.png" alt="Clawd after failing checks" width="248"> |
| Done with a turn, or committing | Cheers as confetti falls. | <img src="docs/moods/happy.png" alt="Clawd cheering" width="248"> |
| Hitting an error, or a tool you denied | Shows X eyes and a sweat drop. | <img src="docs/moods/error.png" alt="Clawd after an error" width="248"> |
| Stopped by your plan's usage limit | Sleeps until the limit resets. | <img src="docs/moods/sleeping.png" alt="Clawd resting" width="248"> |

Under the mood name, a short line shows what Claude is working on, such as a file name, a search, a command's description, or a commit message.

Test and build moods cover common check commands, such as `npm test`, `pytest`, `go test`, `cargo build`, `tsc`, and `eslint`.

## Extras

**Context battery.** When the context window is half full, an idle or sleeping Clawd shows a battery. It drains from green to yellow at 65% and red at 80%. At 80%, a toast reminds you once to run `/compact`.

**Time of day.** From midnight to 6 a.m., Clawd wears a nightcap. From 6 to 11 a.m., an idle Clawd has a coffee.

<img src="docs/moods/battery.png" alt="Clawd with the context battery at 72%" width="248"> <img src="docs/moods/nightcap.png" alt="Clawd in a nightcap" width="248"> <img src="docs/moods/coffee.png" alt="Clawd with coffee" width="248">

**Plan usage limits.** On a Claude subscription, a toast tells you once when your 5-hour or weekly limit passes 90%, with the time it resets.

## Commands

| Command | What it does |
| --- | --- |
| `/pet` | Lists the moods. |
| `/pet <mood> [seconds]` | Shows a mood, for 10 seconds by default. |
| `/pet demo` | Plays every mood, 2 seconds each. |
| `/pet context <percent>` | Fakes the context fill, to preview the battery. |
| `/pet hour <0-23>` | Fakes the hour for 10 seconds. |
| `/pet off` | Hides Clawd, in new sessions too. Toasts still show. |
| `/pet on` | Brings Clawd back. |

To collapse the band for now, press `ctrl+x ctrl+a` or click `[-]`.

## Update

```bash
claude plugin marketplace update clawd-pet
claude plugin update pet@clawd-pet
```

Then start a new session or run `/reload-plugins`.

## Uninstall

```bash
claude plugin uninstall pet@clawd-pet
```

## Contribute

See [CONTRIBUTING.md](CONTRIBUTING.md).
