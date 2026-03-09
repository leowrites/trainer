import { Model } from '@nozbe/watermelondb';
import { field, relation } from '@nozbe/watermelondb/decorators';
import type { Relation } from '@nozbe/watermelondb';
import type { Exercise } from './exercise';
import type { Routine } from './routine';

/**
 * RoutineExercise model
 *
 * Join table that links a Routine to an Exercise and stores the
 * programmer's intent for that exercise within the routine
 * (target sets and target reps).
 */
export class RoutineExercise extends Model {
  static table = 'routine_exercises';

  @field('routine_id') routineId!: string;
  @field('exercise_id') exerciseId!: string;
  @field('target_sets') targetSets!: number;
  @field('target_reps') targetReps!: number;

  @relation('routines', 'routine_id') routine!: Relation<Routine>;
  @relation('exercises', 'exercise_id') exercise!: Relation<Exercise>;
}
