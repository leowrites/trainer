import { WorkoutSet } from '../types';

export interface OverloadSuggestion {
  exerciseId: string;
  suggestedWeight: number;
  suggestedReps: string;
  reason: string;
}

export interface WorkoutSetGroup {
  exerciseId: string;
  sets: WorkoutSet[];
  targetReps: string;
  targetWeight: number;
}

export function parseReps(repsStr: string): { min: number; max: number } {
  if (repsStr.includes('-')) {
    const [min, max] = repsStr.split('-').map(Number);
    return { min, max };
  }
  const n = Number(repsStr);
  return { min: n, max: n };
}

export function calculateRepAchievementRate(sets: WorkoutSet[], targetReps: string): number {
  const { min } = parseReps(targetReps);
  const completedSets = sets.filter((s) => s.completed && !s.isWarmup);
  if (completedSets.length === 0) return 0;
  const totalTargetReps = min * completedSets.length;
  const totalActualReps = completedSets.reduce((sum, s) => sum + (s.reps || 0), 0);
  return totalTargetReps > 0 ? totalActualReps / totalTargetReps : 0;
}

export function suggestNextWorkout(
  recentWorkoutGroups: WorkoutSetGroup[],
  weightUnit: 'kg' | 'lbs' = 'kg'
): OverloadSuggestion | null {
  if (recentWorkoutGroups.length === 0) return null;

  const latest = recentWorkoutGroups[recentWorkoutGroups.length - 1];
  const increment = weightUnit === 'kg' ? 2.5 : 5;

  const rates = recentWorkoutGroups.map((g) =>
    calculateRepAchievementRate(g.sets, g.targetReps)
  );
  const allAchieved = rates.every((r) => r >= 1.0);
  const mostlyAchieved = rates.every((r) => r >= 0.75);

  if (allAchieved) {
    const newWeight = Math.round((latest.targetWeight + increment) * 4) / 4;
    return {
      exerciseId: latest.exerciseId,
      suggestedWeight: newWeight,
      suggestedReps: latest.targetReps,
      reason: `Great work! Increase weight by ${increment}${weightUnit}.`,
    };
  } else if (mostlyAchieved) {
    return {
      exerciseId: latest.exerciseId,
      suggestedWeight: latest.targetWeight,
      suggestedReps: latest.targetReps,
      reason: 'Keep the same weight and aim for the same reps.',
    };
  } else {
    const deload = Math.round(latest.targetWeight * 0.9 * 4) / 4;
    return {
      exerciseId: latest.exerciseId,
      suggestedWeight: deload,
      suggestedReps: latest.targetReps,
      reason: 'Deload by 10% and rebuild.',
    };
  }
}
