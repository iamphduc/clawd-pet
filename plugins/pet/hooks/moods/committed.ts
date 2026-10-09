import type { MoodArt } from '../pixels.ts'
import { happy } from './happy.ts'

// A commit cheers with the turn-done art; only the label differs.
export const committed: MoodArt = { ...happy, label: 'committed!' }
