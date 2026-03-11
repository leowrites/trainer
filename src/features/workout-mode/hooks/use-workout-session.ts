import { useCallback, useEffect, useState } from 'react';

import { useDatabase } from '@core/database/provider';
import type {
  Exercise,
  WorkoutSession,
  WorkoutSet,
} from '@core/database/types';
import { generateId } from '@core/database/utils';

import { useWorkoutStore } from '../store';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface ExerciseGroup {
  exerciseId: string;
  exerciseName: string;
  sets: WorkoutSet[];
}

export interface AddSetInput {
  exerciseId: string;
  weight: number;
  reps: number;
}

export interface UpdateSetInput {
  weight: number;
  reps: number;
}

/** DB row shape returned by the joined sets query. */
interface SetRow extends WorkoutSet {
  exercise_name: string;
}

// ─── Hook ───────────────────────────────────────────────────────────────────────

/**
 * Hook for managing all data within an active workout session.
 *
 * Reads and writes directly against expo-sqlite; never stores persistent data
 * in Zustand. The session state (isWorkoutActive, startTime) lives in
 * useWorkoutStore.
 *
 * @param sessionId - The ID of the active workout_sessions row.
 */
export function useWorkoutSession(sessionId: string): {
  session: WorkoutSession | null;
  exerciseGroups: ExerciseGroup[];
  availableExercises: Exercise[];
  addSet: (input: AddSetInput) => void;
  updateSet: (id: string, input: UpdateSetInput) => void;
  deleteSet: (id: string) => void;
  toggleSetComplete: (id: string) => void;
  finishSession: () => void;
  refresh: () => void;
} {
  const db = useDatabase();
  const { endWorkout } = useWorkoutStore();

  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [exerciseGroups, setExerciseGroups] = useState<ExerciseGroup[]>([]);
  const [availableExercises, setAvailableExercises] = useState<Exercise[]>([]);
  const [refreshKey, setRefreshKey] = useState<number>(0);

  const refresh = useCallback((): void => {
    setRefreshKey((k: number) => k + 1);
  }, []);

  // Load session metadata, grouped sets, and available exercises whenever
  // sessionId or refreshKey changes.
  useEffect(() => {
    // Session row
    const sess = db.getFirstSync<WorkoutSession>(
      'SELECT id, routine_id, schedule_id, snapshot_name, start_time, end_time FROM workout_sessions WHERE id = ? LIMIT 1',
      [sessionId],
    );
    setSession(sess);

    // Sets joined with exercise names, ordered predictably
    const rows = db.getAllSync<SetRow>(
      `SELECT ws.id, ws.session_id, ws.exercise_id, ws.weight, ws.reps,
              ws.is_completed,
              COALESCE(e.name, 'Unknown Exercise') AS exercise_name
       FROM workout_sets ws
       LEFT JOIN exercises e ON ws.exercise_id = e.id
       WHERE ws.session_id = ?
       ORDER BY e.name ASC, ws.rowid ASC`,
      [sessionId],
    );

    // Group sets by exercise
    const groupMap = new Map<string, ExerciseGroup>();
    for (const row of rows) {
      if (!groupMap.has(row.exercise_id)) {
        groupMap.set(row.exercise_id, {
          exerciseId: row.exercise_id,
          exerciseName: row.exercise_name,
          sets: [],
        });
      }
      groupMap.get(row.exercise_id)!.sets.push({
        id: row.id,
        session_id: row.session_id,
        exercise_id: row.exercise_id,
        weight: row.weight,
        reps: row.reps,
        is_completed: row.is_completed,
      });
    }
    setExerciseGroups(Array.from(groupMap.values()));

    // All exercises for the "add exercise" picker
    const exercises = db.getAllSync<Exercise>(
      'SELECT id, name, muscle_group FROM exercises ORDER BY name ASC',
    );
    setAvailableExercises(exercises);
  }, [db, sessionId, refreshKey]);

  /** Insert a new placeholder set for the given exercise. */
  const addSet = useCallback(
    (input: AddSetInput): void => {
      db.runSync(
        'INSERT INTO workout_sets (id, session_id, exercise_id, weight, reps, is_completed) VALUES (?, ?, ?, ?, ?, ?)',
        [
          generateId(),
          sessionId,
          input.exerciseId,
          input.weight,
          input.reps,
          0,
        ],
      );
      refresh();
    },
    [db, sessionId, refresh],
  );

  /** Overwrite weight and reps on an existing set. */
  const updateSet = useCallback(
    (id: string, input: UpdateSetInput): void => {
      db.runSync('UPDATE workout_sets SET weight = ?, reps = ? WHERE id = ?', [
        input.weight,
        input.reps,
        id,
      ]);
      refresh();
    },
    [db, refresh],
  );

  /** Remove a set permanently. */
  const deleteSet = useCallback(
    (id: string): void => {
      db.runSync('DELETE FROM workout_sets WHERE id = ?', [id]);
      refresh();
    },
    [db, refresh],
  );

  /** Flip the is_completed flag for a set. */
  const toggleSetComplete = useCallback(
    (id: string): void => {
      db.runSync(
        'UPDATE workout_sets SET is_completed = CASE WHEN is_completed = 1 THEN 0 ELSE 1 END WHERE id = ?',
        [id],
      );
      refresh();
    },
    [db, refresh],
  );

  /**
   * Stamp the session's end_time and clear Zustand ephemeral state.
   * After this call, isWorkoutActive becomes false.
   */
  const finishSession = useCallback((): void => {
    db.runSync('UPDATE workout_sessions SET end_time = ? WHERE id = ?', [
      Date.now(),
      sessionId,
    ]);
    endWorkout();
  }, [db, sessionId, endWorkout]);

  return {
    session,
    exerciseGroups,
    availableExercises,
    addSet,
    updateSet,
    deleteSet,
    toggleSetComplete,
    finishSession,
    refresh,
  };
}
