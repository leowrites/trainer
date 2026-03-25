/**
 * Set control stack view-model helpers.
 *
 * CALLING SPEC:
 * - build deterministic previous/current/next stack metadata from linear route order
 * - classify adjacency as local same-exercise preview or cross-exercise transition preview
 * - expose set fractions and display emphasis hints for the focused scene renderer
 * - side effects: none
 */

import type { ActiveWorkoutSet } from '../types';

interface SetControlStackExerciseRecord {
  exerciseId: string;
  exerciseName: string;
  setIds: string[];
}

interface SetControlStackState {
  activeRouteSetIds: string[];
  activeSetsById: Record<string, ActiveWorkoutSet>;
  activeExercisesById: Record<string, SetControlStackExerciseRecord>;
}

export interface SetControlStackRouteItem {
  setId: string;
  exerciseId: string;
  exerciseName: string;
  setNumber: number;
  totalSetsForExercise: number;
  reps: number;
  weight: number;
  isCompleted: boolean;
}

export type SetControlStackPreviewKind = 'local' | 'transition';
export type SetControlStackPreviewEmphasis = 'value-first' | 'label-first';

export interface SetControlStackPreviewItem extends SetControlStackRouteItem {
  relation: 'previous' | 'next';
  kind: SetControlStackPreviewKind;
  emphasis: SetControlStackPreviewEmphasis;
}

export interface SetControlStackCurrentItem extends SetControlStackRouteItem {
  emphasis: 'value-first';
}

export interface SetControlStackViewModel {
  previousSetId: string | null;
  nextSetId: string | null;
  current: SetControlStackCurrentItem;
  previous: SetControlStackPreviewItem | null;
  next: SetControlStackPreviewItem | null;
}

function buildRouteItem(
  state: SetControlStackState,
  setId: string,
): SetControlStackRouteItem | null {
  const set = state.activeSetsById[setId];

  if (!set) {
    return null;
  }

  const exercise = state.activeExercisesById[set.exerciseId];

  if (!exercise) {
    return null;
  }

  const setNumber = exercise.setIds.indexOf(setId);

  if (setNumber < 0) {
    return null;
  }

  return {
    setId,
    exerciseId: set.exerciseId,
    exerciseName: exercise.exerciseName,
    setNumber: setNumber + 1,
    totalSetsForExercise: exercise.setIds.length,
    reps: set.reps,
    weight: set.weight,
    isCompleted: set.isCompleted,
  };
}

function buildPreviewItem(
  relation: SetControlStackPreviewItem['relation'],
  current: SetControlStackCurrentItem,
  adjacent: SetControlStackRouteItem | null,
): SetControlStackPreviewItem | null {
  if (!adjacent) {
    return null;
  }

  const isSameExercise = adjacent.exerciseId === current.exerciseId;
  const kind: SetControlStackPreviewKind = isSameExercise
    ? 'local'
    : 'transition';

  return {
    ...adjacent,
    relation,
    kind,
    emphasis: kind === 'local' ? 'value-first' : 'label-first',
  };
}

export function buildSetControlStackViewModel(
  state: SetControlStackState,
  focusedSetId: string,
): SetControlStackViewModel | null {
  const currentItem = buildRouteItem(state, focusedSetId);

  if (!currentItem) {
    return null;
  }

  const focusedIndex = state.activeRouteSetIds.indexOf(focusedSetId);

  if (focusedIndex < 0) {
    return null;
  }

  const previousSetId = state.activeRouteSetIds[focusedIndex - 1] ?? null;
  const nextSetId = state.activeRouteSetIds[focusedIndex + 1] ?? null;
  const current: SetControlStackCurrentItem = {
    ...currentItem,
    emphasis: 'value-first',
  };

  return {
    previousSetId,
    nextSetId,
    current,
    previous: buildPreviewItem(
      'previous',
      current,
      previousSetId ? buildRouteItem(state, previousSetId) : null,
    ),
    next: buildPreviewItem(
      'next',
      current,
      nextSetId ? buildRouteItem(state, nextSetId) : null,
    ),
  };
}
