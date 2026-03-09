import { Model } from '@nozbe/watermelondb';
import { field, relation } from '@nozbe/watermelondb/decorators';
import type { Relation } from '@nozbe/watermelondb';
import type { Exercise } from './exercise';
import type { WorkoutSession } from './workout-session';

/**
 * WorkoutSet model
 *
 * Represents a single logged set within a WorkoutSession.
 * Stores the actual weight lifted, reps performed, and completion status.
 */
export class WorkoutSet extends Model {
  static table = 'workout_sets';

  @field('session_id') sessionId!: string;
  @field('exercise_id') exerciseId!: string;
  @field('weight') weight!: number;
  @field('reps') reps!: number;
  @field('is_completed') isCompleted!: boolean;

  @relation('workout_sessions', 'session_id')
  session!: Relation<WorkoutSession>;
  @relation('exercises', 'exercise_id') exercise!: Relation<Exercise>;
}
