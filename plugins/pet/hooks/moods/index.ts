// Every mood Clawd shows, one module each. A mood in MoodKind without a module
// here, or a module here without a mood, fails the type check.
import type { MoodKind } from '../../types';
import type { MoodArt } from '../pixels.ts';
import { committed } from './committed.ts';
import { editing } from './editing.ts';
import { error } from './error.ts';
import { failed } from './failed.ts';
import { happy } from './happy.ts';
import { idle } from './idle.ts';
import { passed } from './passed.ts';
import { reading } from './reading.ts';
import { resting } from './resting.ts';
import { running } from './running.ts';
import { searching } from './searching.ts';
import { sleeping } from './sleeping.ts';
import { subagent } from './subagent.ts';
import { thinking } from './thinking.ts';
import { waiting } from './waiting.ts';
import { web } from './web.ts';

export const MOODS: Record<MoodKind, MoodArt> = {
  idle,
  sleeping,
  thinking,
  reading,
  editing,
  searching,
  running,
  web,
  subagent,
  waiting,
  passed,
  failed,
  committed,
  resting,
  happy,
  error,
};
