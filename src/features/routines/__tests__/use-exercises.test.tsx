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
    expect(result.current.hasLoaded).toBe(true);
  });

  it('returns exercises fetched from the DB on mount', () => {
    const db = createMockDb();
    const mockRows: Exercise[] = [
      {
        id: 'e1',
        name: 'Bench Press',
        muscle_group: 'Chest',
        how_to: null,
        equipment: 'Barbell and bench',
        is_deleted: 0,
      },
      {
        id: 'e2',
        name: 'Squat',
        muscle_group: 'Legs',
        how_to: null,
        equipment: 'Barbell',
        is_deleted: 0,
      },
    ];
    db.getAllSync.mockReturnValue(mockRows);
    const wrapper = createDatabaseWrapper(db);
    const { result } = renderHook(() => useExercises(), { wrapper });
    expect(result.current.exercises).toEqual(mockRows);
    expect(result.current.hasLoaded).toBe(true);
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
      'INSERT INTO exercises (id, name, muscle_group, how_to, equipment, is_deleted) VALUES (?, ?, ?, ?, ?, 0)',
      expect.arrayContaining(['Deadlift', 'Back', null, null]),
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
      'UPDATE exercises SET name = ?, muscle_group = ?, how_to = ?, equipment = ? WHERE id = ?',
      ['Incline Bench', 'Upper Chest', null, null, 'e1'],
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
      'UPDATE exercises SET is_deleted = 1 WHERE id = ?',
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

  // ── State-update consistency tests ────────────────────────────────────────

  it('updateExercise: exercises list reflects the updated name after save', () => {
    const db = createMockDb();
    const original: Exercise = {
      id: 'e1',
      name: 'Bench Press',
      muscle_group: 'Chest',
      how_to: null,
      equipment: null,
      is_deleted: 0,
    };
    db.getAllSync.mockReturnValue([original]);
    const wrapper = createDatabaseWrapper(db);
    const { result } = renderHook(() => useExercises(), { wrapper });

    const updated: Exercise = { ...original, name: 'Incline Press' };
    db.getAllSync.mockReturnValue([updated]);

    act(() => {
      result.current.updateExercise('e1', {
        name: 'Incline Press',
        muscleGroup: 'Chest',
      });
    });

    expect(result.current.exercises[0].name).toBe('Incline Press');
  });

  it('deleteExercise: exercises list is empty after the only exercise is deleted', () => {
    const db = createMockDb();
    const e1: Exercise = {
      id: 'e1',
      name: 'Bench Press',
      muscle_group: 'Chest',
      how_to: null,
      equipment: null,
      is_deleted: 0,
    };
    db.getAllSync.mockReturnValue([e1]);
    const wrapper = createDatabaseWrapper(db);
    const { result } = renderHook(() => useExercises(), { wrapper });

    db.getAllSync.mockReturnValue([]);

    act(() => {
      result.current.deleteExercise('e1');
    });

    expect(result.current.exercises).toEqual([]);
  });

  it('createExercise: exercises list grows and includes the new exercise', () => {
    const db = createMockDb();
    db.getAllSync.mockReturnValue([]);
    const wrapper = createDatabaseWrapper(db);
    const { result } = renderHook(() => useExercises(), { wrapper });

    const created: Exercise = {
      id: 'e1',
      name: 'Deadlift',
      muscle_group: 'Back',
      how_to: null,
      equipment: null,
      is_deleted: 0,
    };
    db.getAllSync.mockReturnValue([created]);

    act(() => {
      result.current.createExercise({ name: 'Deadlift', muscleGroup: 'Back' });
    });

    expect(result.current.exercises).toEqual([created]);
  });
});
