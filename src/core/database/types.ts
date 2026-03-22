/**
 * Plain TypeScript interfaces for every database entity.
 */

export type HealthDataSource = 'manual' | 'apple_health';

export interface Exercise {
  id: string;
  name: string;
  muscle_group: string;
  how_to: string | null;
  equipment: string | null;
  strength_estimation_mode?: 'primary' | 'limited' | 'disabled';
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
  rest_seconds?: number | null;
  progression_policy?: 'double_progression' | 'top_set_backoff';
  target_rir?: number | null;
}

export interface RoutineExerciseSet {
  id: string;
  routine_exercise_id: string;
  position: number;
  target_reps: number;
  planned_weight: number | null;
  target_reps_min?: number | null;
  target_reps_max?: number | null;
  set_role?: 'work' | 'top_set' | 'backoff' | 'warmup' | 'optional';
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
  effort_level: number | null;
  fatigue_level: number | null;
  template_applied_at?: number | null;
}

export interface WorkoutSessionExercise {
  id: string;
  session_id: string;
  exercise_id: string;
  position: number;
  rest_seconds?: number | null;
  progression_policy?: 'double_progression' | 'top_set_backoff';
  target_rir?: number | null;
}

export interface WorkoutSet {
  id: string;
  session_id: string;
  exercise_id: string;
  position?: number | null;
  weight: number;
  reps: number;
  is_completed: number; // SQLite uses 0/1 for booleans
  target_sets: number | null;
  target_reps: number | null;
  target_reps_min?: number | null;
  target_reps_max?: number | null;
  actual_rir?: number | null;
  set_role?: 'work' | 'top_set' | 'backoff' | 'warmup' | 'optional';
}

export interface BodyWeightEntry {
  id: string;
  weight: number;
  unit: 'kg' | 'lb';
  logged_at: number;
  notes: string | null;
  source: HealthDataSource;
  source_record_id: string | null;
  source_app: string | null;
  imported_at: number | null;
}

export interface DailyStepEntry {
  id: string;
  day_key: string;
  step_count: number;
  source: HealthDataSource;
  source_record_id: string | null;
  imported_at: number | null;
}

export interface UserProfile {
  id: string;
  display_name: string | null;
  preferred_weight_unit: 'kg' | 'lb';
  created_at: number;
  updated_at: number;
}

export interface TrainingGoal {
  id: string;
  goal_type: 'strength' | 'performance' | 'adherence' | 'volume';
  exercise_id: string | null;
  muscle_group: string | null;
  target_load: number | null;
  target_reps: number | null;
  target_sessions_per_week: number | null;
  target_sets_per_week: number | null;
  target_weeks: number | null;
  start_time: number | null;
  end_time: number | null;
  status: 'active' | 'completed' | 'archived';
  created_at: number;
  updated_at: number;
}

export interface HealthSyncState {
  provider: 'apple_health';
  last_body_weight_sync_at: number | null;
  last_steps_sync_at: number | null;
  last_status: 'idle' | 'success' | 'error';
  last_error: string | null;
  updated_at: number;
}
