import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, View } from 'react-native';

import type { Exercise, Routine, RoutineExercise } from '@core/database/types';
import { Body, Button, Heading, Input, Label, Muted } from '@shared/components';
import { normalizeQuery } from '@shared/utils';
import type { NewRoutineInput } from '../hooks/use-routines';
import type { RoutineExerciseDraft } from '../types';
import {
  buildRoutineExerciseDrafts,
  parsePositiveWholeNumber,
} from '../utils/formatters';
import { EditorSheet } from './editor-sheet';
import { RoutineExerciseEditor } from './routine-exercise-editor';

const DEFAULT_TARGET_SETS = '3';
const DEFAULT_TARGET_REPS = '10';

export function RoutineEditorSheet({
  visible,
  routine,
  exercises,
  routineExercises,
  onClose,
  onSave,
  onDelete,
}: {
  visible: boolean;
  routine: Routine | null;
  exercises: Exercise[];
  routineExercises: RoutineExercise[];
  onClose: () => void;
  onSave: (input: NewRoutineInput) => void;
  onDelete?: () => void;
}): React.JSX.Element | null {
  const [name, setName] = useState('');
  const [exerciseDrafts, setExerciseDrafts] = useState<RoutineExerciseDraft[]>(
    [],
  );
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [addExerciseQuery, setAddExerciseQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) {
      return;
    }

    setName(routine?.name ?? '');
    setExerciseDrafts(buildRoutineExerciseDrafts(routineExercises));
    setShowAddExercise(false);
    setAddExerciseQuery('');
    setError(null);
  }, [routine, routineExercises, visible]);

  const selectedExerciseIds = useMemo(
    () => exerciseDrafts.map((entry) => entry.exerciseId),
    [exerciseDrafts],
  );

  const availableExercises = useMemo(() => {
    const query = normalizeQuery(addExerciseQuery);

    return exercises.filter((exercise) => {
      if (selectedExerciseIds.includes(exercise.id)) {
        return false;
      }

      if (query === '') {
        return true;
      }

      return (
        normalizeQuery(exercise.name).includes(query) ||
        normalizeQuery(exercise.muscle_group).includes(query)
      );
    });
  }, [addExerciseQuery, exercises, selectedExerciseIds]);

  const handleUpdateDraft = useCallback(
    (index: number, patch: Partial<RoutineExerciseDraft>): void => {
      setExerciseDrafts((current) =>
        current.map((entry, entryIndex) =>
          entryIndex === index ? { ...entry, ...patch } : entry,
        ),
      );
    },
    [],
  );

  const handleMoveDraft = useCallback(
    (index: number, direction: -1 | 1): void => {
      setExerciseDrafts((current) => {
        const nextIndex = index + direction;

        if (nextIndex < 0 || nextIndex >= current.length) {
          return current;
        }

        const nextDrafts = [...current];
        const [moved] = nextDrafts.splice(index, 1);
        nextDrafts.splice(nextIndex, 0, moved);
        return nextDrafts;
      });
    },
    [],
  );

  const handleRemoveDraft = useCallback((index: number): void => {
    setExerciseDrafts((current) =>
      current.filter((_, entryIndex) => entryIndex !== index),
    );
  }, []);

  const handleAddExercise = useCallback((exerciseId: string): void => {
    setExerciseDrafts((current) => [
      ...current,
      {
        exerciseId,
        targetSets: DEFAULT_TARGET_SETS,
        targetReps: DEFAULT_TARGET_REPS,
      },
    ]);
    setAddExerciseQuery('');
    setShowAddExercise(false);
  }, []);

  const handleSave = (): void => {
    const trimmedName = name.trim();

    if (!trimmedName) {
      setError('Routine name is required.');
      return;
    }

    setError(null);
    onSave({
      name: trimmedName,
      exercises: exerciseDrafts.map((entry) => ({
        exerciseId: entry.exerciseId,
        targetSets: parsePositiveWholeNumber(entry.targetSets, 1),
        targetReps: parsePositiveWholeNumber(entry.targetReps, 1),
      })),
    });
  };

  return (
    <EditorSheet visible={visible} onClose={onClose}>
      <Heading className="text-2xl leading-[28px]">
        {routine ? 'Edit Routine' : 'Create Routine'}
      </Heading>
      <Muted className="mt-2 text-sm leading-[18px]">
        Build the exercise order and targets exactly how you want them to appear
        later in workout mode.
      </Muted>

      <Label className="mt-5">Routine name</Label>
      <Input
        className="mt-3"
        placeholder="Push A"
        value={name}
        onChangeText={setName}
        autoCapitalize="words"
      />

      <View className="mt-5 flex-row items-center justify-between gap-3">
        <View className="flex-1">
          <Label>Exercises</Label>
          <Muted className="mt-1 text-sm leading-[18px]">
            Ordered exactly how you want them to appear later in workout mode.
          </Muted>
        </View>
        <Button
          size="sm"
          variant="ghost"
          onPress={() => setShowAddExercise((current) => !current)}
        >
          {showAddExercise ? 'Close' : 'Add Exercise'}
        </Button>
      </View>

      {showAddExercise ? (
        <View className="mt-4 rounded-[20px] border border-surface-border/80 bg-surface-elevated px-4 py-4">
          <Input
            placeholder="Search exercises to add"
            value={addExerciseQuery}
            onChangeText={setAddExerciseQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <View className="mt-4 gap-2">
            {availableExercises.length > 0 ? (
              availableExercises.map((exercise) => (
                <Pressable
                  key={exercise.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Add ${exercise.name} to routine`}
                  className="rounded-[16px] border border-surface-border bg-surface-card px-4 py-3"
                  onPress={() => handleAddExercise(exercise.id)}
                >
                  <Body className="font-medium">{exercise.name}</Body>
                  <Muted className="mt-1 text-xs uppercase tracking-[1.2px]">
                    {exercise.muscle_group}
                  </Muted>
                </Pressable>
              ))
            ) : (
              <Muted className="text-sm leading-[18px]">
                No matching exercises available to add.
              </Muted>
            )}
          </View>
        </View>
      ) : null}

      <View className="mt-4 gap-3">
        {exerciseDrafts.length > 0 ? (
          exerciseDrafts.map((entry, index) => {
            const exerciseName =
              exercises.find((exercise) => exercise.id === entry.exerciseId)
                ?.name ?? entry.exerciseId;

            return (
              <RoutineExerciseEditor
                key={entry.exerciseId}
                draft={entry}
                exerciseName={exerciseName}
                isFirst={index === 0}
                isLast={index === exerciseDrafts.length - 1}
                onMoveUp={() => handleMoveDraft(index, -1)}
                onMoveDown={() => handleMoveDraft(index, 1)}
                onRemove={() => handleRemoveDraft(index)}
                onChangeTargetSets={(value) =>
                  handleUpdateDraft(index, { targetSets: value })
                }
                onChangeTargetReps={(value) =>
                  handleUpdateDraft(index, { targetReps: value })
                }
              />
            );
          })
        ) : (
          <Muted className="rounded-[18px] border border-dashed border-surface-border px-4 py-4 text-sm leading-[18px]">
            No exercises added yet. Use the button above to build out this
            routine.
          </Muted>
        )}
      </View>

      {error ? <Muted className="mt-4 text-error">{error}</Muted> : null}

      <Button className="mt-5 w-full" onPress={handleSave}>
        {routine ? 'Save Routine' : 'Create Routine'}
      </Button>

      <Button variant="ghost" className="mt-3 w-full" onPress={onClose}>
        {routine ? 'Cancel Edit' : 'Cancel'}
      </Button>

      {routine && onDelete ? (
        <Button
          variant="ghost"
          className="mt-3 w-full"
          onPress={() =>
            Alert.alert(
              'Delete Routine',
              `Delete ${routine.name} and remove it from schedules?`,
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: onDelete,
                },
              ],
            )
          }
        >
          Delete Routine
        </Button>
      ) : null}
    </EditorSheet>
  );
}
