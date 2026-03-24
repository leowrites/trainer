import { useCallback, useEffect, useState } from 'react';
import type { SQLiteDatabase } from 'expo-sqlite';

import { useDatabase } from '@core/database/provider';
import type {
  Exercise,
  Routine,
  Schedule,
  ScheduleEntry,
} from '@core/database/types';
import { generateId } from '@core/database/utils';
import { selectNextRoutineId } from '@features/schedule';
import {
  buildRoutineSnapshot,
  loadRoutineExerciseTemplates,
} from '@features/routines';
import type { WorkoutSnapshotInput } from '@features/routines';
import type { ActiveWorkoutSession } from '../types';
import { useWorkoutStore } from '../store';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface NextRoutinePreview {
  routineId: string;
  routineName: string;
  scheduleName: string;
  exerciseCount: number;
  estimatedMinutes: number;
}

interface ExerciseNameRow extends Pick<Exercise, 'id' | 'name'> {}

function loadExerciseNameIndex(
  db: Pick<SQLiteDatabase, 'getAllSync'>,
  exerciseIds: string[],
): Record<string, string> {
  if (exerciseIds.length === 0) {
    return {};
  }

  const exerciseRows = db.getAllSync<ExerciseNameRow>(
    `SELECT id, name
     FROM exercises
     WHERE id IN (${exerciseIds.map(() => '?').join(', ')})`,
    exerciseIds,
  );

  return exerciseRows.reduce<Record<string, string>>((index, exerciseRow) => {
    index[exerciseRow.id] = exerciseRow.name;
    return index;
  }, {});
}

