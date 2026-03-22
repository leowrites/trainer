/**
 * Body-weight query and mutation hook.
 *
 * CALLING SPEC:
 *   const bodyWeight = useBodyWeightEntries()
 *
 * Inputs:
 *   - None.
 * Outputs:
 *   - Local body-weight history plus manual create/update/delete actions.
 * Side effects:
 *   - Reads and writes SQLite.
 */
import { useCallback, useEffect, useState } from 'react';

import { useDatabase } from '@core/database/provider';
import { generateId } from '@core/database/utils';
import type {
  BodyWeightEntry,
  BodyWeightEntryInput,
  BodyWeightEntryRow,
} from '../domain/body-weight';
import {
  BODY_WEIGHT_TABLE,
  mapBodyWeightEntry,
  sanitizeBodyWeightEntryInput,
} from '../domain/body-weight';

const LIST_BODY_WEIGHT_ENTRIES_LEGACY_SQL = `SELECT id, weight, unit, logged_at, notes FROM ${BODY_WEIGHT_TABLE} ORDER BY logged_at DESC, id DESC`;
const LIST_BODY_WEIGHT_ENTRIES_WITH_SOURCE_SQL = `SELECT id, weight, unit, logged_at, notes, source, source_record_id, source_app, imported_at FROM ${BODY_WEIGHT_TABLE} ORDER BY logged_at DESC, id DESC`;
const INSERT_BODY_WEIGHT_ENTRY_SQL = `INSERT INTO ${BODY_WEIGHT_TABLE} (id, weight, unit, logged_at, notes, source, source_record_id, source_app, imported_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
const UPDATE_BODY_WEIGHT_ENTRY_SQL = `UPDATE ${BODY_WEIGHT_TABLE} SET weight = ?, unit = ?, logged_at = ?, notes = ? WHERE id = ? AND source = 'manual'`;
const DELETE_BODY_WEIGHT_ENTRY_SQL = `DELETE FROM ${BODY_WEIGHT_TABLE} WHERE id = ? AND source = 'manual'`;

function isMissingSourceColumnError(error: unknown): boolean {
  return (
    error instanceof Error &&
    error.message.includes('no such column: source')
  );
}

function mapLegacyBodyWeightRows(
  rows: Array<{
    id: string;
    weight: number;
    unit: string;
    logged_at: number;
    notes: string | null;
  }>,
): BodyWeightEntry[] {
  return rows.map((row) =>
    mapBodyWeightEntry({
      ...row,
      source: 'manual',
      source_record_id: null,
      source_app: null,
      imported_at: null,
    }),
  );
}

export function useBodyWeightEntries(): {
  entries: BodyWeightEntry[];
  error: string | null;
  refresh: () => void;
  createEntry: (input: BodyWeightEntryInput) => BodyWeightEntry;
  updateEntry: (id: string, input: BodyWeightEntryInput) => void;
  deleteEntry: (id: string) => void;
} {
  const db = useDatabase();
  const [entries, setEntries] = useState<BodyWeightEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback((): void => {
    setRefreshKey((current: number) => current + 1);
  }, []);

  useEffect(() => {
    try {
      const rows = db.getAllSync<BodyWeightEntryRow>(
        LIST_BODY_WEIGHT_ENTRIES_WITH_SOURCE_SQL,
      );
      setEntries(rows.map(mapBodyWeightEntry));
      setError(null);
    } catch (loadError) {
      if (isMissingSourceColumnError(loadError)) {
        try {
          const legacyRows = db.getAllSync<{
            id: string;
            weight: number;
            unit: string;
            logged_at: number;
            notes: string | null;
          }>(LIST_BODY_WEIGHT_ENTRIES_LEGACY_SQL);
          setEntries(mapLegacyBodyWeightRows(legacyRows));
          setError(null);
          return;
        } catch (legacyLoadError) {
          console.error(
            '[HealthTracking] Failed to load legacy body-weight entries:',
            legacyLoadError,
          );
        }
      }

      console.error(
        '[HealthTracking] Failed to load body-weight entries:',
        loadError,
      );
      setEntries([]);
      setError('Unable to load body-weight history.');
    }
  }, [db, refreshKey]);

  const createEntry = useCallback(
    (input: BodyWeightEntryInput): BodyWeightEntry => {
      const id = generateId();
      const nextEntry = sanitizeBodyWeightEntryInput(input);

      try {
        db.runSync(INSERT_BODY_WEIGHT_ENTRY_SQL, [
          id,
          nextEntry.weight,
          nextEntry.unit,
          nextEntry.loggedAt,
          nextEntry.notes ?? null,
          'manual',
          null,
          null,
          null,
        ]);
        setError(null);
      } catch (mutationError) {
        console.error(
          '[HealthTracking] Failed to create a body-weight entry:',
          mutationError,
        );
        setError('Unable to save this body-weight entry.');
        throw mutationError;
      }

      refresh();

      return {
        id,
        weight: nextEntry.weight,
        unit: nextEntry.unit,
        loggedAt: nextEntry.loggedAt,
        notes: nextEntry.notes ?? null,
        source: 'manual',
        sourceRecordId: null,
        sourceApp: null,
        importedAt: null,
      };
    },
    [db, refresh],
  );

  const updateEntry = useCallback(
    (id: string, input: BodyWeightEntryInput): void => {
      const nextEntry = sanitizeBodyWeightEntryInput(input);

      try {
        db.runSync(UPDATE_BODY_WEIGHT_ENTRY_SQL, [
          nextEntry.weight,
          nextEntry.unit,
          nextEntry.loggedAt,
          nextEntry.notes ?? null,
          id,
        ]);
        setError(null);
      } catch (mutationError) {
        console.error(
          '[HealthTracking] Failed to update a body-weight entry:',
          mutationError,
        );
        setError('Unable to update this body-weight entry.');
        throw mutationError;
      }

      refresh();
    },
    [db, refresh],
  );

  const deleteEntry = useCallback(
    (id: string): void => {
      try {
        db.runSync(DELETE_BODY_WEIGHT_ENTRY_SQL, [id]);
        setError(null);
      } catch (mutationError) {
        console.error(
          '[HealthTracking] Failed to delete a body-weight entry:',
          mutationError,
        );
        setError('Unable to delete this body-weight entry.');
        throw mutationError;
      }

      refresh();
    },
    [db, refresh],
  );

  return {
    entries,
    error,
    refresh,
    createEntry,
    updateEntry,
    deleteEntry,
  };
}
