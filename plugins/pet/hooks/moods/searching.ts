import { PX, stamp, wide } from '../pixels.ts'
import type { MoodArt } from '../pixels.ts'

export const searching: MoodArt = {
  label: 'searching',
  // Busy little steps.
  pose: tick => ({ lift: tick % 2 ? 2 : 0, step: tick % 2 === 1, look: 2 }),
  prop: (canvas, tick) => {
    // The magnifier circles slowly, as if scanning a page.
    const path: [number, number][] = [[0, 2], [1, 1], [2, 1], [3, 2], [2, 3], [1, 3]]
    const [dx, dy] = path[tick % 6] ?? [0, 2]
    stamp(canvas, wide([
      '..ggg....',
      '.gwccg...',
      'gwccccg..',
      'gcccccg..',
      'gcccccg..',
      '.gcccg...',
      '..ggg.n..',
      '.......n.',
      '........n',
    ]), PX + dx * 2, dy - 1)
  },
}
