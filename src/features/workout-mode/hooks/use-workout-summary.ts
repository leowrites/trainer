/**
 * Workout summary hook.
 *
 * CALLING SPEC:
 * - `useWorkoutSummary(sessionId)` loads the completed session summary model.
 * - Returns a view model, loading state, and save handlers for effort/fatigue.
 * - Depends on analytics hooks for session history and a small repository for
 *   schedule context plus persisted feedback.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  buildDashboardMetrics,
  useHistoryAnalytics,
  useHistorySessions,
  useHistorySessionDetail,
  type WeightUnit,
} from '@features/analytics';
import { useUserProfile } from '@features/health-tracking';
import { useDatabase } from '@core/database/provider';
import type {
  WorkoutFeedbackMetric,
  WorkoutSummaryViewModel,
} from '../summary-types';
import { buildWorkoutRecordBadges } from '../domain/workout-summary';
import {
  loadWorkoutSummaryMeta,
  saveWorkoutFeedbackLevel,
  type WorkoutSummaryMeta,
} from '../workout-summary-repository';
import {
  applyWorkoutTemplateUpdate,
  loadWorkoutTemplateUpdateState,
  type WorkoutTemplateUpdateState,
} from '../workout-template-update-repository';

function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat('en-CA', {
    maximumFractionDigits: value % 1 === 0 ? 0 : 1,
  }).format(value);
}

function formatWeight(value: number, unit: 'kg' | 'lb'): string {
  return `${formatCompactNumber(value)} ${unit}`;
}

function formatDuration(durationMinutes: number | null): string {
  if (durationMinutes === null) {
    return 'Open session';
  }

  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;

  if (hours === 0) {
    return `${minutes}m`;
  }

  if (minutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${minutes}m`;
}

function formatDateLabel(timestamp: number): string {
  return new Intl.DateTimeFormat('en-CA', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(timestamp);
}

function formatTimeLabel(timestamp: number): string {
  return new Intl.DateTimeFormat('en-CA', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(timestamp);
}

function formatStreakLabel(streak: number): string {
  if (streak === 1) {
    return '1 week streak';
  }

  return `${streak} week streak`;
}

function formatWeeklyProgressLabel(workoutsThisWeek: number): string {
  if (workoutsThisWeek === 1) {
    return '1 workout completed this week';
  }

  return `${workoutsThisWeek} workouts completed this week`;
}

const EMPTY_WORKOUT_SUMMARY_META: WorkoutSummaryMeta = {
  effortLevel: null,
  fatigueLevel: null,
  scheduleContext: null,
};

export function useWorkoutSummary(sessionId: string): {
  isLoading: boolean;
  summary: WorkoutSummaryViewModel | null;
  saveFeedback: (metric: WorkoutFeedbackMetric, value: number) => void;
  applyTemplateUpdate?: () => void;
  isApplyingTemplateUpdate?: boolean;
} {
  const db = useDatabase();
  const { session, isLoading: isSessionLoading } =
    useHistorySessionDetail(sessionId);
  const { allSessions, isLoading: isHistoryLoading } = useHistoryAnalytics();
  const { sessions: historySessions, isLoading: isHistorySessionsLoading } =
    useHistorySessions();
  const { profile } = useUserProfile();
  const [meta, setMeta] = useState<WorkoutSummaryMeta>(
    EMPTY_WORKOUT_SUMMARY_META,
  );
  const [templateUpdate, setTemplateUpdate] =
    useState<WorkoutTemplateUpdateState | null>(null);
  const [isApplyingTemplateUpdate, setIsApplyingTemplateUpdate] =
    useState(false);

  useEffect(() => {
    setMeta(loadWorkoutSummaryMeta(db, sessionId));
    setTemplateUpdate(loadWorkoutTemplateUpdateState(db, sessionId));
  }, [db, sessionId]);

  const saveFeedback = useCallback(
    (metric: WorkoutFeedbackMetric, value: number): void => {
      saveWorkoutFeedbackLevel(db, sessionId, metric, value);
      setMeta((currentMeta) => ({
        ...currentMeta,
        effortLevel: metric === 'effort' ? value : currentMeta.effortLevel,
        fatigueLevel: metric === 'fatigue' ? value : currentMeta.fatigueLevel,
      }));
    },
    [db, sessionId],
  );

  const unit: WeightUnit = profile?.preferredWeightUnit ?? 'kg';
  const recordBadges = useMemo(() => {
    if (!session) {
      return [];
    }

    return buildWorkoutRecordBadges(session, historySessions, unit);
  }, [historySessions, session, unit]);

  const applyTemplateUpdate = useCallback((): void => {
    if (isApplyingTemplateUpdate) {
      return;
    }

    setIsApplyingTemplateUpdate(true);

    try {
      const nextState = applyWorkoutTemplateUpdate(db, sessionId);
      if (nextState) {
        setTemplateUpdate(nextState);
      }
    } finally {
      setIsApplyingTemplateUpdate(false);
    }
  }, [db, isApplyingTemplateUpdate, sessionId]);

  const summary = useMemo((): WorkoutSummaryViewModel | null => {
    if (!session || session.endTime === null) {
      return null;
    }

    const dashboardMetrics = buildDashboardMetrics(allSessions, {
      now: session.endTime,
    });

    return {
      session,
      unit,
      completedAtLabel: formatTimeLabel(session.endTime),
      dateLabel: formatDateLabel(session.endTime),
      durationLabel: formatDuration(session.durationMinutes),
      volumeLabel: formatWeight(session.totalVolume, unit),
      streakLabel: formatStreakLabel(dashboardMetrics.currentWeeklyStreak),
      weeklyProgressLabel: formatWeeklyProgressLabel(
        dashboardMetrics.workoutsThisWeek,
      ),
      recordBadges,
      scheduleContext: meta.scheduleContext,
      effortLevel: meta.effortLevel,
      fatigueLevel: meta.fatigueLevel,
      templateUpdate:
        templateUpdate === null
          ? null
          : {
              routineName: templateUpdate.routineName,
              canApply: templateUpdate.canApply,
              appliedAtLabel:
                templateUpdate.appliedAt === null
                  ? null
                  : formatTimeLabel(templateUpdate.appliedAt),
            },
    };
  }, [allSessions, meta, recordBadges, session, templateUpdate, unit]);

  return {
    isLoading: isSessionLoading || isHistoryLoading || isHistorySessionsLoading,
    summary,
    saveFeedback,
    applyTemplateUpdate,
    isApplyingTemplateUpdate,
  };
}
