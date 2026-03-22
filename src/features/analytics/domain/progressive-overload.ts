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
    const targetRepsMin =
      candidate.targetRepsMin ?? candidate.targetReps ?? null;
    const targetRepsMax =
      candidate.targetRepsMax ??
      candidate.targetRepsMin ??
      candidate.targetReps ??
      null;
    const hasExplicitUpperBound =
      candidate.targetRepsMax !== undefined ||
      (candidate.targetRepsMin !== undefined &&
        candidate.targetRepsMax !== undefined);

    if (targetRepsMin === null || targetRepsMin <= 0) {
      return [];
    }

    const totalRequiredSets = candidate.targetSets ?? candidate.sets.length;

    if (totalRequiredSets <= 0) {
      return [];
    }

    const completedSets = candidate.sets.filter((set) => set.isCompleted);

    if (completedSets.length < totalRequiredSets) {
      return [];
    }

    const qualifyingSets = completedSets.slice(0, totalRequiredSets);

    if (
      qualifyingSets.some(
        (set) =>
          set.reps < targetRepsMin ||
          (hasExplicitUpperBound &&
            targetRepsMax !== null &&
            set.reps > targetRepsMax),
      )
    ) {
      return [];
    }

    const currentWeight = Math.max(...qualifyingSets.map((set) => set.weight));
    const recommendedWeight = roundToPrecision(
      currentWeight + config.weightIncrement,
      precision,
    );

    return [
      {
        exerciseId: candidate.exerciseId,
        exerciseName: candidate.exerciseName,
        targetRepsMin,
        targetRepsMax: targetRepsMax ?? targetRepsMin,
        completedSetCount: qualifyingSets.length,
        currentWeight,
        recommendedWeight,
        weightIncrement: config.weightIncrement,
        unit: config.unit,
        reason:
          targetRepsMax !== null && targetRepsMax > targetRepsMin
            ? `All ${qualifyingSets.length} work sets landed inside ${targetRepsMin}-${targetRepsMax} reps.`
            : `All ${qualifyingSets.length} work sets hit ${targetRepsMin} reps.`,
      },
    ];
  });
}
