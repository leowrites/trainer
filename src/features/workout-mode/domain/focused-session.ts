/**
 * Focused workout session helpers.
 *
 * CALLING SPEC:
 * - `findInitialFocusedLocation(session)` returns the first incomplete set, or
 *   the final set when everything is complete.
 * - `resolveFocusedLocation(session, preferredLocation)` preserves an existing
 *   focus when that exercise/set still exists; otherwise it falls back to the
 *   initial focused location.
 * - `buildFocusedWorkoutViewModel(input)` derives the current focused-set
 *   display model and a single guidance message.
 * - Side effects: none.
 */

import type {
  ActiveWorkoutSession,
  FocusedWorkoutGuidance,
  FocusedWorkoutLocation,
  FocusedWorkoutViewModel,
  PreviousExercisePerformance,
} from '../types';

interface BuildFocusedWorkoutViewModelInput {
  session: ActiveWorkoutSession;
  location: FocusedWorkoutLocation;
  selectedReps: number;
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

function buildPreviousSetSummary(
  session: ActiveWorkoutSession,
  exerciseIndex: number,
  setIndex: number,
): string | null {
  const previousSet = session.exercises[exerciseIndex]?.sets[setIndex - 1];

  if (!previousSet) {
    return null;
  }

  const rirLabel =
    previousSet.actualRir === null || previousSet.actualRir === undefined
      ? null
      : ` RIR ${previousSet.actualRir}`;

  return `${previousSet.weight} x ${previousSet.reps}${rirLabel ?? ''}`;
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

export function findInitialFocusedLocation(
  session: ActiveWorkoutSession,
): FocusedWorkoutLocation {
  for (
    let exerciseIndex = 0;
    exerciseIndex < session.exercises.length;
    exerciseIndex += 1
  ) {
    const exercise = session.exercises[exerciseIndex];

    if (!exercise) {
      continue;
    }

    for (let setIndex = 0; setIndex < exercise.sets.length; setIndex += 1) {
      if (!exercise.sets[setIndex]?.isCompleted) {
        return { exerciseIndex, setIndex };
      }
    }
  }

  const lastExerciseIndex = Math.max(0, session.exercises.length - 1);
  const lastSetIndex = Math.max(
    0,
    (session.exercises[lastExerciseIndex]?.sets.length ?? 1) - 1,
  );

  return {
    exerciseIndex: lastExerciseIndex,
    setIndex: lastSetIndex,
  };
}

export function getNextFocusedLocation(
  session: ActiveWorkoutSession,
  location: FocusedWorkoutLocation,
): FocusedWorkoutLocation {
  const orderedLocations = session.exercises.flatMap(
    (exercise, exerciseIndex) =>
      exercise.sets.map((_, setIndex) => ({ exerciseIndex, setIndex })),
  );
  const currentIndex = orderedLocations.findIndex(
    (item) =>
      item.exerciseIndex === location.exerciseIndex &&
      item.setIndex === location.setIndex,
  );

  if (currentIndex < 0 || currentIndex === orderedLocations.length - 1) {
    return location;
  }

  return orderedLocations[currentIndex + 1] ?? location;
}

export function resolveFocusedLocation(
  session: ActiveWorkoutSession,
  preferredLocation: FocusedWorkoutLocation,
): FocusedWorkoutLocation {
  const exercise = session.exercises[preferredLocation.exerciseIndex];
  const setItem = exercise?.sets[preferredLocation.setIndex];

  if (exercise && setItem) {
    return preferredLocation;
  }

  return findInitialFocusedLocation(session);
}

export function buildFocusedWorkoutViewModel({
  session,
  location,
  selectedReps,
  selectedRir,
  previousPerformance,
}: BuildFocusedWorkoutViewModelInput): FocusedWorkoutViewModel {
  const exercise = session.exercises[location.exerciseIndex];
  const setItem = exercise?.sets[location.setIndex];

  if (!exercise || !setItem) {
    throw new Error('Focused workout location is out of bounds.');
  }

  const totalRemainingSets = session.exercises.reduce(
    (sum, activeExercise, exerciseIndex) =>
      sum +
      activeExercise.sets.filter((candidate, setIndex) => {
        if (
          exerciseIndex === location.exerciseIndex &&
          setIndex === location.setIndex
        ) {
          return false;
        }

        return !candidate.isCompleted;
      }).length,
    0,
  );

  const repsMin = setItem.targetRepsMin ?? setItem.targetReps ?? null;
  const repsMax =
    setItem.targetRepsMax ??
    setItem.targetRepsMin ??
    setItem.targetReps ??
    null;
  const targetWeight = setItem.targetWeight ?? setItem.weight;

  return {
    location,
    exerciseId: exercise.exerciseId,
    exerciseName: exercise.exerciseName,
    setId: setItem.id,
    setNumber: location.setIndex + 1,
    totalSetsForExercise: exercise.sets.length,
    totalRemainingSets,
    target: {
      weight: targetWeight,
      repsLabel: formatRepRange(repsMin, repsMax),
      repsMin,
      repsMax,
    },
    previousSetSummary: buildPreviousSetSummary(
      session,
      location.exerciseIndex,
      location.setIndex,
    ),
    selectedReps,
    selectedRir,
    isCompleted: setItem.isCompleted,
    actions: {
      canComplete: selectedReps >= 0,
      canSkip: true,
      canOpenOverview: true,
      canAdjustRir: true,
    },
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
