import { Q } from '@nozbe/watermelondb';
import type { Collection } from '@nozbe/watermelondb';
import { useCallback, useEffect, useState } from 'react';

import { useDatabase } from '@core/database/provider';
import type { Routine } from '@core/database/models/routine';
import type { RoutineExercise } from '@core/database/models/routine-exercise';
import type { Schedule } from '@core/database/models/schedule';
import type { ScheduleEntry } from '@core/database/models/schedule-entry';
import type { WorkoutSession } from '@core/database/models/workout-session';
import type { WorkoutSet } from '@core/database/models/workout-set';
import { getNextPosition, selectNextRoutineId } from '@features/schedule';
import { buildRoutineSnapshot } from '@features/routines';
import type { WorkoutSnapshotInput } from '@features/routines';
import { useWorkoutStore } from '../store';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface NextRoutinePreview {
  routineId: string;
  routineName: string;
  scheduleName: string;
}

/** Minimal interface satisfied by RxJS/WatermelonDB subscription objects. */
interface Subscription {
  unsubscribe: () => void;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Builds an array of `prepareCreate` calls for WorkoutSet placeholders derived
 * from a routine snapshot. Calling `db.batch(...preparePlaceholderSets(...))`
 * writes them all in a single SQLite transaction.
 */
function preparePlaceholderSets(
  sessionId: string,
  snapshot: WorkoutSnapshotInput,
  collection: Collection<WorkoutSet>,
): WorkoutSet[] {
  return snapshot.exercises.flatMap((exercise) =>
    Array.from({ length: exercise.targetSets }, () =>
      collection.prepareCreate((record) => {
        record.sessionId = sessionId;
        record.exerciseId = exercise.exerciseId;
        record.weight = 0;
        record.reps = exercise.targetReps;
        record.isCompleted = false;
      }),
    ),
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Hook that exposes everything the Workout screen needs to start a session:
 *
 * - `nextRoutine`: preview of the routine that would be started (null if no
 *   active schedule or the schedule is empty).
 * - `startWorkoutFromSchedule()`: creates a WorkoutSession with a routine
 *   snapshot and eagerly creates WorkoutSet placeholders; advances the
 *   schedule's `currentPosition`; updates ephemeral Zustand state.
 * - `startFreeWorkout()`: creates a session without a routine/schedule.
 */
export function useWorkoutStarter(): {
  nextRoutine: NextRoutinePreview | null;
  startWorkoutFromSchedule: () => Promise<string | null>;
  startFreeWorkout: () => Promise<string>;
} {
  const db = useDatabase();
  const { startWorkout } = useWorkoutStore();
  const [nextRoutine, setNextRoutine] = useState<NextRoutinePreview | null>(
    null,
  );

  // Reactively observe both the active schedule AND its entries so that any
  // change (activating a different schedule, adding/removing/reordering entries)
  // immediately updates the next-routine preview.
  useEffect(() => {
    // Inner subscription reference — recreated whenever the active schedule changes.
    let entriesSubscription: Subscription | null = null;

    const updatePreview = async (
      schedule: Schedule,
      entries: ScheduleEntry[],
    ): Promise<void> => {
      try {
        const routineId = selectNextRoutineId(
          entries.map((e) => ({
            position: e.position,
            routineId: e.routineId,
          })),
          schedule.currentPosition,
        );

        if (!routineId) {
          setNextRoutine(null);
          return;
        }

        const routine = await db.collections
          .get<Routine>('routines')
          .find(routineId);
        setNextRoutine({
          routineId,
          routineName: routine.name,
          scheduleName: schedule.name,
        });
      } catch {
        setNextRoutine(null);
      }
    };

    const scheduleSubscription = db.collections
      .get<Schedule>('schedules')
      .query(Q.where('is_active', true))
      .observe()
      .subscribe((activeSchedules) => {
        // Tear down the previous entries subscription before re-subscribing.
        entriesSubscription?.unsubscribe();
        entriesSubscription = null;

        if (activeSchedules.length === 0) {
          setNextRoutine(null);
          return;
        }

        const schedule = activeSchedules[0];

        // Subscribe to the active schedule's entries so any add/remove/reorder
        // also triggers a preview refresh.
        entriesSubscription = db.collections
          .get<ScheduleEntry>('schedule_entries')
          .query(Q.where('schedule_id', schedule.id))
          .observe()
          .subscribe((entries) => {
            void updatePreview(schedule, entries);
          });
      });

    return () => {
      scheduleSubscription.unsubscribe();
      entriesSubscription?.unsubscribe();
    };
  }, [db]);

  const startWorkoutFromSchedule = useCallback(async (): Promise<
    string | null
  > => {
    return db.write(async () => {
      // Re-fetch the active schedule inside the write transaction.
      const activeSchedules = await db.collections
        .get<Schedule>('schedules')
        .query(Q.where('is_active', true))
        .fetch();

      if (activeSchedules.length === 0) return null;
      const schedule = activeSchedules[0];

      const entries = await db.collections
        .get<ScheduleEntry>('schedule_entries')
        .query(Q.where('schedule_id', schedule.id))
        .fetch();

      const routineId = selectNextRoutineId(
        entries.map((e) => ({ position: e.position, routineId: e.routineId })),
        schedule.currentPosition,
      );
      if (!routineId) return null;

      const routine = await db.collections
        .get<Routine>('routines')
        .find(routineId);

      const routineExercises = await db.collections
        .get<RoutineExercise>('routine_exercises')
        .query(Q.where('routine_id', routineId))
        .fetch();

      // Build the snapshot — captures routine name + exercises at this instant.
      const snapshot = buildRoutineSnapshot(
        routine.name,
        routineExercises.map((re) => ({
          exerciseId: re.exerciseId,
          position: re.position,
          targetSets: re.targetSets,
          targetReps: re.targetReps,
        })),
      );

      // Create the workout session with the snapshot data.
      const session = await db.collections
        .get<WorkoutSession>('workout_sessions')
        .create((record) => {
          record.routineId = routineId;
          record.scheduleId = schedule.id;
          record.snapshotName = snapshot.snapshotName;
          record.startTime = new Date();
          record.endTime = null;
        });

      // Eagerly batch-create placeholder WorkoutSets from the snapshot so that
      // routine edits cannot affect this session.
      const preparedSets = preparePlaceholderSets(
        session.id,
        snapshot,
        db.collections.get<WorkoutSet>('workout_sets'),
      );

      if (preparedSets.length > 0) {
        await db.batch(...preparedSets);
      }

      // Advance the schedule's position so the next call picks the next routine.
      const nextPos = getNextPosition(schedule.currentPosition, entries.length);
      await schedule.update((record) => {
        record.currentPosition = nextPos;
      });

      // Sync ephemeral Zustand state.
      startWorkout(session.id);
      return session.id;
    });
  }, [db, startWorkout]);

  const startFreeWorkout = useCallback(async (): Promise<string> => {
    return db.write(async () => {
      const session = await db.collections
        .get<WorkoutSession>('workout_sessions')
        .create((record) => {
          record.routineId = null;
          record.scheduleId = null;
          record.snapshotName = null;
          record.startTime = new Date();
          record.endTime = null;
        });
      startWorkout(session.id);
      return session.id;
    });
  }, [db, startWorkout]);

  return { nextRoutine, startWorkoutFromSchedule, startFreeWorkout };
}
