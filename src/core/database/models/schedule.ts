import { Model } from '@nozbe/watermelondb';
import { children, field } from '@nozbe/watermelondb/decorators';
import type { Query } from '@nozbe/watermelondb';
import type { ScheduleEntry } from './schedule-entry';

/**
 * Schedule model
 *
 * A named, ordered list of routines that rotate automatically.
 * Only one schedule should be marked active at a time.
 * `currentPosition` is a zero-based index of the *last used* entry
 * (starts at -1 when no workout has been performed yet).
 */
export class Schedule extends Model {
  static table = 'schedules';

  @field('name') name!: string;
  @field('is_active') isActive!: boolean;
  @field('current_position') currentPosition!: number;

  @children('schedule_entries') scheduleEntries!: Query<ScheduleEntry>;
}
