import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, View } from 'react-native';

import type { Exercise, Routine, RoutineExercise } from '@core/database/types';
import {
  ActionRow,
  Button,
  Checkbox,
  Heading,
  Input,
  Label,
  Muted,
} from '@shared/components';
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
  const [pendingExerciseIds, setPendingExerciseIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) {
      return;
    }

    setName(routine?.name ?? '');
    setExerciseDrafts(buildRoutineExerciseDrafts(routineExercises));
    setShowAddExercise(false);
    setAddExerciseQuery('');
    setPendingExerciseIds([]);
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

      if (pendingExerciseIds.includes(exercise.id)) {
        return true;
      }

      if (query === '') {
        return true;
      }

      return (
        normalizeQuery(exercise.name).includes(query) ||
        normalizeQuery(exercise.muscle_group).includes(query)
      );
    });
  }, [addExerciseQuery, exercises, pendingExerciseIds, selectedExerciseIds]);

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

  const handleRemoveDraft = useCallback((index: number): void => {
    setExerciseDrafts((current) =>
      current.filter((_, entryIndex) => entryIndex !== index),
    );
  }, []);

  const handleTogglePendingExercise = useCallback(
    (exerciseId: string): void => {
      setPendingExerciseIds((current) =>
        current.includes(exerciseId)
          ? current.filter((id) => id !== exerciseId)
          : [...current, exerciseId],
      );
    },
    [],
  );

  const handleCloseAddExercise = useCallback((): void => {
    setAddExerciseQuery('');
    setPendingExerciseIds([]);
    setShowAddExercise(false);
  }, []);

  const handleAddSelectedExercises = useCallback((): void => {
    if (pendingExerciseIds.length === 0) {
      return;
    }

    setExerciseDrafts((current) => {
      const currentExerciseIds = new Set(
        current.map((entry) => entry.exerciseId),
      );

      return [
        ...current,
        ...pendingExerciseIds
          .filter((exerciseId) => !currentExerciseIds.has(exerciseId))
          .map((exerciseId) => ({
            exerciseId,
            targetSets: DEFAULT_TARGET_SETS,
            targetReps: DEFAULT_TARGET_REPS,
          })),
      ];
    });
    handleCloseAddExercise();
  }, [handleCloseAddExercise, pendingExerciseIds]);

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
          onPress={() => {
            if (showAddExercise) {
              handleCloseAddExercise();
              return;
            }

            setShowAddExercise(true);
          }}
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
                <Checkbox
                  key={exercise.id}
                  accessibilityLabel={`Add ${exercise.name} to routine`}
                  checked={pendingExerciseIds.includes(exercise.id)}
                  onToggle={() => handleTogglePendingExercise(exercise.id)}
                  label={exercise.name}
                  sublabel={exercise.muscle_group}
                  className="mb-0 bg-surface-card"
                />
              ))
            ) : (
              <Muted className="text-sm leading-5">
                No matching exercises available to add.
              </Muted>
            )}
          </View>

          <Muted className="mt-4 text-sm leading-5">
            {pendingExerciseIds.length === 0
              ? 'Select one or more exercises to add them together.'
              : `${pendingExerciseIds.length} exercise${
                  pendingExerciseIds.length === 1 ? '' : 's'
                } selected`}
          </Muted>

          <ActionRow
            primaryLabel="Add Selected"
            secondaryLabel="Close"
            className="mt-4"
            onPrimaryPress={handleAddSelectedExercises}
            onSecondaryPress={handleCloseAddExercise}
            primaryDisabled={pendingExerciseIds.length === 0}
          />
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
                drag={() => undefined}
                isActive={false}
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
