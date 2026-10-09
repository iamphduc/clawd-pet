import { PX, stamp, wide } from '../pixels.ts';
import type { MoodArt } from '../pixels.ts';

export const sleeping: MoodArt = {
  label: 'sleeping',
  slow: true,
  pose: (tick) => ({ squash: tick % 8 >= 4, eyes: 'shut' }),
  prop: (canvas, tick) => {
    // Two Zs, half a cycle apart: each starts small by the head, grows as it
    // drifts up and right, and fades out. They keep a row clear above the battery.
    const small = ['gggg', '..g.', '.g..', 'gggg'];
    const big = ['ggggg', '...g.', '..g..', '.g...', 'ggggg'];
    const path: [string[], number, number][] = [
      [small, 0, 3],
      [small, 1, 2],
      [big, 2, 2],
      [big, 4, 1],
      [big, 6, 0],
      [big, 7, 0],
    ];
    for (const phase of [tick % 6, (tick + 3) % 6]) {
      const [art, x, y] = path[phase] ?? [small, 0, 3];
      stamp(canvas, wide(phase === 5 ? art.map((line) => line.replaceAll('g', 'd')) : art), PX + x * 2, y);
    }
  },
};
