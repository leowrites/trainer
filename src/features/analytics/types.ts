export type WeightUnit = 'kg' | 'lb';

export interface HistorySessionRow {
  id: string;
  routine_id: string | null;
  routine_name: string | null;
  snapshot_name: string | null;
  start_time: number;
  end_time: number | null;
}

export interface HistorySetRow {
  id: string;
  session_id: string;
  exercise_id: string;
  exercise_name: string | null;
  weight: number;
  reps: number;
  is_completed: number;
  target_sets: number | null;
  target_reps: number | null;
}

export interface HistoryTrendSessionRow {
  id: string;
  start_time: number;
  end_time: number | null;
  total_volume: number;
  total_reps: number;
  total_sets: number;
  total_completed_sets: number;
}

export interface HistorySet {
  id: string;
  exerciseId: string;
  reps: number;
  weight: number;
  isCompleted: boolean;
}

export interface HistoryExerciseSummary {
  exerciseId: string;
  exerciseName: string;
  targetSets: number | null;
  targetReps: number | null;
  sets: HistorySet[];
  totalSets: number;
  completedSets: number;
  totalReps: number;
  totalVolume: number;
}

export interface HistorySession {
  id: string;
  routineId: string | null;
  routineName: string;
  startTime: number;
  endTime: number | null;
  durationMinutes: number | null;
  totalSets: number;
  totalCompletedSets: number;
  totalReps: number;
  totalVolume: number;
  exerciseCount: number;
  exercises: HistoryExerciseSummary[];
}

export interface TrendPoint {
  key: string;
  label: string;
  value: number;
  sessionCount: number;
  startTime: number;
}

export type HistoryTrendMetric = 'volume' | 'hours' | 'reps' | 'sets';
export type HistoryTrendRange = '3m' | '1y' | 'all';
export type HistoryTrendGranularity = 'day' | 'month' | 'year';

export type HistoryTrendSeriesByMetric = Record<
  HistoryTrendMetric,
  TrendPoint[]
>;

export interface DashboardMetrics {
  workoutsThisWeek: number;
  workoutDaysThisWeek: number;
  currentWeeklyStreak: number;
  lastCompletedWorkoutAt: number | null;
}

export interface ProgressiveOverloadSet {
  reps: number;
  weight: number;
  isCompleted: boolean;
}

export interface ProgressiveOverloadCandidate {
  exerciseId: string;
  exerciseName: string;
  targetSets: number | null;
  targetReps: number | null;
  sets: ProgressiveOverloadSet[];
}

export interface ProgressiveOverloadConfig {
  weightIncrement: number;
  unit: WeightUnit;
  precision?: number;
}

export interface ProgressiveOverloadRecommendation {
  exerciseId: string;
  exerciseName: string;
  targetReps: number;
  completedSetCount: number;
  currentWeight: number;
  recommendedWeight: number;
  weightIncrement: number;
  unit: WeightUnit;
}
