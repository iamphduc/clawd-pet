export type MoodKind =
  | 'idle'
  | 'sleeping'
  | 'thinking'
  | 'reading'
  | 'editing'
  | 'searching'
  | 'running'
  | 'web'
  | 'subagent'
  | 'waiting'
  | 'passed'
  | 'failed'
  | 'happy'
  | 'error'

export type Mood = {
  kind: MoodKind
  /** Short text shown beside the pet, such as a file name. */
  detail: string
  /** When this mood started, in ms since the epoch. */
  since: number
  /** When a short mood (happy, error) ends; 0 for none. */
  until: number
  /** The mood to return to when `until` passes. */
  then: MoodKind
}

declare module 'claude-code' {
  interface PluginState {
    pet: {
      mood: Mood
      /** How full the context window is, 0 to 100; null before the first measure. */
      context: number | null
      /** Whether the context toast has shown since the context last dropped below the warning level. */
      hasWarned: boolean
    }
  }
}
