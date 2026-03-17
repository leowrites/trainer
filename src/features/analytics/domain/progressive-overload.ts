import type {
  ProgressiveOverloadCandidate,
  ProgressiveOverloadConfig,
  ProgressiveOverloadRecommendation,
} from '../types';

function roundToPrecision(value: number, precision: number): number {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

export function recommendProgressions(
  candidates: ProgressiveOverloadCandidate[],
  config: ProgressiveOverloadConfig,
): ProgressiveOverloadRecommendation[] {
  if (config.weightIncrement <= 0) {
    return [];
  }

  const precision = config.precision ?? 2;

  return candidates.flatMap((candidate: ProgressiveOverloadCandidate) => {
    const targetReps = candidate.targetReps;

    if (targetReps === null || targetReps <= 0) {
      return [];
    }

    const totalRequiredSets = candidate.targetSets ?? candidate.sets.length;

    if (totalRequiredSets <= 0) {
      return [];
    }

    const completedSets = candidate.sets.filter((set) => set.isCompleted);

    if (completedSets.length !== totalRequiredSets) {
      return [];
    }

    if (completedSets.some((set) => set.reps < targetReps)) {
      return [];
    }

    const currentWeight = Math.max(...completedSets.map((set) => set.weight));
    const recommendedWeight = roundToPrecision(
      currentWeight + config.weightIncrement,
      precision,
    );

    return [
      {
        exerciseId: candidate.exerciseId,
        exerciseName: candidate.exerciseName,
        targetReps,
        completedSetCount: completedSets.length,
        currentWeight,
        recommendedWeight,
        weightIncrement: config.weightIncrement,
        unit: config.unit,
      },
    ];
  });
}
