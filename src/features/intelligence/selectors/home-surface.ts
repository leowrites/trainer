/**
 * Home surface selectors.
 *
 * CALLING SPEC:
 * - `selectHomePrimaryInsight(input)` returns exactly one concise insight for
 *   the workout home surface.
 * - `selectHomeExerciseHighlights(summaries)` returns up to two trend-backed
 *   exercise highlights for the home surface.
 * - Selectors are deterministic and quality-aware. They prefer neutral,
 *   action-oriented messaging when history is sparse or noisy.
 * - Side effects: none.
 */

import type { DashboardMetrics } from '@features/analytics';
import type {
  DataQuality,
  ExerciseTrendSummary,
  HomeExerciseHighlight,
  HomePrimaryInsight,
  TrainingGoalViewModel,
} from '../types';

interface HomePrimaryInsightInput {
  dashboardMetrics: DashboardMetrics;
  exerciseTrendSummaries: ExerciseTrendSummary[];
  routineTrendSummaries: Array<{
    routineId: string;
    routineName: string;
    summary: string;
    quality: DataQuality;
  }>;
  goalViewModels: TrainingGoalViewModel[];
  now: number;
}

interface InsightCandidate {
  id: string;
  text: string;
  tone: HomePrimaryInsight['tone'];
  source: HomePrimaryInsight['source'];
  quality: DataQuality;
  score: number;
}

function daysSince(timestamp: number | null, now: number): number | null {
  if (timestamp === null) {
    return null;
  }

  return (now - timestamp) / (24 * 60 * 60 * 1000);
}

function buildFallbackQuality(): DataQuality {
  return {
    level: 'low',
    reasons: ['too_few_exposures'],
  };
}

function buildGoalCandidate(
  goalViewModels: TrainingGoalViewModel[],
): InsightCandidate | null {
  const goalViewModel = goalViewModels.find(
    (item) =>
      !item.progress.isComplete && item.progress.quality.level !== 'low',
  );

  if (!goalViewModel) {
    return null;
  }

  const progressText = goalViewModel.progress.progressText.toLowerCase();
  const compactText = progressText.startsWith('progress ')
    ? goalViewModel.progress.progressText.replace('Progress ', '')
    : goalViewModel.progress.progressText;

  return {
    id: `goal-${goalViewModel.goal.id}`,
    text: compactText,
    tone: 'neutral',
    source: 'goal',
    quality: goalViewModel.progress.quality,
    score: goalViewModel.progress.quality.level === 'high' ? 6 : 4,
  };
}

function buildExerciseCandidate(
  summaries: ExerciseTrendSummary[],
): InsightCandidate | null {
  const summary = summaries.find((item) => item.quality.level !== 'low');

  if (!summary) {
    return null;
  }

  return {
    id: `exercise-${summary.exerciseId}`,
    text: summary.signal ?? `${summary.exerciseName.toUpperCase()} READY`,
    tone: summary.direction === 'down' ? 'warning' : 'positive',
    source: 'exercise',
    quality: summary.quality,
    score:
      summary.direction === 'up' ? 8 : summary.direction === 'steady' ? 5 : 3,
  };
}

function buildRoutineCandidate(
  routineTrendSummaries: HomePrimaryInsightInput['routineTrendSummaries'],
): InsightCandidate | null {
  const summary = routineTrendSummaries.find(
    (item) => item.quality.level !== 'low',
  );

  if (!summary) {
    return null;
  }

  return {
    id: `routine-${summary.routineId}`,
    text: `${summary.routineName} moving`,
    tone: 'neutral',
    source: 'routine',
    quality: summary.quality,
    score: 4,
  };
}

function buildAdherenceCandidate(
  dashboardMetrics: DashboardMetrics,
  now: number,
): InsightCandidate | null {
  const daysSinceLastWorkout = daysSince(
    dashboardMetrics.lastCompletedWorkoutAt,
    now,
  );

  if (dashboardMetrics.workoutsThisWeek >= 3) {
    return {
      id: 'adherence-strong',
      text: `CONSISTENT  ${dashboardMetrics.workoutsThisWeek} workouts this week`,
      tone: 'positive',
      source: 'adherence',
      quality: {
        level: 'high',
        reasons: [],
      },
      score: 7,
    };
  }

  if (
    daysSinceLastWorkout !== null &&
    daysSinceLastWorkout >= 5 &&
    dashboardMetrics.workoutsThisWeek === 0
  ) {
    return {
      id: 'adherence-return',
      text: 'Start now',
      tone: 'neutral',
      source: 'adherence',
      quality: {
        level: 'medium',
        reasons: ['recent_interruption'],
      },
      score: 2,
    };
  }

  if (dashboardMetrics.currentWeeklyStreak >= 2) {
    return {
      id: 'adherence-streak',
      text: `STREAK  ${dashboardMetrics.currentWeeklyStreak} weeks`,
      tone: 'positive',
      source: 'adherence',
      quality: {
        level: 'high',
        reasons: [],
      },
      score: 6,
    };
  }

  return null;
}

function buildFallbackCandidate(
  dashboardMetrics: DashboardMetrics,
): InsightCandidate {
  if (dashboardMetrics.lastCompletedWorkoutAt === null) {
    return {
      id: 'fallback-ready',
      text: 'NEXT SESSION READY',
      tone: 'neutral',
      source: 'fallback',
      quality: buildFallbackQuality(),
      score: 1,
    };
  }

  return {
    id: 'fallback-next',
    text: 'NEXT SESSION READY',
    tone: 'neutral',
    source: 'fallback',
    quality: buildFallbackQuality(),
    score: 1,
  };
}

export function selectHomePrimaryInsight(
  input: HomePrimaryInsightInput,
): HomePrimaryInsight {
  const candidates = [
    buildExerciseCandidate(input.exerciseTrendSummaries),
    buildGoalCandidate(input.goalViewModels),
    buildAdherenceCandidate(input.dashboardMetrics, input.now),
    buildRoutineCandidate(input.routineTrendSummaries),
  ].filter((candidate): candidate is InsightCandidate => candidate !== null);

  const bestCandidate =
    candidates.sort((left, right) => right.score - left.score)[0] ??
    buildFallbackCandidate(input.dashboardMetrics);

  return {
    id: bestCandidate.id,
    text: bestCandidate.text,
    tone: bestCandidate.tone,
    source: bestCandidate.source,
    quality: bestCandidate.quality,
  };
}

function buildHighlightText(summary: ExerciseTrendSummary): string {
  if (summary.signal) {
    return summary.signal;
  }

  if (summary.direction === 'up') {
    return `${summary.exerciseName.toUpperCase()} ↑`;
  }

  if (summary.direction === 'down') {
    return `${summary.exerciseName.toUpperCase()} ↓`;
  }

  return `${summary.exerciseName.toUpperCase()} READY`;
}

export function selectHomeExerciseHighlights(
  summaries: ExerciseTrendSummary[],
): HomeExerciseHighlight[] {
  return summaries
    .filter((summary) => summary.quality.level !== 'low')
    .sort((left, right) => {
      const directionRank = (
        value: ExerciseTrendSummary['direction'],
      ): number => {
        if (value === 'up') {
          return 2;
        }

        if (value === 'steady') {
          return 1;
        }

        return 0;
      };

      return directionRank(right.direction) - directionRank(left.direction);
    })
    .slice(0, 2)
    .map((summary) => ({
      exerciseId: summary.exerciseId,
      exerciseName: summary.exerciseName,
      text: buildHighlightText(summary),
      direction: summary.direction ?? 'steady',
      quality: summary.quality,
    }));
}
