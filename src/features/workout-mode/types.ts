import type {
  Exercise,
  WorkoutSession,
  WorkoutSet,
} from '@core/database/types';

export interface ActiveWorkoutSet {
  id: string;
  exerciseId: string;
  reps: number;
  weight: number;
  isCompleted: boolean;
  targetSets: number | null;
  targetReps: number | null;
}

export interface ActiveWorkoutExercise {
  exerciseId: string;
  exerciseName: string;
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

export type WorkoutSessionRow = Pick<
  WorkoutSession,
  'id' | 'snapshot_name' | 'start_time'
>;

export type WorkoutSetRow = Pick<
  WorkoutSet,
  | 'id'
  | 'session_id'
  | 'exercise_id'
  | 'weight'
  | 'reps'
  | 'is_completed'
  | 'target_sets'
  | 'target_reps'
>;

export type ExerciseNameRow = Pick<Exercise, 'id' | 'name'>;
