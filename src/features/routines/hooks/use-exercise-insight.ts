/**
 * Exercise insight hook.
 *
 * CALLING SPEC:
 * - `useExerciseInsight(exerciseId)` loads one exercise history insight model.
 * - Returns `insight`, `isLoading`, and `refresh()`.
 * - Side effects: SQLite reads only.
 */

import { useCallback, useEffect, useState } from 'react';

import { useDatabase } from '@core/database/provider';

export interface ExerciseHistorySession {
  sessionId: string;
  sessionName: string;
  startTime: number;
  bestCompletedWeight: number | null;
  completedSets: number;
  totalSets: number;
  setSummary: string;
}

export interface ExerciseInsight {
  totalSessions: number;
  lastPerformedAt: number | null;
  bestCompletedWeight: number | null;
  history: ExerciseHistorySession[];
}

interface ExerciseHistoryRow {
  session_id: string;
  session_name: string | null;
  start_time: number;
  weight: number;
  reps: number;
  is_completed: number;
}

function formatExerciseSetSummary(row: ExerciseHistoryRow): string {
  return `${row.reps} × ${row.weight}`;
}

function formatSessionName(value: string | null): string {
  const trimmedValue = value?.trim() ?? '';
  return trimmedValue === '' ? 'Workout' : trimmedValue;
}

function buildEmptyExerciseInsight(): ExerciseInsight {
  return {
    totalSessions: 0,
    lastPerformedAt: null,
    bestCompletedWeight: null,
    history: [],
  };
}

function loadExerciseInsight(
  db: ReturnType<typeof useDatabase>,
  exerciseId: string,
): ExerciseInsight {
  const rows = db.getAllSync<ExerciseHistoryRow>(
    `
      SELECT
        ws.id AS session_id,
        COALESCE(r.name, ws.snapshot_name, 'Workout') AS session_name,
        ws.start_time,
        wset.weight,
        wset.reps,
        wset.is_completed
      FROM workout_sets wset
      INNER JOIN workout_sessions ws ON ws.id = wset.session_id
      LEFT JOIN routines r ON r.id = ws.routine_id
      WHERE wset.exercise_id = ?
      ORDER BY ws.start_time DESC, wset.rowid ASC
    `,
    [exerciseId],
  );

  const groupedSessions = new Map<string, ExerciseHistorySession>();
  let bestCompletedWeight: number | null = null;

  rows.forEach((row) => {
    if (row.is_completed === 1) {
      bestCompletedWeight =
        bestCompletedWeight === null
          ? row.weight
          : Math.max(bestCompletedWeight, row.weight);
    }

    const existingSession = groupedSessions.get(row.session_id);
    const nextSetSummary = formatExerciseSetSummary(row);

    if (existingSession) {
      existingSession.totalSets += 1;
      existingSession.completedSets += row.is_completed === 1 ? 1 : 0;
      existingSession.setSummary = `${existingSession.setSummary} • ${nextSetSummary}`;

      if (row.is_completed === 1) {
        existingSession.bestCompletedWeight = Math.max(
          existingSession.bestCompletedWeight ?? row.weight,
          row.weight,
        );
      }

      return;
    }

    groupedSessions.set(row.session_id, {
      sessionId: row.session_id,
      sessionName: formatSessionName(row.session_name),
      startTime: row.start_time,
      bestCompletedWeight: row.is_completed === 1 ? row.weight : null,
      completedSets: row.is_completed === 1 ? 1 : 0,
      totalSets: 1,
      setSummary: nextSetSummary,
    });
  });

  const history = [...groupedSessions.values()];

  return {
    totalSessions: history.length,
    lastPerformedAt: history[0]?.startTime ?? null,
    bestCompletedWeight,
    history,
  };
}

export interface UseExerciseInsightResult {
  insight: ExerciseInsight;
  isLoading: boolean;
  refresh: () => void;
}

export function useExerciseInsight(
  exerciseId: string | null | undefined,
): UseExerciseInsightResult {
  const db = useDatabase();
  const [insight, setInsight] = useState<ExerciseInsight>(
    buildEmptyExerciseInsight(),
  );
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback((): void => {
    setRefreshKey((current) => current + 1);
  }, []);

  useEffect(() => {
    if (!exerciseId) {
      setInsight(buildEmptyExerciseInsight());
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setInsight(loadExerciseInsight(db, exerciseId));
    setIsLoading(false);
  }, [db, exerciseId, refreshKey]);

  return {
    insight,
    isLoading,
    refresh,
  };
}
