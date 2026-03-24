/**
 * Goal exercise picker modal.
 *
 * CALLING SPEC:
 * - render a single-select exercise picker for strength and performance goals
 * - filter the exercise list locally and return one exact exercise id
 * - side effects: none beyond invoking selection callbacks
 */

import type { Exercise } from '@core/database/types';
import React, { useEffect, useMemo, useState } from 'react';
import { Modal, ScrollView, View } from 'react-native';

import {
  Body,
  Button,
  Heading,
  Input,
  InteractivePressable,
  Label,
  Muted,
} from '@shared/components';
import { normalizeQuery } from '@shared/utils';

interface GoalExercisePickerModalProps {
  visible: boolean;
  exercises: Exercise[];
  selectedExerciseId: string | null;
  onClose: () => void;
  onSelectExercise: (exerciseId: string) => void;
}

export function GoalExercisePickerModal({
  visible,
  exercises,
  selectedExerciseId,
  onClose,
  onSelectExercise,
}: GoalExercisePickerModalProps): React.JSX.Element {
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!visible) {
      setQuery('');
    }
  }, [visible]);

  const filteredExercises = useMemo(() => {
    const normalizedQuery = normalizeQuery(query);

    return exercises.filter((exercise) => {
      if (normalizedQuery === '') {
        return true;
      }

      return (
        normalizeQuery(exercise.name).includes(normalizedQuery) ||
        normalizeQuery(exercise.muscle_group).includes(normalizedQuery)
      );
    });
  }, [exercises, query]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end bg-black/40">
        <View className="max-h-[80%] rounded-t-[28px] border border-surface-border bg-surface-card px-5 pt-5">
          <View className="flex-row items-center justify-between gap-3">
            <Heading className="text-2xl">Select Exercise</Heading>
            <Button size="sm" variant="secondary" onPress={onClose}>
              Close
            </Button>
          </View>

          <Label className="mt-4">Search exercises</Label>
          <Input
            className="mt-3"
            placeholder="Search exercises"
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 24, paddingTop: 16 }}
          >
            <View className="gap-2">
              {filteredExercises.length > 0 ? (
                filteredExercises.map((exercise) => {
                  const isSelected = selectedExerciseId === exercise.id;

                  return (
                    <InteractivePressable
                      key={exercise.id}
                      accessibilityRole="button"
                      accessibilityLabel={`Choose ${exercise.name}`}
                      className={`rounded-[18px] border px-4 py-4 ${
                        isSelected
                          ? 'border-accent bg-accent/10'
                          : 'border-surface-border bg-surface-elevated'
                      }`}
                      onPress={() => {
                        onSelectExercise(exercise.id);
                        onClose();
                      }}
                    >
                      <Body className="font-semibold">{exercise.name}</Body>
                      <Muted className="mt-1 text-sm">
                        {exercise.muscle_group}
                      </Muted>
                    </InteractivePressable>
                  );
                })
              ) : (
                <Muted className="text-sm leading-5">
                  {exercises.length === 0
                    ? 'No exercises available yet.'
                    : 'No exercises match your search.'}
                </Muted>
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
