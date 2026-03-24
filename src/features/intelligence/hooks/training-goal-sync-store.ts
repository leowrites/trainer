/**
 * Training goal sync store.
 *
 * CALLING SPEC:
 * - keep a tiny invalidation version for training-goal reads across screens
 * - expose one hook for subscribing and one function for bumping the version
 * - side effects: none
 */

import { create } from 'zustand';

interface TrainingGoalSyncState {
  version: number;
  bump: () => void;
}

const useTrainingGoalSyncStore = create<TrainingGoalSyncState>((set) => ({
  version: 0,
  bump: (): void => {
    set((state) => ({ version: state.version + 1 }));
  },
}));

export function useTrainingGoalSyncVersion(): number {
  return useTrainingGoalSyncStore((state) => state.version);
}

export function notifyTrainingGoalsChanged(): void {
  useTrainingGoalSyncStore.getState().bump();
}
