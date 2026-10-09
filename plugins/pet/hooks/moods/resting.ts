import type { MoodArt } from '../pixels.ts'
import { sleeping } from './sleeping.ts'

// Stopped by the plan's limit: Clawd sleeps; only the label differs.
export const resting: MoodArt = { ...sleeping, label: 'resting' }
