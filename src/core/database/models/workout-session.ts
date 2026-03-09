import { Model } from '@nozbe/watermelondb';
import {
  children,
  date,
  field,
  relation,
} from '@nozbe/watermelondb/decorators';
import type { Query, Relation } from '@nozbe/watermelondb';
import type { Routine } from './routine';
import type { WorkoutSet } from './workout-set';

/**
 * WorkoutSession model
 *
 * Represents a single completed (or in-progress) workout.
 * A session optionally belongs to a Routine and contains many WorkoutSets.
 */
export class WorkoutSession extends Model {
  static table = 'workout_sessions';

  @field('routine_id') routineId!: string | null;
  @date('start_time') startTime!: Date;
  @date('end_time') endTime!: Date | null;

  @relation('routines', 'routine_id') routine!: Relation<Routine>;
  @children('workout_sets') workoutSets!: Query<WorkoutSet>;
}
