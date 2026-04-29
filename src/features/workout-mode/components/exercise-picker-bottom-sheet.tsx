import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';

import type { Exercise } from '@core/database/types';
import { useExercises } from '@features/routines';
import {
  ActionRow,
  Checkbox,
  EditorSheet,
  Heading,
  Input,
  Label,
  Muted,
} from '@shared/components';
import { normalizeQuery } from '@shared/utils';

export function ExercisePickerBottomSheet({
  visible,
  exerciseIdsInSession,
  onClose,
  onDidClose,
  onAddExercises,
}: {
  visible: boolean;
  exerciseIdsInSession: string[];
  onClose: () => void;
  onDidClose?: () => void;
  onAddExercises: (exercises: Exercise[]) => void;
}): React.JSX.Element | null {
  const { exercises, hasLoaded } = useExercises();
  const [query, setQuery] = useState('');
  const [pendingExerciseIds, setPendingExerciseIds] = useState<string[]>([]);

  const availableExercises = useMemo(() => {
    const normalizedQuery = normalizeQuery(query);

    return exercises.filter((exercise) => {
      if (exerciseIdsInSession.includes(exercise.id)) {
        return false;
      }

      if (pendingExerciseIds.includes(exercise.id)) {
        return true;
      }

      if (normalizedQuery === '') {
        return true;
      }

      return (
        normalizeQuery(exercise.name).includes(normalizedQuery) ||
        normalizeQuery(exercise.muscle_group).includes(normalizedQuery)
      );
    });
  }, [exerciseIdsInSession, exercises, pendingExerciseIds, query]);

  useEffect(() => {
    if (!visible) {
      setQuery('');
      setPendingExerciseIds([]);
    }
  }, [visible]);

  const handleToggleExercise = useCallback((exerciseId: string): void => {
    setPendingExerciseIds((current) =>
      current.includes(exerciseId)
        ? current.filter((id) => id !== exerciseId)
        : [...current, exerciseId],
    );
  }, []);

  const handleClose = useCallback((): void => {
    setQuery('');
    setPendingExerciseIds([]);
    onClose();
  }, [onClose]);

  const handleAddSelected = useCallback((): void => {
    if (pendingExerciseIds.length === 0) {
      return;
    }

    onAddExercises(
      exercises.filter((exercise) => pendingExerciseIds.includes(exercise.id)),
    );
    handleClose();
  }, [exercises, handleClose, onAddExercises, pendingExerciseIds]);

  return (
    <EditorSheet
      visible={visible}
      onClose={handleClose}
      onDidDismiss={onDidClose}
      footer={
        <ActionRow
          className="mb-2 p-4"
          primaryLabel="Add Selected"
          onPrimaryPress={handleAddSelected}
          primaryDisabled={pendingExerciseIds.length === 0}
        />
      }
    >
      <Heading className="text-2xl leading-[28px]">Add Exercises</Heading>
      <Label className="mt-2">Search exercises</Label>
      <Muted className="mt-2 text-sm leading-5">
        Pick an exercise to bring into the current session.
      </Muted>
      <Input
        className="mt-3"
        accessibilityLabel="Search exercises"
        placeholder="Search exercises to add"
        value={query}
        onChangeText={setQuery}
        autoCapitalize="none"
        autoCorrect={false}
      />

      <View className="mt-4 gap-2">
        {!hasLoaded ? (
          <Muted className="text-sm">Loading exercises...</Muted>
        ) : availableExercises.length > 0 ? (
          availableExercises.map((exercise) => (
            <Checkbox
              key={exercise.id}
              accessibilityLabel={`Add ${exercise.name} to workout`}
              checked={pendingExerciseIds.includes(exercise.id)}
              onToggle={() => handleToggleExercise(exercise.id)}
              label={exercise.name}
              sublabel={exercise.muscle_group}
              className="mb-0"
            />
          ))
        ) : (
          <Muted className="text-sm leading-5">
            {exercises.length === 0
              ? 'No exercises available yet. Create one from the Plan tab first.'
              : 'No matching exercises available to add.'}
          </Muted>
        )}
      </View>
    </EditorSheet>
  );
}
