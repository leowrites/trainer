/**
 * Routines feature slice
 *
 * Handles creation and management of workout routines — named collections of
 * exercises that users perform together. Each routine belongs to one or more
 * Schedules and can be queued automatically by the Schedule Engine.
 */
export { RoutinesScreen } from './screens/routines-screen';
export { ExerciseDetailScreen } from './screens/exercise-detail-screen';
export { ExerciseEditorScreen } from './screens/exercise-editor-screen';
export { RoutineDetailScreen } from './screens/routine-detail-screen';
export { RoutineEditorScreen } from './screens/routine-editor-screen';
export type { ExerciseDetailScreenProps } from './screens/exercise-detail-screen';
export type { RoutinesStackParamList } from './types';
export { useExercises } from './hooks/use-exercises';
export { useExerciseInsight } from './hooks/use-exercise-insight';
export { useRoutineExerciseCounts } from './hooks/use-routine-exercise-counts';
export { useRoutines } from './hooks/use-routines';
export { useRoutineInsight } from './hooks/use-routine-insight';
export { useRoutineTemplate } from './hooks/use-routine-template';
export {
  insertRoutineExerciseTemplates,
  loadRoutineExerciseTemplatesAsync,
  loadRoutineExerciseTemplates,
  replaceRoutineExerciseTemplates,
} from './routine-template-repository';
export type {
  NewRoutineInput,
  ProgressionPolicy,
  RoutineExerciseInput,
  RoutineExerciseTemplate,
  RoutineExerciseTemplateSet,
  RoutineExerciseSetInput,
  RoutineSetRole,
} from './template-types';
export { buildRoutineSnapshot } from './domain/routine-snapshot';
export type {
  RoutineExerciseData,
  WorkoutSnapshotInput,
} from './domain/routine-snapshot';
