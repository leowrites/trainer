/**
 * Plain TypeScript interfaces for every database entity.
 */

export interface Exercise {
  id: string;
  name: string;
  muscle_group: string;
  how_to: string | null;
  equipment: string | null;
  is_deleted: number;
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

export interface Schedule {
  id: string;
  name: string;
  /** SQLite stores booleans as 0/1 integers. */
  is_active: number;
  /**
   * Zero-based index of the last routine that was used.
   * Starts at -1 (meaning no workout has been started yet).
   */
  current_position: number;
}

export interface ScheduleEntry {
  id: string;
  schedule_id: string;
  routine_id: string;
  position: number;
}

export interface WorkoutSession {
  id: string;
  routine_id: string | null;
  schedule_id: string | null;
  snapshot_name: string | null;
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
  target_sets: number | null;
  target_reps: number | null;
}

export interface BodyWeightEntry {
  id: string;
  weight: number;
  unit: 'kg' | 'lb';
  logged_at: number;
  notes: string | null;
}

export interface UserProfile {
  id: string;
  display_name: string | null;
  preferred_weight_unit: 'kg' | 'lb';
  created_at: number;
  updated_at: number;
}
