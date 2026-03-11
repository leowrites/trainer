/**
 * Domain module for hours-over-time analytics.
 *
 * Duration is derived from `end_time − start_time` on each workout session.
 * All calculations are pure functions with no side-effects.
 */

// ─── Raw DB row type ──────────────────────────────────────────────────────────

/** Shape returned by the analytics SQL query for daily workout duration. */
export interface HoursDataRow {
  /** Date string in 'YYYY-MM-DD' format (from SQLite `date()` function). */
  session_date: string;
  /** Total workout duration for that day, in milliseconds. */
  total_duration_ms: number;
}

// ─── Display type ─────────────────────────────────────────────────────────────

/** A single data point ready to be rendered by a chart component. */
export interface HoursDataPoint {
  /** Short human-readable label, e.g. 'Mar 5'. */
  label: string;
  /** Total workout duration in hours (decimal). */
  hours: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MS_PER_HOUR = 3_600_000;

// ─── Pure functions ───────────────────────────────────────────────────────────

/**
 * Converts raw DB rows into display-ready data points.
 * Rows are expected to be sorted ascending by `session_date`.
 */
export function toHoursDataPoints(rows: HoursDataRow[]): HoursDataPoint[] {
  return rows.map((row) => ({
    label: formatDateLabel(row.session_date),
    hours: row.total_duration_ms / MS_PER_HOUR,
  }));
}

/**
 * Returns the maximum hours value across all data points.
 * Returns 0 for an empty array.  Useful for normalising bar heights.
 */
export function maxHours(points: HoursDataPoint[]): number {
  if (points.length === 0) return 0;
  return Math.max(...points.map((p) => p.hours));
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Formats a 'YYYY-MM-DD' string to a short 'Mon D' label (e.g. 'Mar 5'). */
function formatDateLabel(date: string): string {
  const d = new Date(`${date}T00:00:00`);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Formats a decimal hours number for display on a chart axis.
 * Always shows one decimal place with an 'h' suffix (e.g. '1.5h').
 */
export function formatHours(value: number): string {
  return `${value.toFixed(1)}h`;
}
