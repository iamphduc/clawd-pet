import { PX, stamp, wide } from '../pixels.ts'
import type { MoodArt } from '../pixels.ts'

export const editing: MoodArt = {
  label: 'editing',
  // Busy little steps.
  pose: tick => ({ lift: tick % 2 ? 2 : 0, step: tick % 2 === 1, look: 2 }),
  prop: (canvas, tick) => {
    // The pencil writes a zigzag line left to right, its tip on the line,
    // then holds a beat before starting over.
    const at = Math.min(tick % 5, 3)
    const line = [0, 1].map(row => [...Array(at + 1).keys()].map(i => (i % 2 === row ? '.' : 'g')).join(''))
    stamp(canvas, wide(line), PX, 10)
    stamp(canvas, wide([
      '.......pp',
      '......ggp',
      '.....yyg.',
      '....yyy..',
      '...yyy...',
      '..yyy....',
      '.tyy.....',
      '.kt......',
      'd........',
    ]), PX + at * 2, at % 2 === 0 ? 3 : 2)
  },
}
