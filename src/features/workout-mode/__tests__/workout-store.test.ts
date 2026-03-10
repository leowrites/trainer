import { useWorkoutStore } from '../store';

describe('useWorkoutStore', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    useWorkoutStore.setState({
      isWorkoutActive: false,
      activeSessionId: null,
      startTime: null,
    });
  });

  it('starts with an inactive workout session', () => {
    const state = useWorkoutStore.getState();
    expect(state.isWorkoutActive).toBe(false);
    expect(state.activeSessionId).toBeNull();
    expect(state.startTime).toBeNull();
  });

  it('activates a workout session on startWorkout', () => {
    const sessionId = 'test-session-1';
    useWorkoutStore.getState().startWorkout(sessionId);

    const state = useWorkoutStore.getState();
    expect(state.isWorkoutActive).toBe(true);
    expect(state.activeSessionId).toBe(sessionId);
    expect(state.startTime).toBeGreaterThan(0);
  });

  it('records a start time close to Date.now()', () => {
    jest.useFakeTimers();
    try {
      jest.setSystemTime(1_700_000_000_000);

      useWorkoutStore.getState().startWorkout('session-abc');

      expect(useWorkoutStore.getState().startTime).toBe(1_700_000_000_000);
    } finally {
      jest.useRealTimers();
    }
  });

  it('resets all state on endWorkout', () => {
    useWorkoutStore.getState().startWorkout('session-xyz');
    useWorkoutStore.getState().endWorkout();

    const state = useWorkoutStore.getState();
    expect(state.isWorkoutActive).toBe(false);
    expect(state.activeSessionId).toBeNull();
    expect(state.startTime).toBeNull();
  });
});
