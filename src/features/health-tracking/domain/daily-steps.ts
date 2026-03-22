/**
 * Daily steps row mapping.
 *
 * CALLING SPEC:
 *   mapDailyStepEntry(row) -> DailyStepEntry
 *
 * Inputs:
 *   - SQLite row data from daily_step_entries.
 * Outputs:
 *   - Feature-facing daily step entries.
 * Side effects:
 *   - None.
 */
import type { HealthDataSource } from '@core/database/types';

export const DAILY_STEP_TABLE = 'daily_step_entries';

export interface DailyStepEntryRow {
  id: string;
  day_key: string;
  step_count: number;
  source: string;
  source_record_id: string | null;
  imported_at: number | null;
}

export interface DailyStepEntry {
  id: string;
  dayKey: string;
  stepCount: number;
  source: HealthDataSource;
  sourceRecordId: string | null;
  importedAt: number | null;
}

export function coerceHealthDataSource(source: string): HealthDataSource {
  return source === 'apple_health' ? 'apple_health' : 'manual';
}

export function mapDailyStepEntry(row: DailyStepEntryRow): DailyStepEntry {
  return {
    id: row.id,
    dayKey: row.day_key,
    stepCount: row.step_count,
    source: coerceHealthDataSource(row.source),
    sourceRecordId: row.source_record_id,
    importedAt: row.imported_at,
  };
}
