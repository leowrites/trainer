import { Q } from '@nozbe/watermelondb';
import { useCallback, useEffect, useState } from 'react';

import { useDatabase } from '@core/database/provider';
import type { Schedule } from '@core/database/models/schedule';
import type { ScheduleEntry } from '@core/database/models/schedule-entry';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface NewScheduleInput {
  name: string;
  /** Routine IDs in the desired rotation order (index = position). */
  routineIds: string[];
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Reactive CRUD hook for schedules.
 *
 * Returns a live-updating list of all schedules and helpers for creating,
 * activating, reading entries, and deleting them.
 */
export function useSchedules(): {
  schedules: Schedule[];
  getScheduleEntries: (scheduleId: string) => Promise<ScheduleEntry[]>;
  createSchedule: (input: NewScheduleInput) => Promise<Schedule>;
  setActiveSchedule: (id: string) => Promise<void>;
  deleteSchedule: (id: string) => Promise<void>;
} {
  const db = useDatabase();
  const [schedules, setSchedules] = useState<Schedule[]>([]);

  useEffect(() => {
    const subscription = db.collections
      .get<Schedule>('schedules')
      .query()
      .observe()
      .subscribe(setSchedules);
    return () => subscription.unsubscribe();
  }, [db]);

  const getScheduleEntries = useCallback(
    async (scheduleId: string): Promise<ScheduleEntry[]> => {
      return db.collections
        .get<ScheduleEntry>('schedule_entries')
        .query(Q.where('schedule_id', scheduleId), Q.sortBy('position', Q.asc))
        .fetch();
    },
    [db],
  );

  const createSchedule = useCallback(
    async (input: NewScheduleInput): Promise<Schedule> => {
      return db.write(async () => {
        const schedule = await db.collections
          .get<Schedule>('schedules')
          .create((record) => {
            record.name = input.name;
            record.isActive = false;
            record.currentPosition = -1;
          });

        for (let i = 0; i < input.routineIds.length; i++) {
          await db.collections
            .get<ScheduleEntry>('schedule_entries')
            .create((record) => {
              record.scheduleId = schedule.id;
              record.routineId = input.routineIds[i];
              record.position = i;
            });
        }

        return schedule;
      });
    },
    [db],
  );

  const setActiveSchedule = useCallback(
    async (id: string): Promise<void> => {
      await db.write(async () => {
        // Deactivate all other schedules first.
        const allSchedules = await db.collections
          .get<Schedule>('schedules')
          .query()
          .fetch();
        await Promise.all(
          allSchedules
            .filter((s) => s.id !== id && s.isActive)
            .map((s) => s.update((record) => (record.isActive = false))),
        );
        const target = await db.collections.get<Schedule>('schedules').find(id);
        await target.update((record) => (record.isActive = true));
      });
    },
    [db],
  );

  const deleteSchedule = useCallback(
    async (id: string): Promise<void> => {
      await db.write(async () => {
        const schedule = await db.collections
          .get<Schedule>('schedules')
          .find(id);
        const entries = await db.collections
          .get<ScheduleEntry>('schedule_entries')
          .query(Q.where('schedule_id', id))
          .fetch();
        await Promise.all(entries.map((e) => e.destroyPermanently()));
        await schedule.destroyPermanently();
      });
    },
    [db],
  );

  return {
    schedules,
    getScheduleEntries,
    createSchedule,
    setActiveSchedule,
    deleteSchedule,
  };
}
