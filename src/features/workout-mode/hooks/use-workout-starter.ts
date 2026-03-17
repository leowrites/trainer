import { useCallback, useEffect, useState } from 'react';

import { useDatabase } from '@core/database/provider';
import type {
  Routine,
  RoutineExercise,
  Schedule,
  ScheduleEntry,
} from '@core/database/types';
import { generateId } from '@core/database/utils';
import { getNextPosition, selectNextRoutineId } from '@features/schedule';
import { buildRoutineSnapshot } from '@features/routines';
import type { WorkoutSnapshotInput } from '@features/routines';
import { loadActiveWorkoutSession } from '../session-repository';
import { useWorkoutStore } from '../store';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface NextRoutinePreview {
  routineId: string;
  routineName: string;
  scheduleName: string;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Hook that exposes everything the Workout screen needs to start a session:
 *
 * - `nextRoutine`: preview of the routine that would be started (null if no
 *   active schedule or the schedule is empty).
 * - `startWorkoutFromSchedule()`: creates a WorkoutSession with a routine
 *   snapshot and eagerly creates WorkoutSet placeholders; advances the
 *   schedule's `current_position`; updates ephemeral Zustand state.
 * - `startFreeWorkout()`: creates a session without a routine/schedule.
 * - `refreshPreview()`: manually refreshes the next-routine preview (call
 *   after schedule changes).
 */
export function useWorkoutStarter(): {
  nextRoutine: NextRoutinePreview | null;
  startWorkoutFromSchedule: () => string | null;
  startFreeWorkout: () => string;
  refreshPreview: () => void;
} {
  const db = useDatabase();
  const { startWorkout } = useWorkoutStore();
  const [nextRoutine, setNextRoutine] = useState<NextRoutinePreview | null>(
    null,
  );
  const [refreshKey, setRefreshKey] = useState<number>(0);

  const refreshPreview = useCallback((): void => {
    setRefreshKey((k: number) => k + 1);
  }, []);

  // Compute the next-routine preview from the active schedule whenever
  // the db reference or refreshKey changes.
  useEffect(() => {
    const activeSchedule = db.getFirstSync<Schedule>(
      'SELECT id, name, is_active, current_position FROM schedules WHERE is_active = 1 LIMIT 1',
    );

    if (!activeSchedule) {
      setNextRoutine(null);
      return;
    }

    const entries = db.getAllSync<ScheduleEntry>(
      'SELECT id, schedule_id, routine_id, position FROM schedule_entries WHERE schedule_id = ? ORDER BY position ASC',
      [activeSchedule.id],
    );

    const routineId = selectNextRoutineId(
      entries.map((e: ScheduleEntry) => ({
        position: e.position,
        routineId: e.routine_id,
      })),
      activeSchedule.current_position,
    );

    if (!routineId) {
      setNextRoutine(null);
      return;
    }

    const routine = db.getFirstSync<Routine>(
      'SELECT id, name, notes FROM routines WHERE id = ? LIMIT 1',
      [routineId],
    );

    if (!routine) {
      setNextRoutine(null);
      return;
    }

    setNextRoutine({
      routineId,
      routineName: routine.name,
      scheduleName: activeSchedule.name,
    });
  }, [db, refreshKey]);

  const startWorkoutFromSchedule = useCallback((): string | null => {
    let sessionId: string | null = null;

    db.withTransactionSync(() => {
      // Re-fetch the active schedule inside the transaction.
      const activeSchedule = db.getFirstSync<Schedule>(
        'SELECT id, name, is_active, current_position FROM schedules WHERE is_active = 1 LIMIT 1',
      );
      if (!activeSchedule) return;

      const entries = db.getAllSync<ScheduleEntry>(
        'SELECT id, schedule_id, routine_id, position FROM schedule_entries WHERE schedule_id = ? ORDER BY position ASC',
        [activeSchedule.id],
      );

      const routineId = selectNextRoutineId(
        entries.map((e: ScheduleEntry) => ({
          position: e.position,
          routineId: e.routine_id,
        })),
        activeSchedule.current_position,
      );
      if (!routineId) return;

      const routine = db.getFirstSync<Routine>(
        'SELECT id, name, notes FROM routines WHERE id = ? LIMIT 1',
        [routineId],
      );
      if (!routine) return;

      const routineExercises = db.getAllSync<RoutineExercise>(
        'SELECT id, routine_id, exercise_id, position, target_sets, target_reps FROM routine_exercises WHERE routine_id = ?',
        [routineId],
      );

      // Build the snapshot — captures routine name + exercises at this instant.
      const snapshot: WorkoutSnapshotInput = buildRoutineSnapshot(
        routine.name,
        routineExercises.map((re: RoutineExercise) => ({
          exerciseId: re.exercise_id,
          position: re.position,
          targetSets: re.target_sets,
          targetReps: re.target_reps,
        })),
      );

      // Create the workout session with snapshot data.
      sessionId = generateId();
      const now = Date.now();
      db.runSync(
        'INSERT INTO workout_sessions (id, routine_id, schedule_id, snapshot_name, start_time, end_time) VALUES (?, ?, ?, ?, ?, ?)',
        [
          sessionId,
          routineId,
          activeSchedule.id,
          snapshot.snapshotName,
          now,
          null,
        ],
      );

      // Eagerly create placeholder WorkoutSets from the snapshot so that
      // routine edits cannot affect this session.
      for (const exercise of snapshot.exercises) {
        for (let i = 0; i < exercise.targetSets; i++) {
          db.runSync(
            'INSERT INTO workout_sets (id, session_id, exercise_id, weight, reps, is_completed) VALUES (?, ?, ?, ?, ?, ?)',
            [
              generateId(),
              sessionId,
              exercise.exerciseId,
              0,
              exercise.targetReps,
              0,
            ],
          );
        }
      }

      // Advance the schedule's position so the next call picks the next routine.
      const nextPos = getNextPosition(
        activeSchedule.current_position,
        entries.length,
      );
      db.runSync('UPDATE schedules SET current_position = ? WHERE id = ?', [
        nextPos,
        activeSchedule.id,
      ]);
    });

    if (sessionId) {
      const activeSession = loadActiveWorkoutSession(db, sessionId);
      if (activeSession) {
        startWorkout(activeSession);
      }
      refreshPreview();
    }

    return sessionId;
  }, [db, startWorkout, refreshPreview]);

  const startFreeWorkout = useCallback((): string => {
    const sessionId = generateId();
    const now = Date.now();
    db.runSync(
      'INSERT INTO workout_sessions (id, routine_id, schedule_id, snapshot_name, start_time, end_time) VALUES (?, ?, ?, ?, ?, ?)',
      [sessionId, null, null, null, now, null],
    );
    const activeSession = loadActiveWorkoutSession(db, sessionId);
    if (activeSession) {
      startWorkout(activeSession);
    }
    return sessionId;
  }, [db, startWorkout]);

  return {
    nextRoutine,
    startWorkoutFromSchedule,
    startFreeWorkout,
    refreshPreview,
  };
}

// Keep backward-compatible type alias used in workout-screen.tsx
export type { NextRoutinePreview as WorkoutStarterNextRoutine };
