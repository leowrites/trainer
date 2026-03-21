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
  isCompleted: boolean;
  targetSets: number | null;
  targetReps: number | null;
}

export interface ActiveWorkoutExercise {
  exerciseId: string;
  exerciseName: string;
  restSeconds?: number | null;
  targetSets: number | null;
  targetReps: number | null;
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
>;

export type ExerciseNameRow = Pick<Exercise, 'id' | 'name'>;

export interface PreviousExercisePerformanceRow {
  exercise_id: string;
  reps: number;
  weight: number;
  end_time: number;
}