function buildStartedWorkoutSession(
  sessionId: string,
  startedAt: number,
  snapshot: WorkoutSnapshotInput,
  exerciseNamesById: Record<string, string>,
): ActiveWorkoutSession {
  return {
    id: sessionId,
    title: snapshot.snapshotName,
    startTime: startedAt,
    isFreeWorkout: false,
    exercises: snapshot.exercises.map((exercise) => ({
      exerciseId: exercise.exerciseId,
      exerciseName: exerciseNamesById[exercise.exerciseId] ?? 'Exercise',
      restSeconds: exercise.restSeconds ?? null,
      progressionPolicy: exercise.progressionPolicy ?? 'double_progression',
      targetRir: exercise.targetRir ?? null,
      targetSets: exercise.sets?.length ?? null,
      targetReps: exercise.sets?.[0]?.targetRepsMin ?? null,
      targetRepsMin: exercise.sets?.[0]?.targetRepsMin ?? null,
      targetRepsMax: exercise.sets?.[0]?.targetRepsMax ?? null,
      sets:
        exercise.sets?.map((setEntry) => ({
          id: generateId(),
          exerciseId: exercise.exerciseId,
          position: setEntry.position,
          reps: setEntry.targetRepsMin,
          weight: setEntry.plannedWeight ?? 0,
          targetWeight: setEntry.plannedWeight ?? 0,
          isCompleted: false,
          targetSets: exercise.sets?.length ?? null,
          targetReps: setEntry.targetRepsMin,
          targetRepsMin: setEntry.targetRepsMin,
          targetRepsMax: setEntry.targetRepsMax,
          actualRir: null,
          setRole:
            setEntry.setRole ??
            (exercise.progressionPolicy === 'top_set_backoff'
              ? setEntry.position === 0
                ? 'top_set'
                : 'backoff'
              : 'work'),
        })) ?? [],
    })),
  };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Hook that exposes everything the Workout screen needs to start a session:
 *
 * - `nextRoutine`: preview of the routine that would be started (null if no
 *   active schedule or the schedule is empty).
 * - `startWorkoutFromSchedule()`: creates a WorkoutSession with a routine
 *   snapshot and eagerly creates WorkoutSet placeholders; updates ephemeral
 *   Zustand state.
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
      'SELECT id, name, is_active, current_position FROM schedules WHERE is_active = 1 AND is_deleted = 0 LIMIT 1',
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
      'SELECT id, name, notes FROM routines WHERE id = ? AND is_deleted = 0 LIMIT 1',
      [routineId],
    );

    if (!routine) {
      setNextRoutine(null);
      return;
    }

    const routineExercises = loadRoutineExerciseTemplates(db, routineId);
    const exerciseCount = routineExercises.length;
    const totalSets = routineExercises.reduce(
      (sum: number, exercise) => sum + exercise.sets.length,
      0,
    );
    const estimatedMinutes = Math.max(
      20,
      Math.ceil((exerciseCount * 4 + totalSets * 2.5) / 5) * 5,
    );

    setNextRoutine({
      routineId,
      routineName: routine.name,
      scheduleName: activeSchedule.name,
      exerciseCount,
      estimatedMinutes,
    });
  }, [db, refreshKey]);

  const startWorkoutFromSchedule = useCallback((): string | null => {
    let sessionId: string | null = null;
    let startedSession: ActiveWorkoutSession | null = null;

    db.withTransactionSync(() => {
      // Re-fetch the active schedule inside the transaction.
      const activeSchedule = db.getFirstSync<Schedule>(
        'SELECT id, name, is_active, current_position FROM schedules WHERE is_active = 1 AND is_deleted = 0 LIMIT 1',
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
        'SELECT id, name, notes FROM routines WHERE id = ? AND is_deleted = 0 LIMIT 1',
        [routineId],
      );
      if (!routine) return;

      const routineExercises = loadRoutineExerciseTemplates(db, routineId);

      // Build the snapshot — captures routine name + exercises at this instant.
      const snapshot: WorkoutSnapshotInput = buildRoutineSnapshot(
        routine.name,
        routineExercises.map((exercise) => ({
          exerciseId: exercise.exerciseId,
          position: exercise.position,
          restSeconds: exercise.restSeconds,
          progressionPolicy: exercise.progressionPolicy,
          targetRir: exercise.targetRir,
          sets: exercise.sets.map((setEntry) => ({
            position: setEntry.position,
            targetRepsMin: setEntry.targetRepsMin,
            targetRepsMax: setEntry.targetRepsMax,
            plannedWeight: setEntry.plannedWeight,
            setRole: setEntry.setRole,
          })),
        })),
      );
      const startedAt = Date.now();
      const nextSessionId = generateId();
      const exerciseNamesById = loadExerciseNameIndex(
        db,
        snapshot.exercises.map((exercise) => exercise.exerciseId),
      );
      const nextSession = buildStartedWorkoutSession(
        nextSessionId,
        startedAt,
        snapshot,
        exerciseNamesById,
      );

      // Create the workout session with snapshot data.
      sessionId = nextSessionId;
      startedSession = nextSession;
      db.runSync(
        'INSERT INTO workout_sessions (id, routine_id, schedule_id, snapshot_name, start_time, end_time) VALUES (?, ?, ?, ?, ?, ?)',
        [
          sessionId,
          routineId,
          activeSchedule.id,
          snapshot.snapshotName,
          startedAt,
          null,
        ],
      );

      // Eagerly create placeholder WorkoutSets from the snapshot so that
      // routine edits cannot affect this session.
      nextSession.exercises.forEach((exercise, exerciseIndex) => {
        const snapshotExercise = snapshot.exercises[exerciseIndex];

        if (!snapshotExercise) {
          return;
        }

        const sessionExerciseId = generateId();
        db.runSync(
          `INSERT INTO workout_session_exercises (
            id,
            session_id,
            exercise_id,
            position,
            rest_seconds,
            progression_policy,
            target_rir
          ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            sessionExerciseId,
            sessionId,
            exercise.exerciseId,
            snapshotExercise.position,
            exercise.restSeconds ?? null,
            exercise.progressionPolicy ?? 'double_progression',
            exercise.targetRir ?? null,
          ],
        );

        for (const setEntry of exercise.sets) {
          db.runSync(
            `INSERT INTO workout_sets (
              id,
              session_id,
              exercise_id,
              position,
              weight,
              reps,
              is_completed,
              target_sets,
              target_reps,
              target_reps_min,
              target_reps_max,
              set_role
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              setEntry.id,
              sessionId,
              exercise.exerciseId,
              setEntry.position ?? 0,
              setEntry.weight,
              setEntry.reps,
              0,
              exercise.sets.length,
              setEntry.targetRepsMin ?? null,
              setEntry.targetRepsMin ?? null,
              setEntry.targetRepsMax ?? null,
              setEntry.setRole ?? 'work',
            ],
          );
        }
      });
    });

    if (sessionId && startedSession) {
      startWorkout(startedSession);
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
    startWorkout({
      id: sessionId,
      title: 'Free Workout',
      startTime: now,
      isFreeWorkout: true,
      exercises: [],
    });
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
