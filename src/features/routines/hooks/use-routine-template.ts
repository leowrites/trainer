/**
 * Routine template hook.
 *
 * CALLING SPEC:
 * - `useRoutineTemplate(routineId)` loads one nested routine template model.
 * - Returns `template`, `isLoading`, and `refresh()`.
 * - Side effects: SQLite reads only.
 */

import { useCallback, useEffect, useState } from 'react';

import { useDatabase } from '@core/database/provider';
import { loadRoutineExerciseTemplates } from '../routine-template-repository';
import type { RoutineExerciseTemplate } from '../template-types';

export interface UseRoutineTemplateResult {
  isLoading: boolean;
  template: RoutineExerciseTemplate[];
  refresh: () => void;
}

export function useRoutineTemplate(
  routineId: string | null | undefined,
): UseRoutineTemplateResult {
  const db = useDatabase();
  const [template, setTemplate] = useState<RoutineExerciseTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback((): void => {
    setRefreshKey((current) => current + 1);
  }, []);

  useEffect(() => {
    if (!routineId) {
      setTemplate([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setTemplate(loadRoutineExerciseTemplates(db, routineId));
    setIsLoading(false);
  }, [db, refreshKey, routineId]);

  return {
    isLoading,
    template,
    refresh,
  };
}
