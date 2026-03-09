import { Model } from '@nozbe/watermelondb';
import { children, field } from '@nozbe/watermelondb/decorators';
import type { Query } from '@nozbe/watermelondb';
import type { RoutineExercise } from './routine-exercise';

/**
 * Routine model
 *
 * A named collection of exercises that the user performs together
 * (e.g. "Push Day A", "Pull Day B").
 */
export class Routine extends Model {
  static table = 'routines';

  @field('name') name!: string;
  @field('notes') notes!: string | null;

  @children('routine_exercises') routineExercises!: Query<RoutineExercise>;
}
