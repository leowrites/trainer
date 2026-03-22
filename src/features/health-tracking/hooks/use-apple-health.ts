/**
 * Apple Health integration hook.
 *
 * CALLING SPEC:
 *   const health = useAppleHealth()
 *
 * Inputs:
 *   - None.
 * Outputs:
 *   - Availability, authorization, sync-state, and import actions for Apple Health.
 * Side effects:
 *   - Calls the native Apple Health module and persists imported payloads to SQLite.
 */
import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';

import { useDatabase } from '@core/database/provider';
import type { HealthSyncStateRow } from '../domain/apple-health';
import {
  APPLE_HEALTH_PROVIDER,
  buildAppleHealthImportWindow,
  mapHealthSyncState,
  type AppleHealthAuthorizationSnapshot,
  type AppleHealthImportResult,
  type AppleHealthSyncState,
} from '../domain/apple-health';
import {
  fetchHealthData,
  getAuthorizationSnapshot,
  isHealthKitAvailable,
  requestReadAuthorization,
} from '../native/apple-health-module';
import {
  persistAppleHealthImport,
  persistAppleHealthImportFailure,
} from '../tools/apple-health-import';

const GET_HEALTH_SYNC_STATE_SQL = `
  SELECT
    provider,
    last_body_weight_sync_at,
    last_steps_sync_at,
    last_status,
    last_error,
    updated_at
  FROM health_sync_state
  WHERE provider = ?
  LIMIT 1
`;

const UNAVAILABLE_SNAPSHOT: AppleHealthAuthorizationSnapshot = {
  bodyWeight: 'unavailable',
  steps: 'unavailable',
};

export function useAppleHealth(): {
  isSupported: boolean;
  isAvailable: boolean;
  authorization: AppleHealthAuthorizationSnapshot;
  syncState: AppleHealthSyncState | null;
  loading: boolean;
  requestingAccess: boolean;
  importing: boolean;
  error: string | null;
  refresh: () => void;
  requestAccess: () => Promise<AppleHealthAuthorizationSnapshot>;
  importLatest: () => Promise<AppleHealthImportResult | null>;
} {
  const db = useDatabase();
  const [isAvailable, setIsAvailable] = useState(false);
  const [authorization, setAuthorization] =
    useState<AppleHealthAuthorizationSnapshot>(UNAVAILABLE_SNAPSHOT);
  const [syncState, setSyncState] = useState<AppleHealthSyncState | null>(null);
  const [loading, setLoading] = useState(true);
  const [requestingAccess, setRequestingAccess] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback((): void => {
    setRefreshKey((current) => current + 1);
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadState(): Promise<void> {
      if (Platform.OS !== 'ios') {
        if (!isMounted) {
          return;
        }

        setIsAvailable(false);
        setAuthorization(UNAVAILABLE_SNAPSHOT);
        setSyncState(null);
        setError(null);
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const [available, authorizationSnapshot] = await Promise.all([
          isHealthKitAvailable(),
          getAuthorizationSnapshot(),
        ]);
        const syncStateRow =
          db.getFirstSync<HealthSyncStateRow>(GET_HEALTH_SYNC_STATE_SQL, [
            APPLE_HEALTH_PROVIDER,
          ]) ?? null;

        if (!isMounted) {
          return;
        }

        setIsAvailable(available);
        setAuthorization(authorizationSnapshot);
        setSyncState(syncStateRow ? mapHealthSyncState(syncStateRow) : null);
        setError(null);
      } catch (loadError) {
        console.error(
          '[HealthTracking] Failed to load Apple Health state:',
          loadError,
        );

        if (!isMounted) {
          return;
        }

        setIsAvailable(false);
        setAuthorization(UNAVAILABLE_SNAPSHOT);
        setSyncState(null);
        setError('Unable to load Apple Health status.');
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    void loadState();

    return () => {
      isMounted = false;
    };
  }, [db, refreshKey]);

  const requestAccess =
    useCallback(async (): Promise<AppleHealthAuthorizationSnapshot> => {
      if (Platform.OS !== 'ios') {
        setAuthorization(UNAVAILABLE_SNAPSHOT);
        return UNAVAILABLE_SNAPSHOT;
      }

      setRequestingAccess(true);

      try {
        const nextSnapshot = await requestReadAuthorization();
        setAuthorization(nextSnapshot);
        setError(null);
        refresh();
        return nextSnapshot;
      } catch (requestError) {
        console.error(
          '[HealthTracking] Failed to request Apple Health authorization:',
          requestError,
        );
        setError('Unable to request Apple Health access.');
        throw requestError;
      } finally {
        setRequestingAccess(false);
      }
    }, [refresh]);

  const importLatest =
    useCallback(async (): Promise<AppleHealthImportResult | null> => {
      if (Platform.OS !== 'ios') {
        return null;
      }

      setImporting(true);
      const importedAt = Date.now();

      try {
        const currentSyncStateRow =
          db.getFirstSync<HealthSyncStateRow>(GET_HEALTH_SYNC_STATE_SQL, [
            APPLE_HEALTH_PROVIDER,
          ]) ?? null;
        const currentSyncState = currentSyncStateRow
          ? mapHealthSyncState(currentSyncStateRow)
          : null;
        const importWindow = buildAppleHealthImportWindow(
          currentSyncState,
          importedAt,
        );
        const payload = await fetchHealthData(importWindow);
        const result = persistAppleHealthImport(
          db,
          payload,
          importedAt,
          importWindow.toTimestamp,
        );

        setError(null);
        refresh();
        return result;
      } catch (importError) {
        console.error(
          '[HealthTracking] Failed to import Apple Health data:',
          importError,
        );
        const message = 'Unable to import Apple Health data.';
        persistAppleHealthImportFailure(db, message, importedAt);
        setError(message);
        refresh();
        return null;
      } finally {
        setImporting(false);
      }
    }, [db, refresh]);

  return {
    isSupported: Platform.OS === 'ios',
    isAvailable,
    authorization,
    syncState,
    loading,
    requestingAccess,
    importing,
    error,
    refresh,
    requestAccess,
    importLatest,
  };
}
