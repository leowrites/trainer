import type { ProgressionPolicy, RoutineSetRole } from '@features/routines';
import type {
  Exercise,
  WorkoutSession,
  WorkoutSet,
} from '@core/database/types';

export interface ActiveWorkoutSet {
  id: string;
  exerciseId: string;
  position?: number | null;
  reps: number;
  weight: number;
  targetWeight?: number;
  isCompleted: boolean;
  targetSets: number | null;
  targetReps?: number | null;
  targetRepsMin?: number | null;
  targetRepsMax?: number | null;
  actualRir?: number | null;
  setRole?: RoutineSetRole;
}

export interface ActiveWorkoutExercise {
  exerciseId: string;
  exerciseName: string;
  restSeconds?: number | null;
  progressionPolicy?: ProgressionPolicy;
  targetRir?: number | null;
  targetSets: number | null;
  targetReps?: number | null;
  targetRepsMin?: number | null;
  targetRepsMax?: number | null;
  sets: ActiveWorkoutSet[];
}

export interface ActiveWorkoutSession {
  id: string;
  title: string;
  startTime: number;
  isFreeWorkout: boolean;
  exercises: ActiveWorkoutExercise[];
}

export interface PreviousExercisePerformance {
  reps: number;
  weight: number;
  completedAt: number;
}

export interface FocusedWorkoutGuidance {
  targetLabel: string;
  text: string;
  tone: 'positive' | 'neutral' | 'warning';
  quality: {
    level: 'high' | 'medium' | 'low';
    reasons: Array<
      | 'too_few_exposures'
      | 'missing_rir'
      | 'inconsistent_logging'
      | 'exercise_definition_changed'
    >;
  };
}

export interface FocusedWorkoutActionAvailability {
  canComplete: boolean;
  canSkip: boolean;
  canOpenOverview: boolean;
  canAdjustRir: boolean;
}

export interface FocusedWorkoutSetTarget {
  weight: number;
  repsLabel: string;
  repsMin: number | null;
  repsMax: number | null;
}

export interface FocusedWorkoutLocation {
  exerciseIndex: number;
  setIndex: number;
}

export interface FocusedWorkoutViewModel {
  location: FocusedWorkoutLocation;
  exerciseId: string;
  exerciseName: string;
  setId: string;
  setNumber: number;
  totalSetsForExercise: number;
  totalRemainingSets: number;
  target: FocusedWorkoutSetTarget;
  previousSetSummary: string | null;
  selectedReps: number;
  selectedRir: number | null;
  isCompleted: boolean;
  actions: FocusedWorkoutActionAvailability;
  guidance: FocusedWorkoutGuidance;
}

export type WorkoutSessionRow = Pick<
  WorkoutSession,
  'id' | 'snapshot_name' | 'start_time'
>;

export type WorkoutSetRow = Pick<
  WorkoutSet,
  | 'id'
  | 'session_id'
  | 'exercise_id'
  | 'position'
  | 'weight'
  | 'reps'
  | 'is_completed'
  | 'target_sets'
  | 'target_reps'
  | 'target_reps_min'
  | 'target_reps_max'
  | 'actual_rir'
  | 'set_role'
>;

export type ExerciseNameRow = Pick<Exercise, 'id' | 'name'>;

export interface PreviousExercisePerformanceRow {
  exercise_id: string;
  reps: number;
  weight: number;
  end_time: number;
}
