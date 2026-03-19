import { TrueSheet } from '@lodev09/react-native-true-sheet';
import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, TextInput, View } from 'react-native';

import { useTheme } from '@core/theme/theme-context';
import { useExercises } from '@features/routines';
import { Heading, Muted } from '@shared/components';
import { ExercisePickerRow } from './exercise-picker-row';

export function ExercisePickerBottomSheet({
  visible,
  exerciseIdsInSession,
  onClose,
  onAddExercise,
}: {
  visible: boolean;
  exerciseIdsInSession: string[];
  onClose: () => void;
  onAddExercise: (exerciseId: string, exerciseName: string) => void;
}): React.JSX.Element {
  const { colorMode, tokens } = useTheme();
  const { exercises, hasLoaded } = useExercises();
  const sheetRef = React.useRef<TrueSheet>(null);
  const isPresentedRef = React.useRef(false);
  const isTransitioningRef = React.useRef(false);
  const latestVisibleRef = React.useRef(visible);
  const [searchQuery, setSearchQuery] = useState('');

  const availableExercises = useMemo(
    () =>
      exercises.filter(
        (exercise) => !exerciseIdsInSession.includes(exercise.id),
      ),
    [exerciseIdsInSession, exercises],
  );
  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const filteredExercises = useMemo(
    () =>
      availableExercises.filter((exercise) => {
        if (normalizedSearchQuery === '') {
          return true;
        }

        return (
          exercise.name.toLowerCase().includes(normalizedSearchQuery) ||
          exercise.muscle_group.toLowerCase().includes(normalizedSearchQuery)
        );
      }),
    [availableExercises, normalizedSearchQuery],
  );

  useEffect(() => {
    latestVisibleRef.current = visible;
  }, [visible]);

  useEffect(() => {
    if (!visible) {
      setSearchQuery('');
    }
  }, [visible]);

  useEffect(() => {
    if (visible) {
      if (isPresentedRef.current || isTransitioningRef.current) {
        return;
      }

      isTransitioningRef.current = true;
      void sheetRef.current?.present().catch(() => {
        isTransitioningRef.current = false;
      });

      return;
    }

    if (!isPresentedRef.current || isTransitioningRef.current) {
      return;
    }

    isTransitioningRef.current = true;
    void sheetRef.current?.dismiss().catch(() => {
      isTransitioningRef.current = false;
    });
  }, [visible]);

  return (
    <TrueSheet
      ref={sheetRef}
      detents={['auto', 1]}
      cornerRadius={28}
      grabber
      scrollable
      backgroundColor={tokens.bgBase}
      backgroundBlur={colorMode === 'dark' ? 'dark' : 'light'}
      onDidPresent={() => {
        isPresentedRef.current = true;
        isTransitioningRef.current = false;
      }}
      onDidDismiss={() => {
        isPresentedRef.current = false;
        isTransitioningRef.current = false;

        if (latestVisibleRef.current) {
          onClose();
        }
      }}
    >
      <View>
        <View className="p-4">
          <Heading className="text-lg leading-[20px]">Add Exercise</Heading>
          <Muted className="mt-1 text-xs leading-[15px]">
            Pick an exercise to bring into the current session.
          </Muted>
          <TextInput
            accessibilityLabel="Search exercises"
            className="mt-4 h-12 rounded-[14px]  bg-surface-card px-4 py-0 font-body text-base text-foreground"
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search exercises"
            placeholderTextColor={tokens.textMuted}
            returnKeyType="search"
          />
        </View>

        {!hasLoaded ? (
          <View className="bg-surface-card px-4 py-4">
            <Muted className="text-sm">Loading exercises...</Muted>
          </View>
        ) : availableExercises.length === 0 ? (
          <View className="bg-surface-card px-4 py-4">
            <Muted className="text-sm">All exercises are already added.</Muted>
          </View>
        ) : filteredExercises.length === 0 ? (
          <View className="bg-surface-card px-4 py-4">
            <Muted className="text-sm">No exercises match your search.</Muted>
          </View>
        ) : (
          <FlatList
            data={filteredExercises}
            keyExtractor={(exercise) => exercise.id}
            renderItem={({ item }) => (
              <ExercisePickerRow
                exerciseName={item.name}
                muscleGroup={item.muscle_group}
                onPress={() => {
                  onAddExercise(item.id, item.name);
                  onClose();
                }}
              />
            )}
          />
        )}
      </View>
    </TrueSheet>
  );
}
