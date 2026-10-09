import { PX, stamp, wide } from '../pixels.ts';
import type { MoodArt } from '../pixels.ts';

export const reading: MoodArt = {
  label: 'reading',
  pose: (tick) => {
    const odd = tick % 2 === 1;
    // Eyes glide across a line left to right, then jump back to the next.
    return { lift: odd ? 2 : 0, step: odd, look: [-2, -1, 0, 1, 2, -2, -1, 0][tick % 8] ?? 0 };
  },
  prop: (canvas, tick) => {
    // An open book. Every 8 ticks a page lifts off the right side, stands
    // up over the spine, and lands on the left, showing new lines of text.
    const step = tick % 8;
    const page = Math.floor(tick / 8) % 2 === 0;
    // prettier-ignore
    stamp(canvas, wide(page
      ? ['.tttt.tttt.', 'tgggtntgggt', 'tttttnttttt', 'tggttntgggt', 'tttttnttttt', 'nnnnnnnnnnn']
      : ['.tttt.tttt.', 'tggttntgggt', 'tttttnttttt', 'tgggtntggtt', 'tttttnttttt', 'nnnnnnnnnnn']), PX, 5)
    // prettier-ignore
    const turning = [
      ['.........tt', '.......tt..', '......t....'],
      ['.....t.....', '.....t.....', '.....t.....', '.....t.....'],
      ['tt.........', '..tt.......', '....t......'],
    ][step - 5];
    if (turning) stamp(canvas, wide(turning), PX, 5 - turning.length + 1);
  },
};
