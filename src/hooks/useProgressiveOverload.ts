import { useState, useEffect } from 'react';
import { getRecentSetsForExercise } from '../database/workouts';
import { getRoutineById } from '../database/routines';
import { suggestNextWorkout, OverloadSuggestion, WorkoutSetGroup } from '../utils/progressiveOverload';
import { WorkoutSet } from '../types';

export function useProgressiveOverload(
  exerciseId: string | null,
  routineId: string | null
): OverloadSuggestion | null {
  const [suggestion, setSuggestion] = useState<OverloadSuggestion | null>(null);

  useEffect(() => {
    if (!exerciseId) return;

    async function compute() {
      try {
        const recentSets = await getRecentSetsForExercise(exerciseId!, 3);
        if (recentSets.length === 0) {
          setSuggestion(null);
          return;
        }

        let targetReps = '8-12';
        let targetWeight = 0;

        if (routineId) {
          const routine = await getRoutineById(routineId).catch(() => null);
          if (routine) {
            const rex = routine.exercises?.find((e) => e.exerciseId === exerciseId);
            if (rex) {
              targetReps = rex.targetReps;
              targetWeight = rex.targetWeight;
            }
          }
        }

        const groups: WorkoutSetGroup[] = recentSets.map((sets: WorkoutSet[]) => ({
          exerciseId: exerciseId!,
          sets,
          targetReps,
          targetWeight: sets.find((s) => s.weight != null)?.weight ?? targetWeight,
        }));

        const result = suggestNextWorkout(groups, 'kg');
        setSuggestion(result);
      } catch (e) {
        console.error('useProgressiveOverload error:', e);
        setSuggestion(null);
      }
    }

    compute();
  }, [exerciseId, routineId]);

  return suggestion;
}
