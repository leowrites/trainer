/**
 * Workout summary types.
 *
 * CALLING SPEC:
 * - Import these types from workout-mode summary modules.
 * - These contracts describe the post-workout summary screen only.
 * - They do not depend on React or database instances.
 */

import type { HistorySession, WeightUnit } from '@features/analytics';

export type WorkoutRecordBadgeTone = 'accent' | 'warning' | 'error' | 'muted';
export type WorkoutFeedbackMetric = 'effort' | 'fatigue';

export interface WorkoutRecordBadge {
  id: string;
  label: string;
  detail: string;
  tone: WorkoutRecordBadgeTone;
  exerciseId: string | null;
  exerciseName: string | null;
}

export interface WorkoutSummaryScheduleContext {
  scheduleName: string;
  completedRoutineName: string;
  completedPositionLabel: string;
  nextRoutineName: string | null;
}

export interface WorkoutFeedbackOption {
  value: number;
  shortLabel: string;
  title: string;
}

export interface WorkoutTemplateUpdateViewModel {
  routineName: string;
  canApply: boolean;
  appliedAtLabel: string | null;
}

export interface WorkoutSummaryViewModel {
  session: HistorySession;
  unit: WeightUnit;
  completedAtLabel: string;
  dateLabel: string;
  durationLabel: string;
  volumeLabel: string;
  streakLabel: string;
  weeklyProgressLabel: string;
  recordBadges: WorkoutRecordBadge[];
  scheduleContext: WorkoutSummaryScheduleContext | null;
  effortLevel: number | null;
  fatigueLevel: number | null;
  templateUpdate?: WorkoutTemplateUpdateViewModel | null;
}
