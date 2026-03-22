/**
 * Routine template contracts.
 *
 * CALLING SPEC:
 * - Import these types for routine authoring, detail editing, and workout
 *   session template seeding.
 * - `RoutineExerciseInput` is the write shape for create/update flows.
 * - `RoutineExerciseTemplate` is the read shape used by screens and workout
 *   startup code.
 */

export type ProgressionPolicy = 'double_progression' | 'top_set_backoff';
export type RoutineSetRole =
  | 'work'
  | 'top_set'
  | 'backoff'
  | 'warmup'
  | 'optional';

export interface RoutineExerciseSetInput {
  targetReps?: number;
  targetRepsMin: number;
  targetRepsMax: number;
  plannedWeight: number | null;
  setRole?: RoutineSetRole;
}

export interface RoutineExerciseInput {
  exerciseId: string;
  restSeconds?: number | null;
  progressionPolicy?: ProgressionPolicy;
  targetRir?: number | null;
  sets?: RoutineExerciseSetInput[];
  targetSets?: number;
  targetReps?: number;
  targetRepsMin?: number;
  targetRepsMax?: number;
}

export interface NewRoutineInput {
  name: string;
  exercises: RoutineExerciseInput[];
}

export interface RoutineExerciseTemplateSet {
  id: string;
  position: number;
  targetReps?: number;
  targetRepsMin: number;
  targetRepsMax: number;
  plannedWeight: number | null;
  setRole: RoutineSetRole;
}

export interface RoutineExerciseTemplate {
  id: string;
  exerciseId: string;
  position: number;
  restSeconds: number | null;
  progressionPolicy: ProgressionPolicy;
  targetRir: number | null;
  targetSets: number;
  targetReps?: number | null;
  targetRepsMin: number | null;
  targetRepsMax: number | null;
  sets: RoutineExerciseTemplateSet[];
}
