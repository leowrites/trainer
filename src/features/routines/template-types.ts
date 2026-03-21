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

export interface RoutineExerciseSetInput {
  targetReps: number;
  plannedWeight: number | null;
}

export interface RoutineExerciseInput {
  exerciseId: string;
  restSeconds?: number | null;
  sets?: RoutineExerciseSetInput[];
  targetSets?: number;
  targetReps?: number;
}

export interface NewRoutineInput {
  name: string;
  exercises: RoutineExerciseInput[];
}

export interface RoutineExerciseTemplateSet {
  id: string;
  position: number;
  targetReps: number;
  plannedWeight: number | null;
}

export interface RoutineExerciseTemplate {
  id: string;
  exerciseId: string;
  position: number;
  restSeconds: number | null;
  targetSets: number;
  targetReps: number | null;
  sets: RoutineExerciseTemplateSet[];
}
