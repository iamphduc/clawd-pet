import { PX, stamp, wide } from '../pixels.ts'
import type { MoodArt } from '../pixels.ts'

export const failed: MoodArt = {
  label: 'checks failed',
  pose: () => ({ squash: true, eyes: 'shut' }),
  prop: canvas => {
    stamp(canvas, wide(['r.....r', '.r...r.', '..r.r..', '...r...', '..r.r..', '.r...r.', 'r.....r']), PX + 4, 2)
  },
}
