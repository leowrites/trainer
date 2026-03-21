import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Alert, Text, View } from 'react-native';
import type DraggableFlatListType from 'react-native-draggable-flatlist';
import type { RenderItemParams } from 'react-native-draggable-flatlist';

import {
  Body,
  Button,
  Container,
  Heading,
  Input,
  InteractivePressable,
  Label,
  Muted,
} from '@shared/components';
import { useReducedMotionPreference } from '@shared/hooks';
import { configureInteractionLayoutAnimation } from '@shared/utils';
import { ExercisePickerSheet } from '../components/exercise-picker-sheet';
import { RoutineExerciseEditor } from '../components/routine-exercise-editor';
import { useExercises } from '../hooks/use-exercises';
import { useRoutines } from '../hooks/use-routines';
import type { NewRoutineInput } from '../hooks/use-routines';
import type { RoutineExerciseDraft, RoutinesStackParamList } from '../types';
import {
  buildRoutineExerciseDrafts,
  parsePositiveWholeNumber,
} from '../utils/formatters';

const DEFAULT_TARGET_SETS = '3';
const DEFAULT_TARGET_REPS = '10';

export function RoutineEditorScreen({
  route,
  navigation,
}: NativeStackScreenProps<
  RoutinesStackParamList,
  'RoutineEditor'
>): React.JSX.Element {
  const DraggableFlatList = useMemo(
    () =>
      require('react-native-draggable-flatlist')
        .default as typeof DraggableFlatListType,
    [],
  );
  const { exercises, refresh: refreshExercises } = useExercises();
  const {
    routines,
    hasLoaded,
    refresh: refreshRoutines,
    getRoutineExercises,
    createRoutine,
    updateRoutine,
    deleteRoutine,
  } = useRoutines();
  const routineId = route.params?.routineId;
  const selectedRoutine =
    routines.find((routine) => routine.id === routineId) ?? null;

  const [name, setName] = useState('');
  const [exerciseDrafts, setExerciseDrafts] = useState<RoutineExerciseDraft[]>(
    [],
  );
  const [isExercisePickerOpen, setIsExercisePickerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const prefersReducedMotion = useReducedMotionPreference();

  const cancelActionRef = useRef<() => void>(() => undefined);
  const saveActionRef = useRef<() => void>(() => undefined);

  useFocusEffect(
    useCallback(() => {
      refreshExercises();
      refreshRoutines();
    }, [refreshExercises, refreshRoutines]),
  );

  useEffect(() => {
    if (routineId === undefined) {
      setName('');
      setExerciseDrafts([]);
      setIsExercisePickerOpen(false);
      setError(null);
      return;
    }

    if (selectedRoutine === null) {
      if (hasLoaded) {
        navigation.goBack();
      }
      return;
    }

    setName(selectedRoutine.name);
    setExerciseDrafts(
      buildRoutineExerciseDrafts(getRoutineExercises(selectedRoutine.id)),
    );
    setIsExercisePickerOpen(false);
    setError(null);
  }, [getRoutineExercises, hasLoaded, navigation, routineId, selectedRoutine]);

  const selectedExerciseIds = useMemo(
    () => exerciseDrafts.map((entry) => entry.exerciseId),
    [exerciseDrafts],
  );

  const handleCancel = useCallback((): void => {
    navigation.goBack();
  }, [navigation]);

  const handleSave = useCallback((): void => {
    const trimmedName = name.trim();

    if (!trimmedName) {
      setError('Routine name is required.');
      return;
    }

    const input: NewRoutineInput = {
      name: trimmedName,
      exercises: exerciseDrafts.map((entry) => ({
        exerciseId: entry.exerciseId,
        targetSets: parsePositiveWholeNumber(entry.targetSets, 1),
        targetReps: parsePositiveWholeNumber(entry.targetReps, 1),
      })),
    };

    setError(null);

    if (selectedRoutine === null) {
      createRoutine(input);
    } else {
      updateRoutine(selectedRoutine.id, input);
    }

    navigation.goBack();
  }, [
    createRoutine,
    exerciseDrafts,
    name,
    navigation,
    selectedRoutine,
    updateRoutine,
  ]);

  const handleArchive = useCallback((): void => {
    if (selectedRoutine === null) {
      return;
    }

    Alert.alert(
      'Archive Routine',
      `Archive ${selectedRoutine.name}? It will be removed from schedules but kept for historical workouts.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Archive',
          style: 'destructive',
          onPress: () => {
            deleteRoutine(selectedRoutine.id);
            navigation.goBack();
          },
        },
      ],
    );
  }, [deleteRoutine, navigation, selectedRoutine]);

  cancelActionRef.current = handleCancel;
  saveActionRef.current = handleSave;

  useEffect(() => {
    navigation.setOptions({
      title: '',
      headerBackVisible: false,
      headerLeft: () => (
        <InteractivePressable
          accessibilityRole="button"
          accessibilityLabel="Cancel"
          className="px-1 py-1"
          onPress={() => cancelActionRef.current()}
        >
          <Text className="font-mono text-base text-foreground">Cancel</Text>
        </InteractivePressable>
      ),
      headerRight: () => (
        <InteractivePressable
          accessibilityRole="button"
          accessibilityLabel="Save"
          className="px-1 py-1"
          onPress={() => saveActionRef.current()}
        >
          <Text className="font-mono text-base text-secondary">Save</Text>
        </InteractivePressable>
      ),
    });
  }, [navigation]);

  const handleUpdateDraft = useCallback(
    (exerciseId: string, patch: Partial<RoutineExerciseDraft>): void => {
      setExerciseDrafts((current) =>
        current.map((entry) =>
          entry.exerciseId === exerciseId ? { ...entry, ...patch } : entry,
        ),
      );
    },
    [],
  );

  const handleRemoveDraft = useCallback(
    (exerciseId: string): void => {
      configureInteractionLayoutAnimation(prefersReducedMotion);
      setExerciseDrafts((current) =>
        current.filter((entry) => entry.exerciseId !== exerciseId),
      );
    },
    [prefersReducedMotion],
  );

  const handleAddExercises = useCallback(
    (exerciseIds: string[]): void => {
      configureInteractionLayoutAnimation(prefersReducedMotion);
      setExerciseDrafts((current) => {
        const currentExerciseIds = new Set(
          current.map((entry) => entry.exerciseId),
        );

        return [
          ...current,
          ...exerciseIds
            .filter((exerciseId) => !currentExerciseIds.has(exerciseId))
            .map((exerciseId) => ({
              exerciseId,
              targetSets: DEFAULT_TARGET_SETS,
              targetReps: DEFAULT_TARGET_REPS,
            })),
        ];
      });
    },
    [prefersReducedMotion],
  );

  const listHeader = (
    <View>
      <Label>{selectedRoutine ? 'Edit Routine' : 'Create Routine'}</Label>
      <Body className="mt-3 font-heading text-4xl leading-[36px]">
        {selectedRoutine ? selectedRoutine.name : 'New Routine'}
      </Body>
      <Label className="mt-3">Routine name</Label>
      <Input
        className="mt-3"
        placeholder="Push A"
        value={name}
        onChangeText={setName}
        autoCapitalize="words"
      />

      <View className="mt-5 mb-3 flex-row items-center justify-between gap-3">
        <View className="flex-1">
          <Heading>Exercises</Heading>
        </View>
        <Button
          size="sm"
          variant="ghost"
          onPress={() => setIsExercisePickerOpen(true)}
        >
          Add Exercise
        </Button>
      </View>
    </View>
  );

  const listFooter = (
    <View className="pb-7">
      {selectedRoutine ? (
        <Button
          className="mt-4 w-full"
          variant="danger"
          onPress={handleArchive}
        >
          Archive Routine
        </Button>
      ) : null}
      {error ? <Muted className="mt-4 text-error">{error}</Muted> : null}
    </View>
  );

  return (
    <Container edges={['left', 'right']}>
      <View>
        <DraggableFlatList
          data={exerciseDrafts}
          keyExtractor={(item) => item.exerciseId}
          activationDistance={8}
          style={{ height: '100%' }}
          onDragEnd={({ data }) => {
            setExerciseDrafts(data);
          }}
          renderItem={({
            item,
            drag,
            isActive,
          }: RenderItemParams<RoutineExerciseDraft>) => {
            const exerciseName =
              exercises.find((exercise) => exercise.id === item.exerciseId)
                ?.name ?? item.exerciseId;

            return (
              <RoutineExerciseEditor
                draft={item}
                exerciseName={exerciseName}
                drag={drag}
                isActive={isActive}
                onRemove={() => handleRemoveDraft(item.exerciseId)}
                onChangeTargetSets={(value) =>
                  handleUpdateDraft(item.exerciseId, { targetSets: value })
                }
                onChangeTargetReps={(value) =>
                  handleUpdateDraft(item.exerciseId, { targetReps: value })
                }
              />
            );
          }}
          ListHeaderComponent={listHeader}
          ListFooterComponent={listFooter}
          ListEmptyComponent={
            <Muted className="mt-4 rounded-[18px] border border-dashed border-surface-border px-4 py-4 text-sm leading-[18px]">
              No exercises added yet. Use the picker above to build out this
              routine.
            </Muted>
          }
          showsVerticalScrollIndicator={false}
        />
      </View>

      <ExercisePickerSheet
        visible={isExercisePickerOpen}
        exercises={exercises}
        selectedExerciseIds={selectedExerciseIds}
        onClose={() => setIsExercisePickerOpen(false)}
        onAddExercises={handleAddExercises}
      />
    </Container>
  );
}
