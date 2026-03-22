/**
 * User-profile query and mutation hook.
 *
 * CALLING SPEC:
 *   const profile = useUserProfile()
 *
 * Inputs:
 *   - None.
 * Outputs:
 *   - Local user profile settings and save action.
 * Side effects:
 *   - Reads and writes SQLite.
 */
import { useCallback, useEffect, useState } from 'react';

import { useDatabase } from '@core/database/provider';
import { generateId } from '@core/database/utils';
import type { UserProfile as DatabaseUserProfile } from '@core/database/types';
import type {
  UserProfile,
  UserProfileInput,
  UserProfileRow,
} from '../domain/user-profile';
import {
  mapUserProfile,
  sanitizeUserProfileInput,
  USER_PROFILE_TABLE,
} from '../domain/user-profile';

const GET_USER_PROFILE_SQL = `SELECT id, display_name, preferred_weight_unit, created_at, updated_at FROM ${USER_PROFILE_TABLE} ORDER BY created_at ASC LIMIT 1`;
const INSERT_USER_PROFILE_SQL = `INSERT INTO ${USER_PROFILE_TABLE} (id, display_name, preferred_weight_unit, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`;
const UPDATE_USER_PROFILE_SQL = `UPDATE ${USER_PROFILE_TABLE} SET display_name = ?, preferred_weight_unit = ?, updated_at = ? WHERE id = ?`;

export function useUserProfile(): {
  profile: UserProfile | null;
  error: string | null;
  refresh: () => void;
  saveProfile: (input: UserProfileInput) => UserProfile;
} {
  const db = useDatabase();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback((): void => {
    setRefreshKey((current: number) => current + 1);
  }, []);

  useEffect(() => {
    try {
      const row = db.getFirstSync<UserProfileRow>(GET_USER_PROFILE_SQL);
      setProfile(row ? mapUserProfile(row) : null);
      setError(null);
    } catch (loadError) {
      console.error('[HealthTracking] Failed to load user profile:', loadError);
      setProfile(null);
      setError('Unable to load local profile settings.');
    }
  }, [db, refreshKey]);

  const saveProfile = useCallback(
    (input: UserProfileInput): UserProfile => {
      const nextProfile = sanitizeUserProfileInput(input);
      const now = Date.now();
      const existingRow =
        db.getFirstSync<DatabaseUserProfile>(GET_USER_PROFILE_SQL);

      try {
        if (existingRow) {
          db.runSync(UPDATE_USER_PROFILE_SQL, [
            nextProfile.displayName ?? null,
            nextProfile.preferredWeightUnit,
            now,
            existingRow.id,
          ]);

          setError(null);
          refresh();

          return {
            id: existingRow.id,
            displayName: nextProfile.displayName ?? null,
            preferredWeightUnit: nextProfile.preferredWeightUnit,
            createdAt: existingRow.created_at,
            updatedAt: now,
          };
        }

        const id = generateId();
        db.runSync(INSERT_USER_PROFILE_SQL, [
          id,
          nextProfile.displayName ?? null,
          nextProfile.preferredWeightUnit,
          now,
          now,
        ]);

        setError(null);
        refresh();

        return {
          id,
          displayName: nextProfile.displayName ?? null,
          preferredWeightUnit: nextProfile.preferredWeightUnit,
          createdAt: now,
          updatedAt: now,
        };
      } catch (mutationError) {
        console.error(
          '[HealthTracking] Failed to save user profile:',
          mutationError,
        );
        setError('Unable to save local profile settings.');
        throw mutationError;
      }
    },
    [db, refresh],
  );

  return {
    profile,
    error,
    refresh,
    saveProfile,
  };
}
