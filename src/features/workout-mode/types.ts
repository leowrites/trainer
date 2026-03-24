import type { ProgressionPolicy, RoutineSetRole } from '@features/routines';
import type {
  Exercise,
  WorkoutSession,
  WorkoutSet,
} from '@core/database/types';

export interface ActiveWorkoutSessionMeta {
  id: string;
  title: string;
  startTime: number;
  isFreeWorkout: boolean;
}

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

export interface ActiveWorkoutSummary {
  exerciseCount: number;
  completedExerciseCount: number;
  setCount: number;
  completedSetCount: number;
  volume: number;
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

export interface FocusedWorkoutViewModel {
  exerciseId: string;
  exerciseName: string;
  setId: string;
  setNumber: number;
  totalSetsForExercise: number;
  totalRemainingSets: number;
  selectedReps: number;
  selectedWeight: number;
  selectedRir: number | null;
  isCompleted: boolean;
  guidance: FocusedWorkoutGuidance;
}

export interface ActiveWorkoutOverviewSet {
  setId: string;
  setLabel: string;
  reps: number;
  weight: number;
  isCompleted: boolean;
}

export interface ActiveWorkoutOverviewExercise {
  exerciseId: string;
  exerciseName: string;
  sets: ActiveWorkoutOverviewSet[];
}

export interface ActiveWorkoutOverview {
  summary: ActiveWorkoutSummary;
  exercises: ActiveWorkoutOverviewExercise[];
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
