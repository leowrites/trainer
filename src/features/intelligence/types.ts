/**
 * Intelligence contracts.
 *
 * CALLING SPEC:
 * - Import these types for deterministic metrics, classifiers, prescriptions,
 *   and goal-evaluation results.
 * - These contracts describe derived intelligence only. They are not canonical
 *   persisted records.
 * - Side effects: none.
 */

import type { TrainingGoal } from '@core/database/types';
import type { HistorySession, WeightUnit } from '@features/analytics';

export type StrengthEstimationMode = 'primary' | 'limited' | 'disabled';
export type QualityLevel = 'high' | 'medium' | 'low';
export type QualityReason =
  | 'too_few_exposures'
  | 'missing_rir'
  | 'limited_strength_estimation'
  | 'inconsistent_logging'
  | 'recent_interruption'
  | 'exercise_definition_changed';

export interface DataQuality {
  level: QualityLevel;
  reasons: QualityReason[];
}

export interface ExerciseCapability {
  exerciseId: string;
  exerciseName: string;
  muscleGroup: string;
  strengthEstimationMode: StrengthEstimationMode;
}

export interface ExerciseExposure {
  sessionId: string;
  exerciseId: string;
  exerciseName: string;
  routineId: string | null;
  routineName: string;
  startTime: number;
  progressionPolicy: 'double_progression' | 'top_set_backoff';
  targetRir: number | null;
  targetSets: number | null;
  targetRepsMin: number | null;
  targetRepsMax: number | null;
  sessionVolume: number;
  completedSetCount: number;
  eligibleSetCount: number;
  eligibleSets: HistorySession['exercises'][number]['sets'];
  bestLoad: number;
  bestRepsAtBestLoad: number;
  bestEstimatedOneRepMax: number | null;
  allTopRangeHits: boolean;
  targetHit: boolean;
  anyMajorMiss: boolean;
  workSetMissCount: number;
  averageActualRir: number | null;
  averagePlannedRir: number | null;
  averageTargetCompletion: number | null;
  performanceVariability: number | null;
}

export interface ExerciseTrendSummary {
  exerciseId: string;
  exerciseName: string;
  summary: string;
  quality: DataQuality;
}

export interface RoutineTrendSummary {
  routineId: string;
  routineName: string;
  summary: string;
  quality: DataQuality;
}

export interface IntelligenceBadge {
  id: string;
  label: string;
  detail: string;
  tone: 'accent' | 'warning' | 'error' | 'muted';
  exerciseId: string | null;
  exerciseName: string | null;
  isHard?: boolean;
}

export interface ExerciseClassification {
  exerciseId: string;
  exerciseName: string;
  targetMiss: 'none' | 'minor' | 'moderate' | 'major';
  overshotEffort: boolean;
  fatigueFlag: boolean;
  stallFlag: boolean;
  plateauFlag: boolean;
  reason: string;
}

export interface SessionPrescription {
  exerciseId: string;
  exerciseName: string;
  action: 'increase' | 'hold' | 'decrease';
  currentWeight: number;
  recommendedWeight: number;
  targetRepsMin: number | null;
  targetRepsMax: number | null;
  reason: string;
  quality: DataQuality;
}

export interface SessionIntelligence {
  recordBadges: IntelligenceBadge[];
  negativeSignals: IntelligenceBadge[];
  prescriptions: SessionPrescription[];
  classifications: ExerciseClassification[];
  goalDeltas: GoalProgressSummary[];
}

export interface TrainingGoalInput {
  goalType: TrainingGoal['goal_type'];
  exerciseId?: string | null;
  muscleGroup?: string | null;
  targetLoad?: number | null;
  targetReps?: number | null;
  targetSessionsPerWeek?: number | null;
  targetSetsPerWeek?: number | null;
  targetWeeks?: number | null;
  startTime?: number | null;
  endTime?: number | null;
  status?: TrainingGoal['status'];
}

export interface GoalProgressSummary {
  id: string;
  title: string;
  progressText: string;
  isComplete: boolean;
  quality: DataQuality;
}

export interface TrainingGoalViewModel {
  goal: TrainingGoal;
  title: string;
  progress: GoalProgressSummary;
}

export interface SessionIntelligenceOptions {
  unit: WeightUnit;
  capabilitiesByExerciseId: Record<string, ExerciseCapability>;
  goals: TrainingGoal[];
}
