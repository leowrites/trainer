import { act, renderHook } from '@testing-library/react-native';

import {
  createDatabaseWrapper,
  createMockDb,
} from '@core/database/__tests__/test-utils';
import type { TrainingGoal } from '@core/database/types';
import { useTrainingGoals } from '../hooks/use-training-goals';
import { notifyTrainingGoalsChanged } from '../hooks/training-goal-sync-store';

jest.mock('../hooks/use-exercise-capabilities', () => ({
  useExerciseCapabilities: () => ({
    capabilitiesByExerciseId: {},
    refresh: jest.fn(),
  }),
}));

function buildGoal(id: string): TrainingGoal {
  return {
    id,
    goal_type: 'strength',
    exercise_id: 'exercise-1',
    muscle_group: null,
    target_load: 225,
    target_reps: 5,
    target_sessions_per_week: null,
    target_sets_per_week: null,
    target_weeks: null,
    start_time: null,
    end_time: null,
    status: 'active',
    created_at: 1,
    updated_at: 1,
  };
}

describe('useTrainingGoals', () => {
  it('reloads all mounted goal consumers when the shared goal version changes', () => {
    const db = createMockDb();
    let storedGoals: TrainingGoal[] = [];

    db.getAllSync.mockImplementation((query: string) => {
      if (query.includes('FROM training_goals')) {
        return storedGoals;
      }

      return [];
    });

    const wrapper = createDatabaseWrapper(db);
    const firstHook = renderHook(() => useTrainingGoals([]), { wrapper });
    const secondHook = renderHook(() => useTrainingGoals([]), { wrapper });

    expect(firstHook.result.current.goals).toHaveLength(0);
    expect(secondHook.result.current.goals).toHaveLength(0);

    act(() => {
      storedGoals = [buildGoal('goal-1')];
      notifyTrainingGoalsChanged();
    });

    expect(firstHook.result.current.goals).toHaveLength(1);
    expect(secondHook.result.current.goals).toHaveLength(1);
    expect(firstHook.result.current.goals[0]?.id).toBe('goal-1');
    expect(secondHook.result.current.goals[0]?.id).toBe('goal-1');
  });
});
