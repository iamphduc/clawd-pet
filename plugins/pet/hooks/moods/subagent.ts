import { ARMS, FACE, HEAD, LEGS, PX, stamp } from '../pixels.ts';
import type { MoodArt } from '../pixels.ts';

export const subagent: MoodArt = {
  label: 'with a helper',
  pose: (tick) => ({ squash: tick % 8 >= 4, look: 2 }),
  prop: (canvas, tick) => {
    // A helper Clawd: the logo at its own size.
    const odd = tick % 2 === 1;
    stamp(canvas, [HEAD, FACE, ARMS, HEAD, LEGS[odd ? 1 : 0] ?? ''], PX + 2, odd ? 6 : 7);
  },
};
