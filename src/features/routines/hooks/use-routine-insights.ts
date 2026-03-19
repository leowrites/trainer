import { useCallback } from 'react';

import { useDatabase } from '@core/database/provider';

interface ExerciseHistoryRow {
  session_id: string;
  session_name: string | null;
  start_time: number;
  weight: number;
  reps: number;
  is_completed: number;
}

interface RoutineSessionRow {
  session_id: string;
  routine_name: string | null;
  start_time: number;
  end_time: number | null;
  total_volume: number;
  completed_sets: number;
  total_sets: number;
}

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

export interface RoutineProgressSession {
  sessionId: string;
  routineName: string;
  startTime: number;
  endTime: number | null;
  totalVolume: number;
  completedSets: number;
  totalSets: number;
}

export interface RoutineInsight {
  completionCount: number;
  lastPerformedAt: number | null;
  averageVolume: number | null;
  averageDurationMinutes: number | null;
  recentSessions: RoutineProgressSession[];
}

function formatExerciseSetSummary(row: ExerciseHistoryRow): string {
  return `${row.reps} × ${row.weight}`;
}

function formatSessionName(value: string | null): string {
  const trimmedValue = value?.trim() ?? '';
  return trimmedValue === '' ? 'Workout' : trimmedValue;
}

export function useRoutineInsights(): {
  getExerciseInsight: (exerciseId: string) => ExerciseInsight;
  getRoutineInsight: (routineId: string) => RoutineInsight;
} {
  const db = useDatabase();

  const getExerciseInsight = useCallback(
    (exerciseId: string): ExerciseInsight => {
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
    },
    [db],
  );

  const getRoutineInsight = useCallback(
    (routineId: string): RoutineInsight => {
      const rows = db.getAllSync<RoutineSessionRow>(
        `
          SELECT
            ws.id AS session_id,
            COALESCE(r.name, ws.snapshot_name, 'Workout') AS routine_name,
            ws.start_time,
            ws.end_time,
            COALESCE(SUM(CASE WHEN wset.is_completed = 1 THEN wset.weight * wset.reps ELSE 0 END), 0) AS total_volume,
            COALESCE(SUM(CASE WHEN wset.is_completed = 1 THEN 1 ELSE 0 END), 0) AS completed_sets,
            COUNT(wset.id) AS total_sets
          FROM workout_sessions ws
          LEFT JOIN routines r ON r.id = ws.routine_id
          LEFT JOIN workout_sets wset ON wset.session_id = ws.id
          WHERE ws.routine_id = ?
          GROUP BY ws.id, routine_name, ws.start_time, ws.end_time
          ORDER BY ws.start_time DESC
        `,
        [routineId],
      );

      if (rows.length === 0) {
        return {
          completionCount: 0,
          lastPerformedAt: null,
          averageVolume: null,
          averageDurationMinutes: null,
          recentSessions: [],
        };
      }

      const recentSessions = rows.map((row) => ({
        sessionId: row.session_id,
        routineName: formatSessionName(row.routine_name),
        startTime: row.start_time,
        endTime: row.end_time,
        totalVolume: row.total_volume,
        completedSets: row.completed_sets,
        totalSets: row.total_sets,
      }));

      const volumeTotal = recentSessions.reduce(
        (sum, session) => sum + session.totalVolume,
        0,
      );
      const durationValues = recentSessions
        .filter((session) => session.endTime !== null)
        .map((session) =>
          Math.max(
            0,
            Math.round(
              ((session.endTime ?? session.startTime) - session.startTime) /
                60_000,
            ),
          ),
        );
      const durationTotal = durationValues.reduce(
        (sum, value) => sum + value,
        0,
      );

      return {
        completionCount: recentSessions.length,
        lastPerformedAt: recentSessions[0]?.startTime ?? null,
        averageVolume: volumeTotal / recentSessions.length,
        averageDurationMinutes:
          durationValues.length > 0
            ? durationTotal / durationValues.length
            : null,
        recentSessions,
      };
    },
    [db],
  );

  return {
    getExerciseInsight,
    getRoutineInsight,
  };
}
