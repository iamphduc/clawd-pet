# Contributing

Clawd Pet is a hooks-module plugin in `plugins/pet`.

## Project layout

- `hooks/register.tsx` turns turn and tool events into moods and draws the band.
- `hooks/moods/` holds one file per mood: its label, Clawd's pose, and the prop beside Clawd.
- `hooks/pixels.ts` holds the shared drawing tools and Clawd's body. Each terminal cell draws 2 x 2 pixels with quarter-block characters.
- `hooks/sprites.ts` puts a mood on the canvas, adds the nightcap, coffee, and battery, and packs the canvas into terminal cells.
- `tests/pet.test.ts` holds the tests.
- `scripts/render-moods.mjs` renders the animated mood images in `docs/moods/` from the sprite code.

Before you change the art, read [docs/decisions.md](docs/decisions.md).

## Add a mood

1. Add the mood's name to `MoodKind` in `plugins/pet/types/index.d.ts`.
1. Add a file for it in `plugins/pet/hooks/moods/`.
1. List the file in `plugins/pet/hooks/moods/index.ts`.

The type check fails until all three match.

## Load your working copy

```bash
claude --plugin-dir ./plugins/pet
```

Loading the plugin this way also writes the plugin API's types to `plugins/pet/.claude-plugin/types/`. That folder is gitignored, because Claude Code writes it to match your installed version. Until you load the plugin once, your editor reports false errors such as "Cannot find module 'claude-code'".

## Check your changes

```bash
claude plugin validate --strict ./plugins/pet
claude plugin test ./plugins/pet
npx -p typescript@7.0.2 tsc -p ./plugins/pet
```

The Check workflow in `.github/workflows/check.yml` runs these on every pull request. It also renders the mood images and fails if they don't match the files in `docs/moods/`. After you change the art, run `node scripts/render-moods.mjs` and commit the images.

## Release

`claude plugin update` only fetches a new version number. To ship a change, bump the version in both `plugins/pet/.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json`. For details, see [docs/decisions.md](docs/decisions.md#release-every-change-you-want-installed).
