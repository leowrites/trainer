/**
 * Training goals hook.
 *
 * CALLING SPEC:
 * - `useTrainingGoals(allSessions)` loads typed goals plus CRUD helpers.
 * - The hook owns only goal persistence and derived goal-progress evaluation.
 * - Side effects: SQLite reads/writes only.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';

import { useOptionalDatabase } from '@core/database/provider';
import type { TrainingGoal } from '@core/database/types';
import type { HistorySession } from '@features/analytics';
import {
  buildExerciseExposureIndex,
  buildExerciseExposures,
} from '../metrics/exposures';
import type { TrainingGoalInput, TrainingGoalViewModel } from '../types';
import { useExerciseCapabilities } from './use-exercise-capabilities';
import { buildGoalProgressSummaries } from '../goals/domain';
import {
  createTrainingGoal,
  deleteTrainingGoal,
  listTrainingGoals,
  updateTrainingGoal,
} from '../goals/repository';
import {
  notifyTrainingGoalsChanged,
  useTrainingGoalSyncVersion,
} from './training-goal-sync-store';

export function useTrainingGoals(
  allSessions: HistorySession[] = [],
  options: {
    capabilitiesByExerciseId?: ReturnType<
      typeof useExerciseCapabilities
    >['capabilitiesByExerciseId'];
  } = {},
): {
  goals: TrainingGoal[];
  goalViewModels: TrainingGoalViewModel[];
  createGoal: (input: TrainingGoalInput) => TrainingGoal;
  updateGoal: (id: string, input: TrainingGoalInput) => void;
  deleteGoal: (id: string) => void;
  refresh: () => void;
} {
  const db = useOptionalDatabase();
  const sharedGoalVersion = useTrainingGoalSyncVersion();
  const { capabilitiesByExerciseId: loadedCapabilitiesByExerciseId } =
    useExerciseCapabilities();
  const [goals, setGoals] = useState<TrainingGoal[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback((): void => {
    setRefreshKey((current) => current + 1);
    notifyTrainingGoalsChanged();
  }, []);

  useEffect(() => {
    if (!db || typeof db.getAllSync !== 'function') {
      return;
    }

    setGoals(listTrainingGoals(db));
  }, [db, refreshKey, sharedGoalVersion]);

  const capabilitiesByExerciseId =
    options.capabilitiesByExerciseId ?? loadedCapabilitiesByExerciseId;
  const exposuresByExerciseId = useMemo(
    () =>
      buildExerciseExposureIndex(
        buildExerciseExposures(allSessions, capabilitiesByExerciseId),
      ),
    [allSessions, capabilitiesByExerciseId],
  );
  const goalViewModels = useMemo(
    () =>
      buildGoalProgressSummaries(
        goals.filter((goal) => goal.status !== 'archived'),
        exposuresByExerciseId,
        capabilitiesByExerciseId,
      ),
    [capabilitiesByExerciseId, exposuresByExerciseId, goals],
  );

  return {
    goals,
    goalViewModels,
    createGoal: (input) => {
      if (!db || typeof db.runSync !== 'function') {
        throw new Error('Training goals require a database provider.');
      }

      const goal = createTrainingGoal(db, input);
      notifyTrainingGoalsChanged();
      return goal;
    },
    updateGoal: (id, input) => {
      if (!db || typeof db.runSync !== 'function') {
        return;
      }

      updateTrainingGoal(db, id, input);
      notifyTrainingGoalsChanged();
    },
    deleteGoal: (id) => {
      if (!db || typeof db.runSync !== 'function') {
        return;
      }

      deleteTrainingGoal(db, id);
      notifyTrainingGoalsChanged();
    },
    refresh,
  };
}
