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
  | 'committed'
  | 'resting';

export type Mood = {
  kind: MoodKind;
  /** Short text shown beside the pet, such as a file name. */
  detail: string;
  /** When this mood started, in ms since the epoch. */
  since: number;
  /** When a short mood (happy, error) ends; 0 for none. */
  until: number;
  /** The mood to return to when `until` passes. */
  then: MoodKind;
};

/** One plan rate-limit window, as the last measure reported it. */
export type RateLimit = {
  /** `five_hour`, `seven_day`, or a gateway's own. */
  kind: string;
  /** 0 to 100. */
  percentUsed: number;
  /** When the window resets, ISO 8601; absent when not reported. */
  resetsAt?: string;
};

declare module 'claude-code' {
  interface PluginState {
    pet: {
      mood: Mood;
      /** How full the context window is, 0 to 100; null before the first measure. */
      context: number | null;
      /** Whether the context toast has shown since the context last dropped below the warning level. */
      hasWarned: boolean;
      /** Whether `/pet off` hid Clawd; also kept in $.store so it lasts across sessions. */
      isOff: boolean;
      /** The plan's rate-limit windows from the last measure; empty off a subscription. */
      limits: RateLimit[];
      /** The windows whose 90% toast has shown since they last dropped below 90%. */
      limitsWarned: string[];
    };
  }
}
