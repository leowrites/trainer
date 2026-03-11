import { useCallback, useEffect, useState } from 'react';

import { useDatabase } from '@core/database/provider';
import type {
  ActivityLog,
  BodyWeightLog,
  StepCountLog,
} from '@core/database/types';
import { generateId } from '@core/database/utils';

import type {
  NewActivityInput,
  NewBodyWeightInput,
  NewStepCountInput,
  UpdateActivityInput,
  UpdateBodyWeightInput,
  UpdateStepCountInput,
} from '../types';

// ─── Hook return type ─────────────────────────────────────────────────────────

export interface UseHealthTrackingReturn {
  // ── Body weight ────────────────────────────────────────────────────────────
  bodyWeightLogs: BodyWeightLog[];
  createBodyWeightLog: (input: NewBodyWeightInput) => BodyWeightLog;
  updateBodyWeightLog: (id: string, input: UpdateBodyWeightInput) => void;
  deleteBodyWeightLog: (id: string) => void;

  // ── Step count ─────────────────────────────────────────────────────────────
  stepCountLogs: StepCountLog[];
  createStepCountLog: (input: NewStepCountInput) => StepCountLog;
  updateStepCountLog: (id: string, input: UpdateStepCountInput) => void;
  deleteStepCountLog: (id: string) => void;

  // ── Activities ─────────────────────────────────────────────────────────────
  activityLogs: ActivityLog[];
  createActivityLog: (input: NewActivityInput) => ActivityLog;
  updateActivityLog: (id: string, input: UpdateActivityInput) => void;
  deleteActivityLog: (id: string) => void;

  // ── Utility ────────────────────────────────────────────────────────────────
  refresh: () => void;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * CRUD hook for holistic health tracking using expo-sqlite.
 *
 * Manages body weight logs, daily step count logs, and miscellaneous
 * activity logs. Re-fetches all lists after any mutation.
 */
export function useHealthTracking(): UseHealthTrackingReturn {
  const db = useDatabase();
  const [refreshKey, setRefreshKey] = useState<number>(0);
  const [bodyWeightLogs, setBodyWeightLogs] = useState<BodyWeightLog[]>([]);
  const [stepCountLogs, setStepCountLogs] = useState<StepCountLog[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);

  const refresh = useCallback((): void => {
    setRefreshKey((k) => k + 1);
  }, []);

  useEffect(() => {
    setBodyWeightLogs(
      db.getAllSync<BodyWeightLog>(
        'SELECT id, date, weight_kg FROM body_weight_logs ORDER BY date DESC',
      ),
    );
    setStepCountLogs(
      db.getAllSync<StepCountLog>(
        'SELECT id, date, step_count FROM step_count_logs ORDER BY date DESC',
      ),
    );
    setActivityLogs(
      db.getAllSync<ActivityLog>(
        'SELECT id, date, activity_type, duration_minutes, notes FROM activity_logs ORDER BY date DESC',
      ),
    );
  }, [db, refreshKey]);

  // ─── Body weight ──────────────────────────────────────────────────────────

  const createBodyWeightLog = useCallback(
    (input: NewBodyWeightInput): BodyWeightLog => {
      const id = generateId();
      db.runSync(
        'INSERT INTO body_weight_logs (id, date, weight_kg) VALUES (?, ?, ?)',
        [id, input.date, input.weight_kg],
      );
      refresh();
      return { id, date: input.date, weight_kg: input.weight_kg };
    },
    [db, refresh],
  );

  const updateBodyWeightLog = useCallback(
    (id: string, input: UpdateBodyWeightInput): void => {
      db.withTransactionSync(() => {
        if (input.date !== undefined) {
          db.runSync('UPDATE body_weight_logs SET date = ? WHERE id = ?', [
            input.date,
            id,
          ]);
        }
        if (input.weight_kg !== undefined) {
          db.runSync('UPDATE body_weight_logs SET weight_kg = ? WHERE id = ?', [
            input.weight_kg,
            id,
          ]);
        }
      });
      refresh();
    },
    [db, refresh],
  );

  const deleteBodyWeightLog = useCallback(
    (id: string): void => {
      db.runSync('DELETE FROM body_weight_logs WHERE id = ?', [id]);
      refresh();
    },
    [db, refresh],
  );

  // ─── Step count ───────────────────────────────────────────────────────────

  const createStepCountLog = useCallback(
    (input: NewStepCountInput): StepCountLog => {
      const id = generateId();
      db.runSync(
        'INSERT INTO step_count_logs (id, date, step_count) VALUES (?, ?, ?)',
        [id, input.date, input.step_count],
      );
      refresh();
      return { id, date: input.date, step_count: input.step_count };
    },
    [db, refresh],
  );

  const updateStepCountLog = useCallback(
    (id: string, input: UpdateStepCountInput): void => {
      db.withTransactionSync(() => {
        if (input.date !== undefined) {
          db.runSync('UPDATE step_count_logs SET date = ? WHERE id = ?', [
            input.date,
            id,
          ]);
        }
        if (input.step_count !== undefined) {
          db.runSync('UPDATE step_count_logs SET step_count = ? WHERE id = ?', [
            input.step_count,
            id,
          ]);
        }
      });
      refresh();
    },
    [db, refresh],
  );

  const deleteStepCountLog = useCallback(
    (id: string): void => {
      db.runSync('DELETE FROM step_count_logs WHERE id = ?', [id]);
      refresh();
    },
    [db, refresh],
  );

  // ─── Activity logs ────────────────────────────────────────────────────────

  const createActivityLog = useCallback(
    (input: NewActivityInput): ActivityLog => {
      const id = generateId();
      db.runSync(
        'INSERT INTO activity_logs (id, date, activity_type, duration_minutes, notes) VALUES (?, ?, ?, ?, ?)',
        [
          id,
          input.date,
          input.activity_type,
          input.duration_minutes,
          input.notes ?? null,
        ],
      );
      refresh();
      return {
        id,
        date: input.date,
        activity_type: input.activity_type,
        duration_minutes: input.duration_minutes,
        notes: input.notes ?? null,
      };
    },
    [db, refresh],
  );

  const updateActivityLog = useCallback(
    (id: string, input: UpdateActivityInput): void => {
      db.withTransactionSync(() => {
        if (input.date !== undefined) {
          db.runSync('UPDATE activity_logs SET date = ? WHERE id = ?', [
            input.date,
            id,
          ]);
        }
        if (input.activity_type !== undefined) {
          db.runSync(
            'UPDATE activity_logs SET activity_type = ? WHERE id = ?',
            [input.activity_type, id],
          );
        }
        if (input.duration_minutes !== undefined) {
          db.runSync(
            'UPDATE activity_logs SET duration_minutes = ? WHERE id = ?',
            [input.duration_minutes, id],
          );
        }
        if (input.notes !== undefined) {
          db.runSync('UPDATE activity_logs SET notes = ? WHERE id = ?', [
            input.notes,
            id,
          ]);
        }
      });
      refresh();
    },
    [db, refresh],
  );

  const deleteActivityLog = useCallback(
    (id: string): void => {
      db.runSync('DELETE FROM activity_logs WHERE id = ?', [id]);
      refresh();
    },
    [db, refresh],
  );

  return {
    bodyWeightLogs,
    createBodyWeightLog,
    updateBodyWeightLog,
    deleteBodyWeightLog,
    stepCountLogs,
    createStepCountLog,
    updateStepCountLog,
    deleteStepCountLog,
    activityLogs,
    createActivityLog,
    updateActivityLog,
    deleteActivityLog,
    refresh,
  };
}
