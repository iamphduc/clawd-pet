import { PX, stamp, wide } from '../pixels.ts';
import type { MoodArt } from '../pixels.ts';

export const error: MoodArt = {
  label: 'oops',
  // Normal eyes look worried, not dead: see docs/decisions.md.
  pose: () => ({ squash: true }),
  prop: (canvas, tick) => {
    // A sweat drop beside the head slides down, then a new one forms. It's
    // drawn in half-width pixels, fine enough to taper to a point.
    const slide = tick % 4;
    if (slide < 3) stamp(canvas, ['..c..', '.ccc.', 'ccccc', 'ccccc', '.ccc.'], 30, slide);
    stamp(canvas, wide(['rr', 'rr', 'rr', 'rr', '..', 'rr']), PX + 4, 2);
  },
};
