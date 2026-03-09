import { Model } from '@nozbe/watermelondb';
import { field, relation } from '@nozbe/watermelondb/decorators';
import type { Relation } from '@nozbe/watermelondb';
import type { Routine } from './routine';
import type { Schedule } from './schedule';

/**
 * ScheduleEntry model
 *
 * One slot in a Schedule's rotation order.
 * `position` determines the 0-based order in which routines are queued
 * (e.g., position 0 → Push A, position 1 → Pull A, position 2 → Push B).
 */
export class ScheduleEntry extends Model {
  static table = 'schedule_entries';

  @field('schedule_id') scheduleId!: string;
  @field('routine_id') routineId!: string;
  @field('position') position!: number;

  @relation('schedules', 'schedule_id') schedule!: Relation<Schedule>;
  @relation('routines', 'routine_id') routine!: Relation<Routine>;
}
