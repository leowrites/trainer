/**
 * Apple Health import persistence tool.
 *
 * CALLING SPEC:
 *   persistAppleHealthImport(db, payload, importedAt, windowEndTimestamp) -> AppleHealthImportResult
 *
 * Inputs:
 *   - SQLite database instance, native Apple Health payload, import timestamps.
 * Outputs:
 *   - Upserted local body-weight and daily-step records plus sync-state update.
 * Side effects:
 *   - Writes to SQLite inside a transaction.
 */
import type { SQLiteDatabase } from 'expo-sqlite';

import { generateId } from '@core/database';
import {
  APPLE_HEALTH_PROVIDER,
  type AppleHealthFetchResult,
  type AppleHealthImportResult,
} from '../domain/apple-health';
import { coerceBodyWeightUnit } from '../domain/body-weight';

const UPSERT_APPLE_HEALTH_BODY_WEIGHT_SQL = `
  INSERT INTO body_weight_entries (
    id,
    weight,
    unit,
    logged_at,
    notes,
    source,
    source_record_id,
    source_app,
    imported_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(source, source_record_id) DO UPDATE SET
    weight = excluded.weight,
    unit = excluded.unit,
    logged_at = excluded.logged_at,
    source_app = excluded.source_app,
    imported_at = excluded.imported_at
`;

const UPSERT_DAILY_STEP_SQL = `
  INSERT INTO daily_step_entries (
    id,
    day_key,
    step_count,
    source,
    source_record_id,
    imported_at
  ) VALUES (?, ?, ?, ?, ?, ?)
  ON CONFLICT(day_key, source) DO UPDATE SET
    step_count = excluded.step_count,
    source_record_id = excluded.source_record_id,
    imported_at = excluded.imported_at
`;

const UPSERT_HEALTH_SYNC_STATE_SQL = `
  INSERT INTO health_sync_state (
    provider,
    last_body_weight_sync_at,
    last_steps_sync_at,
    last_status,
    last_error,
    updated_at
  ) VALUES (?, ?, ?, ?, ?, ?)
  ON CONFLICT(provider) DO UPDATE SET
    last_body_weight_sync_at = excluded.last_body_weight_sync_at,
    last_steps_sync_at = excluded.last_steps_sync_at,
    last_status = excluded.last_status,
    last_error = excluded.last_error,
    updated_at = excluded.updated_at
`;

export function persistAppleHealthImport(
  db: SQLiteDatabase,
  payload: AppleHealthFetchResult,
  importedAt: number,
  windowEndTimestamp: number,
): AppleHealthImportResult {
  db.withTransactionSync(() => {
    for (const sample of payload.bodyWeightSamples) {
      db.runSync(UPSERT_APPLE_HEALTH_BODY_WEIGHT_SQL, [
        generateId(),
        sample.value,
        coerceBodyWeightUnit(sample.unit),
        sample.loggedAt,
        null,
        APPLE_HEALTH_PROVIDER,
        sample.uuid,
        sample.sourceApp,
        importedAt,
      ]);
    }

    for (const summary of payload.stepSummaries) {
      db.runSync(UPSERT_DAILY_STEP_SQL, [
        generateId(),
        summary.dayKey,
        summary.stepCount,
        APPLE_HEALTH_PROVIDER,
        summary.sourceRecordId,
        importedAt,
      ]);
    }

    db.runSync(UPSERT_HEALTH_SYNC_STATE_SQL, [
      APPLE_HEALTH_PROVIDER,
      windowEndTimestamp,
      windowEndTimestamp,
      'success',
      null,
      importedAt,
    ]);
  });

  return {
    importedBodyWeightCount: payload.bodyWeightSamples.length,
    importedStepDayCount: payload.stepSummaries.length,
    lastImportedAt: importedAt,
  };
}

export function persistAppleHealthImportFailure(
  db: SQLiteDatabase,
  errorMessage: string,
  updatedAt: number,
): void {
  db.runSync(UPSERT_HEALTH_SYNC_STATE_SQL, [
    APPLE_HEALTH_PROVIDER,
    null,
    null,
    'error',
    errorMessage,
    updatedAt,
  ]);
}
