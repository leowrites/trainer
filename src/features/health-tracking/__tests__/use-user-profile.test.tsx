import { act, renderHook } from '@testing-library/react-native';

import {
  createDatabaseWrapper,
  createMockDb,
} from '@core/database/__tests__/test-utils';
import { useUserProfile } from '../hooks/use-user-profile';

const GET_USER_PROFILE_SQL =
  'SELECT id, display_name, preferred_weight_unit, created_at, updated_at FROM user_profile ORDER BY created_at ASC LIMIT 1';
const INSERT_USER_PROFILE_SQL =
  'INSERT INTO user_profile (id, display_name, preferred_weight_unit, created_at, updated_at) VALUES (?, ?, ?, ?, ?)';
const UPDATE_USER_PROFILE_SQL =
  'UPDATE user_profile SET display_name = ?, preferred_weight_unit = ?, updated_at = ? WHERE id = ?';

describe('useUserProfile', () => {
  it('loads the persisted profile on mount', () => {
    const db = createMockDb();
    db.getFirstSync.mockReturnValue({
      id: 'profile-1',
      display_name: 'Leo',
      preferred_weight_unit: 'lb',
      created_at: 1710599400000,
      updated_at: 1710685800000,
    });

    const { result } = renderHook(() => useUserProfile(), {
      wrapper: createDatabaseWrapper(db),
    });

    expect(db.getFirstSync).toHaveBeenCalledWith(GET_USER_PROFILE_SQL);
    expect(result.current.profile).toEqual({
      id: 'profile-1',
      displayName: 'Leo',
      preferredWeightUnit: 'lb',
      createdAt: 1710599400000,
      updatedAt: 1710685800000,
    });
  });

  it('inserts a new profile when one does not exist', () => {
    const db = createMockDb();
    db.getFirstSync.mockReturnValue(null);

    const { result } = renderHook(() => useUserProfile(), {
      wrapper: createDatabaseWrapper(db),
    });

    act(() => {
      result.current.saveProfile({
        displayName: 'Leo',
        preferredWeightUnit: 'lb',
      });
    });

    expect(db.runSync).toHaveBeenCalledWith(
      INSERT_USER_PROFILE_SQL,
      expect.arrayContaining(['Leo', 'lb']),
    );
  });

  it('updates the existing profile when one is already persisted', () => {
    const db = createMockDb();
    db.getFirstSync
      .mockReturnValueOnce({
        id: 'profile-1',
        display_name: 'Leo',
        preferred_weight_unit: 'kg',
        created_at: 1710599400000,
        updated_at: 1710685800000,
      })
      .mockReturnValueOnce({
        id: 'profile-1',
        display_name: 'Leo',
        preferred_weight_unit: 'kg',
        created_at: 1710599400000,
        updated_at: 1710685800000,
      });

    const { result } = renderHook(() => useUserProfile(), {
      wrapper: createDatabaseWrapper(db),
    });

    act(() => {
      result.current.saveProfile({
        displayName: 'Leo Training',
        preferredWeightUnit: 'lb',
      });
    });

    expect(db.runSync).toHaveBeenCalledWith(
      UPDATE_USER_PROFILE_SQL,
      expect.arrayContaining(['Leo Training', 'lb', 'profile-1']),
    );
  });
});
