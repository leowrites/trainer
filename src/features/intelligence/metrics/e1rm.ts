/**
 * Estimated 1RM helpers.
 *
 * CALLING SPEC:
 * - `estimateOneRepMax(weight, reps, mode)` returns a derived 1RM estimate or
 *   `null` when the exercise should not use strength estimation.
 * - Epley is the default estimator for v1 and stays behind this interface.
 * - Side effects: none.
 */

import type { StrengthEstimationMode } from '../types';

export function estimateOneRepMax(
  weight: number,
  reps: number,
  mode: StrengthEstimationMode,
): number | null {
  if (mode === 'disabled' || weight <= 0 || reps <= 0 || reps > 10) {
    return null;
  }

  return weight * (1 + reps / 30);
}
