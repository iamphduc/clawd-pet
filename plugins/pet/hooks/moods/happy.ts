import { PX, stamp, wide } from '../pixels.ts'
import type { MoodArt } from '../pixels.ts'

export const happy: MoodArt = {
  label: 'done!',
  pose: tick => ({ lift: tick % 2 ? 2 : 0, eyes: 'happy', step: tick % 2 === 1 }),
  prop: (canvas, tick) => {
    // Confetti flutters down, each bit flipping flat, then on edge, as it falls.
    const confetti: [number, string, number][] = [[0, 'r', 0], [2, 'y', 3], [3, 'y', 5], [5, 'c', 9], [7, 'G', 2], [8, 'r', 10], [9, 'p', 7], [10, 'B', 11]]
    for (const [x, color, offset] of confetti) {
      const t = tick + offset
      const sway = t % 4 < 2 ? 0 : 1
      stamp(canvas, t % 2 ? [color, color] : wide([color]), PX + x * 2 + sway, t % 12)
    }
  },
}
