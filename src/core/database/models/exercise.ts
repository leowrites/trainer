import { Model } from '@nozbe/watermelondb';
import { field } from '@nozbe/watermelondb/decorators';

/**
 * Exercise model
 *
 * Represents a single exercise definition (e.g. "Barbell Bench Press").
 * Exercises are user-created and reusable across many routines.
 */
export class Exercise extends Model {
  static table = 'exercises';

  @field('name') name!: string;
  @field('muscle_group') muscleGroup!: string;
}
