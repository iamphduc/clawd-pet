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
    pet: { mood: Mood }
  }
}
