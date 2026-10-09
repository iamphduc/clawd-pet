import { PX, stamp, wide } from '../pixels.ts';
import type { MoodArt } from '../pixels.ts';

export const passed: MoodArt = {
  label: 'checks passed!',
  pose: (tick) => ({ lift: tick % 2 ? 2 : 0, eyes: 'happy', step: tick % 2 === 1 }),
  prop: (canvas, tick) => {
    // The check draws itself left to right, then holds.
    const shown = [2, 4, 6, 9, 9, 9, 9, 9][tick % 8] ?? 9;
    const check = ['.......GG', '......GG.', 'GG...GG..', '.GG.GG...', '..GGG....', '...G.....'];
    stamp(canvas, wide(check.map((line) => line.slice(0, shown))), PX + 2, 3);
  },
};
