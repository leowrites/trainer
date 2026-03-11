/**
 * Domain module for volume-over-time analytics.
 *
 * Volume (tonnage) is defined as: weight × reps, summed over all completed
 * sets that belong to a workout session.  All calculations are pure functions
 * with no side-effects so they are trivially unit-testable.
 */

// ─── Raw DB row type ──────────────────────────────────────────────────────────

/** Shape returned by the analytics SQL query for daily volume. */
export interface VolumeDataRow {
  /** Date string in 'YYYY-MM-DD' format (from SQLite `date()` function). */
  session_date: string;
  /** Sum of (weight × reps) for all completed sets on that day. */
  total_volume: number;
}

// ─── Display type ─────────────────────────────────────────────────────────────

/** A single data point ready to be rendered by a chart component. */
export interface VolumeDataPoint {
  /** Short human-readable label, e.g. 'Mar 5'. */
  label: string;
  /** Total volume (in the same unit as the stored weights). */
  volume: number;
}

// ─── Pure functions ───────────────────────────────────────────────────────────

/**
 * Converts raw DB rows into display-ready data points.
 * Rows are expected to be sorted ascending by `session_date`.
 */
export function toVolumeDataPoints(rows: VolumeDataRow[]): VolumeDataPoint[] {
  return rows.map((row) => ({
    label: formatDateLabel(row.session_date),
    volume: row.total_volume,
  }));
}

/**
 * Returns the maximum volume value across all data points.
 * Returns 0 for an empty array.  Useful for normalising bar heights.
 */
export function maxVolume(points: VolumeDataPoint[]): number {
  if (points.length === 0) return 0;
  return Math.max(...points.map((p) => p.volume));
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Formats a 'YYYY-MM-DD' string to a short 'Mon D' label (e.g. 'Mar 5'). */
function formatDateLabel(date: string): string {
  // Append time to avoid UTC-offset issues when constructing the Date.
  const d = new Date(`${date}T00:00:00`);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Formats a volume number for display on a chart axis.
 * Values ≥ 1000 are abbreviated with a 'k' suffix (e.g. '1.5k').
 */
export function formatVolume(value: number): string {
  return value >= 1000
    ? `${(value / 1000).toFixed(1)}k`
    : String(Math.round(value));
}
