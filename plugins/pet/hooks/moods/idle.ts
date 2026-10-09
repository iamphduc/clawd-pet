import type { MoodArt } from '../pixels.ts';

export const idle: MoodArt = {
  label: 'chilling',
  pose: (tick) => {
    // Clawd breathes, blinks, and now and then glances left, then right.
    const cycle = tick % 40;
    const look = cycle >= 20 && cycle < 26 ? -2 : cycle >= 28 && cycle < 34 ? 2 : 0;
    return { squash: tick % 8 >= 4, eyes: tick % 16 === 0 ? 'shut' : 'open', look };
  },
};
