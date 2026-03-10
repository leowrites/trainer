import { renderHook, act } from '@testing-library/react-native';

import type { Exercise } from '@core/database/types';
import {
  createMockDb,
  createDatabaseWrapper,
} from '@core/database/__tests__/test-utils';
import { useExercises } from '../hooks/use-exercises';

// ─── useExercises ─────────────────────────────────────────────────────────────

describe('useExercises', () => {
  it('returns an empty list when the DB has no exercises', () => {
    const db = createMockDb();
    db.getAllSync.mockReturnValue([]);
    const wrapper = createDatabaseWrapper(db);
    const { result } = renderHook(() => useExercises(), { wrapper });
    expect(result.current.exercises).toEqual([]);
  });

  it('returns exercises fetched from the DB on mount', () => {
    const db = createMockDb();
    const mockRows: Exercise[] = [
      { id: 'e1', name: 'Bench Press', muscle_group: 'Chest' },
      { id: 'e2', name: 'Squat', muscle_group: 'Legs' },
    ];
    db.getAllSync.mockReturnValue(mockRows);
    const wrapper = createDatabaseWrapper(db);
    const { result } = renderHook(() => useExercises(), { wrapper });
    expect(result.current.exercises).toEqual(mockRows);
  });

  it('createExercise inserts a row with the correct columns', () => {
    const db = createMockDb();
    const wrapper = createDatabaseWrapper(db);
    const { result } = renderHook(() => useExercises(), { wrapper });

    act(() => {
      result.current.createExercise({
        name: 'Deadlift',
        muscleGroup: 'Back',
      });
    });

    expect(db.runSync).toHaveBeenCalledWith(
      'INSERT INTO exercises (id, name, muscle_group) VALUES (?, ?, ?)',
      expect.arrayContaining(['Deadlift', 'Back']),
    );
  });

  it('createExercise triggers a re-fetch (getAllSync called again)', () => {
    const db = createMockDb();
    db.getAllSync.mockReturnValue([]);
    const wrapper = createDatabaseWrapper(db);
    const { result } = renderHook(() => useExercises(), { wrapper });
    const callsBefore = (db.getAllSync as jest.Mock).mock.calls.length;

    act(() => {
      result.current.createExercise({ name: 'Pull-up', muscleGroup: 'Back' });
    });

    expect((db.getAllSync as jest.Mock).mock.calls.length).toBeGreaterThan(
      callsBefore,
    );
  });

  it('updateExercise updates the row with new name and muscle_group', () => {
    const db = createMockDb();
    const wrapper = createDatabaseWrapper(db);
    const { result } = renderHook(() => useExercises(), { wrapper });

    act(() => {
      result.current.updateExercise('e1', {
        name: 'Incline Bench',
        muscleGroup: 'Upper Chest',
      });
    });

    expect(db.runSync).toHaveBeenCalledWith(
      'UPDATE exercises SET name = ?, muscle_group = ? WHERE id = ?',
      ['Incline Bench', 'Upper Chest', 'e1'],
    );
  });

  it('deleteExercise cascades to routine_exercises', () => {
    const db = createMockDb();
    const wrapper = createDatabaseWrapper(db);
    const { result } = renderHook(() => useExercises(), { wrapper });

    act(() => {
      result.current.deleteExercise('e1');
    });

    // Cascade: should delete routine_exercises first
    expect(db.runSync).toHaveBeenCalledWith(
      'DELETE FROM routine_exercises WHERE exercise_id = ?',
      ['e1'],
    );
    // Then the exercise itself
    expect(db.runSync).toHaveBeenCalledWith(
      'DELETE FROM exercises WHERE id = ?',
      ['e1'],
    );
  });

  it('deleteExercise wraps cascade in a transaction', () => {
    const db = createMockDb();
    const wrapper = createDatabaseWrapper(db);
    const { result } = renderHook(() => useExercises(), { wrapper });

    // Clear calls that happened during provider initialisation (e.g., seed).
    db.withTransactionSync.mockClear();

    act(() => {
      result.current.deleteExercise('e1');
    });

    expect(db.withTransactionSync).toHaveBeenCalledTimes(1);
  });

  it('refresh() re-queries the DB', () => {
    const db = createMockDb();
    db.getAllSync.mockReturnValue([]);
    const wrapper = createDatabaseWrapper(db);
    const { result } = renderHook(() => useExercises(), { wrapper });
    const callsBefore = (db.getAllSync as jest.Mock).mock.calls.length;

    act(() => {
      result.current.refresh();
    });

    expect((db.getAllSync as jest.Mock).mock.calls.length).toBeGreaterThan(
      callsBefore,
    );
  });
});
