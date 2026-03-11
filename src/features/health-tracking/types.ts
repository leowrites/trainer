/**
 * Input types for health-tracking mutations.
 *
 * These are separate from the database entity interfaces in
 * @core/database/types so callers don't need to supply generated fields (id).
 */

export interface NewBodyWeightInput {
  /** ISO date string: YYYY-MM-DD */
  date: string;
  weight_kg: number;
}

export interface UpdateBodyWeightInput {
  date?: string;
  weight_kg?: number;
}

export interface NewStepCountInput {
  /** ISO date string: YYYY-MM-DD */
  date: string;
  step_count: number;
}

export interface UpdateStepCountInput {
  date?: string;
  step_count?: number;
}

export interface NewActivityInput {
  /** ISO date string: YYYY-MM-DD */
  date: string;
  activity_type: string;
  duration_minutes: number;
  notes?: string;
}

export interface UpdateActivityInput {
  date?: string;
  activity_type?: string;
  duration_minutes?: number;
  notes?: string | null;
}
