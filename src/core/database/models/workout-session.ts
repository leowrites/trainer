import { Model } from '@nozbe/watermelondb';
import {
  children,
  date,
  field,
  readonly,
} from '@nozbe/watermelondb/decorators';
import type { Query } from '@nozbe/watermelondb';
import type { WorkoutSet } from './workout-set';

/**
 * WorkoutSession model
 *
 * Represents a single completed (or in-progress) workout.
 * A session belongs to a Routine and contains many WorkoutSets.
 */
export class WorkoutSession extends Model {
  static table = 'workout_sessions';

  @field('routine_id') routineId!: string;
  @readonly @date('start_time') startTime!: Date;
  @date('end_time') endTime!: Date | null;

  @children('workout_sets') workoutSets!: Query<WorkoutSet>;
}
