import { useCallback, useEffect, useState } from 'react';

import { useDatabase } from '@core/database/provider';
import type { Schedule, ScheduleEntry } from '@core/database/types';
import { generateId } from '@core/database/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface NewScheduleInput {
  name: string;
  /** Routine IDs in the desired rotation order (index = position). */
  routineIds: string[];
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * CRUD hook for schedules using expo-sqlite.
 *
 * Returns the current list of all schedules and helpers for creating,
 * updating, activating, reading entries, and deleting them.
 * Re-fetches after mutations.
 */
export function useSchedules(): {
  schedules: Schedule[];
  hasLoaded: boolean;
  refresh: () => void;
  /** Increments on every mutation, useful for invalidating derived state. */
  version: number;
  getScheduleEntries: (scheduleId: string) => ScheduleEntry[];
  createSchedule: (input: NewScheduleInput) => Schedule;
  updateSchedule: (id: string, input: NewScheduleInput) => void;
  setActiveSchedule: (id: string) => void;
  deleteSchedule: (id: string) => void;
} {
  const db = useDatabase();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [refreshKey, setRefreshKey] = useState<number>(0);

  const refresh = useCallback((): void => {
    setRefreshKey((k: number) => k + 1);
  }, []);

  useEffect(() => {
    const rows = db.getAllSync<Schedule>(
      'SELECT id, name, is_active, current_position FROM schedules WHERE is_deleted = 0 ORDER BY name ASC',
    );
    setSchedules(rows);
    setHasLoaded(true);
  }, [db, refreshKey]);

  const getScheduleEntries = useCallback(
    (scheduleId: string): ScheduleEntry[] => {
      return db.getAllSync<ScheduleEntry>(
        'SELECT id, schedule_id, routine_id, position FROM schedule_entries WHERE schedule_id = ? ORDER BY position ASC',
        [scheduleId],
      );
    },
    [db],
  );

  const createSchedule = useCallback(
    (input: NewScheduleInput): Schedule => {
      const id = generateId();
      db.withTransactionSync(() => {
        db.runSync(
          'INSERT INTO schedules (id, name, is_active, current_position, is_deleted) VALUES (?, ?, 0, -1, 0)',
          [id, input.name],
        );
        input.routineIds.forEach((routineId, i) => {
          db.runSync(
            'INSERT INTO schedule_entries (id, schedule_id, routine_id, position) VALUES (?, ?, ?, ?)',
            [generateId(), id, routineId, i],
          );
        });
      });
      refresh();
      return { id, name: input.name, is_active: 0, current_position: -1 };
    },
    [db, refresh],
  );

  const setActiveSchedule = useCallback(
    (id: string): void => {
      db.withTransactionSync(() => {
        // Deactivate all other schedules first.
        db.runSync('UPDATE schedules SET is_active = 0 WHERE id != ?', [id]);
        db.runSync(
          'UPDATE schedules SET is_active = 1 WHERE id = ? AND is_deleted = 0',
          [id],
        );
      });
      refresh();
    },
    [db, refresh],
  );

  const deleteSchedule = useCallback(
    (id: string): void => {
      db.withTransactionSync(() => {
        db.runSync(
          'UPDATE schedules SET is_active = 0, is_deleted = 1 WHERE id = ?',
          [id],
        );
      });
      refresh();
    },
    [db, refresh],
  );

  const updateSchedule = useCallback(
    (id: string, input: NewScheduleInput): void => {
      db.withTransactionSync(() => {
        // NOTE: current_position is reset to -1 so that the next workout
        // always starts from the first entry in the updated rotation order.
        db.runSync(
          'UPDATE schedules SET name = ?, current_position = -1 WHERE id = ? AND is_deleted = 0',
          [input.name, id],
        );
        db.runSync('DELETE FROM schedule_entries WHERE schedule_id = ?', [id]);
        input.routineIds.forEach((routineId, i) => {
          db.runSync(
            'INSERT INTO schedule_entries (id, schedule_id, routine_id, position) VALUES (?, ?, ?, ?)',
            [generateId(), id, routineId, i],
          );
        });
      });
      refresh();
    },
    [db, refresh],
  );

  return {
    schedules,
    hasLoaded,
    refresh,
    version: refreshKey,
    getScheduleEntries,
    createSchedule,
    updateSchedule,
    setActiveSchedule,
    deleteSchedule,
  };
}
