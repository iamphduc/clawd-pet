import { PX, stamp, wide } from '../pixels.ts';
import type { MoodArt } from '../pixels.ts';

export const running: MoodArt = {
  label: 'running',
  // Busy little steps.
  pose: (tick) => ({ lift: tick % 2 ? 2 : 0, step: tick % 2 === 1, look: 2 }),
  prop: (canvas, tick) => {
    // A rocket in flight: stars stream past it, the near ones faster.
    const stars: [number, number, number][] = [
      [0, 1, 0],
      [1, 2, 5],
      [2, 1, 8],
      [9, 2, 2],
      [10, 1, 6],
      [11, 2, 9],
    ];
    for (const [x, speed, offset] of stars) {
      const y = (tick * speed + offset) % 12;
      stamp(canvas, speed === 2 ? ['w', 'g'] : ['g'], PX + x * 2, y);
    }
    stamp(canvas, wide(['..w..', '.www.', '.wcw.', '.www.', 'rwwwr', 'r.r.r']), PX + 6, 1);
    stamp(canvas, wide(tick % 2 ? ['.yry.', '..y..'] : ['.yyy.', '.yry.', '..y..']), PX + 6, 7);
  },
};
