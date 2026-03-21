/**
 * Routine template public API.
 *
 * CALLING SPEC:
 * - Import this module from other features that only need routine template
 *   contracts or persistence helpers.
 * - This avoids pulling navigation screens into non-UI consumers.
 */

export {
  insertRoutineExerciseTemplates,
  loadRoutineExerciseTemplates,
  replaceRoutineExerciseTemplates,
} from './routine-template-repository';
export type {
  NewRoutineInput,
  RoutineExerciseInput,
  RoutineExerciseTemplate,
  RoutineExerciseTemplateSet,
  RoutineExerciseSetInput,
} from './template-types';
export { buildRoutineSnapshot } from './domain/routine-snapshot';
export type {
  RoutineExerciseData,
  WorkoutSnapshotInput,
} from './domain/routine-snapshot';
