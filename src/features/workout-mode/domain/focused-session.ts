/**
 * Focused workout view-model helpers.
 *
 * CALLING SPEC:
 * - build focused-set guidance from one exercise record, one set record, and summary counts
 * - keep deterministic copy and target formatting outside React components
 * - side effects: none
 */

import type {
  ActiveWorkoutExercise,
  ActiveWorkoutSet,
  FocusedWorkoutGuidance,
  FocusedWorkoutViewModel,
  PreviousExercisePerformance,
} from '../types';

interface BuildFocusedWorkoutViewModelInput {
  exercise: Pick<
    ActiveWorkoutExercise,
    | 'exerciseId'
    | 'exerciseName'
    | 'targetReps'
    | 'targetRepsMin'
    | 'targetRepsMax'
  >;
  set: ActiveWorkoutSet;
  setNumber: number;
  totalSetsForExercise: number;
  totalRemainingSets: number;
  selectedReps: number;
  selectedWeight: number;
  selectedRir: number | null;
  previousPerformance: PreviousExercisePerformance | null;
}

function buildTargetLabel(
  weight: number,
  repsMin: number | null,
  repsMax: number | null,
): string {
  return `${weight} lbs x ${formatRepRange(repsMin, repsMax)}`;
}

function formatRepRange(min: number | null, max: number | null): string {
  if (min === null && max === null) {
    return 'Log reps';
  }

  if (min !== null && max !== null && min !== max) {
    return `${min}-${max}`;
  }

  return String(max ?? min ?? 0);
}

function buildGuidance(
  selectedReps: number,
  selectedRir: number | null,
  targetWeight: number,
  targetRepsMin: number | null,
  targetRepsMax: number | null,
  previousPerformance: PreviousExercisePerformance | null,
): FocusedWorkoutGuidance {
  const reasons: FocusedWorkoutGuidance['quality']['reasons'] = [];
  const targetLabel = buildTargetLabel(
    targetWeight,
    targetRepsMin,
    targetRepsMax,
  );

  if (previousPerformance === null) {
    reasons.push('too_few_exposures');
  }

  if (selectedRir === null) {
    reasons.push('missing_rir');
  }

  if (targetRepsMin !== null && targetRepsMax !== null) {
    if (selectedReps < targetRepsMin) {
      return {
        targetLabel,
        text: `Aim for ${targetRepsMin}-${targetRepsMax}`,
        tone: 'neutral',
        quality: {
          level: previousPerformance ? 'medium' : 'low',
          reasons,
        },
      };
    }

    if (selectedReps > targetRepsMax) {
      return {
        targetLabel,
        text: 'Strong set',
        tone: 'positive',
        quality: {
          level: previousPerformance ? 'medium' : 'low',
          reasons,
        },
      };
    }

    if (selectedReps === targetRepsMax) {
      return {
        targetLabel,
        text: 'On target',
        tone: 'positive',
        quality: {
          level: previousPerformance ? 'high' : 'medium',
          reasons,
        },
      };
    }

    return {
      targetLabel,
      text: `Push for ${targetRepsMax}`,
      tone: 'neutral',
      quality: {
        level: previousPerformance ? 'high' : 'medium',
        reasons,
      },
    };
  }

  return {
    targetLabel,
    text: 'Log the set',
    tone: 'neutral',
    quality: {
      level: 'low',
      reasons: reasons.length > 0 ? reasons : ['inconsistent_logging'],
    },
  };
}

export function buildFocusedWorkoutViewModel({
  exercise,
  set,
  setNumber,
  totalSetsForExercise,
  totalRemainingSets,
  selectedReps,
  selectedWeight,
  selectedRir,
  previousPerformance,
}: BuildFocusedWorkoutViewModelInput): FocusedWorkoutViewModel {
  const repsMin =
    set.targetRepsMin ?? set.targetReps ?? exercise.targetReps ?? null;
  const repsMax =
    set.targetRepsMax ??
    set.targetRepsMin ??
    set.targetReps ??
    exercise.targetRepsMax ??
    exercise.targetRepsMin ??
    exercise.targetReps ??
    null;
  const targetWeight = set.targetWeight ?? selectedWeight;

  return {
    exerciseId: exercise.exerciseId,
    exerciseName: exercise.exerciseName,
    setId: set.id,
    setNumber,
    totalSetsForExercise,
    totalRemainingSets,
    selectedReps,
    selectedWeight,
    selectedRir,
    isCompleted: set.isCompleted,
    guidance: buildGuidance(
      selectedReps,
      selectedRir,
      targetWeight,
      repsMin,
      repsMax,
      previousPerformance,
    ),
  };
}
