/**
 * Apple Health domain contracts.
 *
 * CALLING SPEC:
 *   buildAppleHealthImportWindow(syncState, nowTimestamp) -> {
 *     fromTimestamp: number;
 *     toTimestamp: number;
 *   }
 *
 *   mapHealthSyncState(row) -> AppleHealthSyncState
 *
 * Inputs:
 *   - SQLite rows or native-module payloads related to Apple Health imports.
 * Outputs:
 *   - Feature-safe contracts for permission state, import windows, and sync state.
 * Side effects:
 *   - None.
 */
export const APPLE_HEALTH_PROVIDER = 'apple_health';
export const APPLE_HEALTH_INITIAL_IMPORT_WINDOW_DAYS = 90;
export const APPLE_HEALTH_SYNC_OVERLAP_MS = 24 * 60 * 60 * 1000;
export const HEALTH_SYNC_STATE_TABLE = 'health_sync_state';

export type AppleHealthAuthorizationStatus =
  | 'unavailable'
  | 'not_determined'
  | 'denied'
  | 'authorized';

export type AppleHealthSyncStatus = 'idle' | 'success' | 'error';

export interface AppleHealthAuthorizationSnapshot {
  bodyWeight: AppleHealthAuthorizationStatus;
  steps: AppleHealthAuthorizationStatus;
}

export interface AppleHealthFetchOptions {
  fromTimestamp: number;
  toTimestamp: number;
}

export interface AppleHealthBodyWeightSample {
  uuid: string;
  value: number;
  unit: 'kg' | 'lb';
  loggedAt: number;
  sourceApp: string | null;
}

export interface AppleHealthStepSummary {
  dayKey: string;
  stepCount: number;
  sourceRecordId: string;
}

export interface AppleHealthFetchResult {
  bodyWeightSamples: AppleHealthBodyWeightSample[];
  stepSummaries: AppleHealthStepSummary[];
}

export interface HealthSyncStateRow {
  provider: string;
  last_body_weight_sync_at: number | null;
  last_steps_sync_at: number | null;
  last_status: string;
  last_error: string | null;
  updated_at: number;
}

export interface AppleHealthSyncState {
  provider: typeof APPLE_HEALTH_PROVIDER;
  lastBodyWeightSyncAt: number | null;
  lastStepsSyncAt: number | null;
  lastStatus: AppleHealthSyncStatus;
  lastError: string | null;
  updatedAt: number;
}

export interface AppleHealthImportResult {
  importedBodyWeightCount: number;
  importedStepDayCount: number;
  lastImportedAt: number;
}

export function coerceAppleHealthAuthorizationStatus(
  status: string,
): AppleHealthAuthorizationStatus {
  if (
    status === 'authorized' ||
    status === 'denied' ||
    status === 'unavailable'
  ) {
    return status;
  }

  return 'not_determined';
}

export function coerceAppleHealthSyncStatus(
  status: string,
): AppleHealthSyncStatus {
  if (status === 'success' || status === 'error') {
    return status;
  }

  return 'idle';
}

export function mapHealthSyncState(
  row: HealthSyncStateRow,
): AppleHealthSyncState {
  return {
    provider: APPLE_HEALTH_PROVIDER,
    lastBodyWeightSyncAt: row.last_body_weight_sync_at,
    lastStepsSyncAt: row.last_steps_sync_at,
    lastStatus: coerceAppleHealthSyncStatus(row.last_status),
    lastError: row.last_error,
    updatedAt: row.updated_at,
  };
}

export function buildAppleHealthImportWindow(
  syncState: AppleHealthSyncState | null,
  nowTimestamp: number,
): AppleHealthFetchOptions {
  const newestSyncedAt = Math.max(
    syncState?.lastBodyWeightSyncAt ?? 0,
    syncState?.lastStepsSyncAt ?? 0,
  );

  if (newestSyncedAt > 0) {
    return {
      fromTimestamp: Math.max(0, newestSyncedAt - APPLE_HEALTH_SYNC_OVERLAP_MS),
      toTimestamp: nowTimestamp,
    };
  }

  return {
    fromTimestamp:
      nowTimestamp -
      APPLE_HEALTH_INITIAL_IMPORT_WINDOW_DAYS * 24 * 60 * 60 * 1000,
    toTimestamp: nowTimestamp,
  };
}

export function canImportAppleHealth(
  snapshot: AppleHealthAuthorizationSnapshot,
): boolean {
  return (
    snapshot.bodyWeight === 'authorized' && snapshot.steps === 'authorized'
  );
}
