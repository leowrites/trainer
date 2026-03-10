/**
 * Plain TypeScript interfaces for every database entity.
 */

export interface Exercise {
  id: string;
  name: string;
  muscle_group: string;
}

export interface Routine {
  id: string;
  name: string;
  notes: string | null;
}

export interface RoutineExercise {
  id: string;
  routine_id: string;
  exercise_id: string;
  position: number;
  target_sets: number;
  target_reps: number;
}

export interface WorkoutSession {
  id: string;
  routine_id: string | null;
  start_time: number;
  end_time: number | null;
}

export interface WorkoutSet {
  id: string;
  session_id: string;
  exercise_id: string;
  weight: number;
  reps: number;
  is_completed: number; // SQLite uses 0/1 for booleans
}
