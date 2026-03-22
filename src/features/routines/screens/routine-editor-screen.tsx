import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Text, View } from 'react-native';
import type DraggableFlatListType from 'react-native-draggable-flatlist';
import type { RenderItemParams } from 'react-native-draggable-flatlist';

import { useTheme } from '@core/theme/theme-context';
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
import {
  DEFAULT_EXERCISE_TIMER_SECONDS,
  configureInteractionLayoutAnimation,
  showExerciseTimerPicker,
} from '@shared/utils';
import { ExercisePickerSheet } from '../components/exercise-picker-sheet';
import { RoutineExerciseEditor } from '../components/routine-exercise-editor';
import { useExercises } from '../hooks/use-exercises';
import { useRoutines } from '../hooks/use-routines';
import type { RoutineExerciseDraft, RoutinesStackParamList } from '../types';
import {
  buildDefaultRoutineExerciseDraft,
  buildDefaultRoutineSetDraft,
  buildRoutineExerciseDrafts,
  buildRoutineInput,
} from '../utils/formatters';

export function RoutineEditorScreen({
  route,
  navigation,
}: NativeStackScreenProps<
  RoutinesStackParamList,
  'RoutineEditor'
>): React.JSX.Element {
  const { colorMode } = useTheme();
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
    getRoutineTemplateExercises,
    createRoutine,
    updateRoutine,
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
      buildRoutineExerciseDrafts(
        getRoutineTemplateExercises?.(selectedRoutine.id) ??
          getRoutineExercises(selectedRoutine.id),
      ),
    );
    setIsExercisePickerOpen(false);
    setError(null);
  }, [
    getRoutineTemplateExercises,
    getRoutineExercises,
    hasLoaded,
    navigation,
    routineId,
    selectedRoutine,
  ]);

  const selectedExerciseIds = useMemo(
    () => exerciseDrafts.map((entry) => entry.exerciseId),
    [exerciseDrafts],
  );

  const handleCancel = useCallback((): void => {
    navigation.goBack();
  }, [navigation]);

  const handleSave = useCallback((): void => {
    if (!name.trim()) {
      setError('Routine name is required.');
      return;
    }

    const input = buildRoutineInput(name, exerciseDrafts);
    setError(null);

    if (selectedRoutine === null) {
      const createdRoutine = createRoutine(input);
      navigation.replace('RoutineDetail', {
        routineId: createdRoutine.id,
      });
      return;
    }

    updateRoutine(selectedRoutine.id, input);
    navigation.replace('RoutineDetail', {
      routineId: selectedRoutine.id,
    });
  }, [
    createRoutine,
    exerciseDrafts,
    name,
    navigation,
    selectedRoutine,
    updateRoutine,
  ]);

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

  const handleUpdateSetDraft = useCallback(
    (
      exerciseId: string,
      setId: string,
      patch: Partial<RoutineExerciseDraft['sets'][number]>,
    ): void => {
      setExerciseDrafts((current) =>
        current.map((entry) =>
          entry.exerciseId === exerciseId
            ? {
                ...entry,
                sets: entry.sets.map((setEntry) =>
                  setEntry.id === setId ? { ...setEntry, ...patch } : setEntry,
                ),
              }
            : entry,
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

  const handleAddSet = useCallback(
    (exerciseId: string): void => {
      configureInteractionLayoutAnimation(prefersReducedMotion);
      setExerciseDrafts((current) =>
        current.map((entry) =>
          entry.exerciseId === exerciseId
            ? {
                ...entry,
                sets: [...entry.sets, buildDefaultRoutineSetDraft()],
              }
            : entry,
        ),
      );
    },
    [prefersReducedMotion],
  );

  const handleRemoveSet = useCallback(
    (exerciseId: string, setId: string): void => {
      configureInteractionLayoutAnimation(prefersReducedMotion);
      setExerciseDrafts((current) =>
        current.map((entry) => {
          if (entry.exerciseId !== exerciseId || entry.sets.length === 1) {
            return entry;
          }

          return {
            ...entry,
            sets: entry.sets.filter((setEntry) => setEntry.id !== setId),
          };
        }),
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
            .map((exerciseId) => buildDefaultRoutineExerciseDraft(exerciseId)),
        ];
      });
    },
    [prefersReducedMotion],
  );

  const handleOpenRestTimerOptions = useCallback(
    (exerciseId: string, exerciseName: string, restSeconds: string): void => {
      const parsedRestSeconds = Number.parseInt(restSeconds, 10);
      const currentDurationSeconds =
        Number.isFinite(parsedRestSeconds) && parsedRestSeconds > 0
          ? parsedRestSeconds
          : null;

      showExerciseTimerPicker({
        title: `${exerciseName} timer`,
        message: 'Choose the timer duration for this exercise.',
        colorMode,
        currentDurationSeconds,
        onSelectDuration: (nextDuration) => {
          handleUpdateDraft(exerciseId, { restSeconds: String(nextDuration) });
        },
        onClear: () => {
          handleUpdateDraft(exerciseId, { restSeconds: '' });
        },
        clearActionLabel:
          currentDurationSeconds === null
            ? `Use Default (${DEFAULT_EXERCISE_TIMER_SECONDS} sec) ✓`
            : `Use Default (${DEFAULT_EXERCISE_TIMER_SECONDS} sec)`,
      });
    },
    [colorMode, handleUpdateDraft],
  );

  const listHeader = (
    <View>
      <Label>Create Routine</Label>
      <Body className="mt-3 font-heading text-4xl leading-[36px]">
        New Routine
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
          <Heading>Template exercises</Heading>
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
                onOpenDetails={() =>
                  navigation.navigate('ExerciseDetail', {
                    exerciseId: item.exerciseId,
                  })
                }
                onRemove={() => handleRemoveDraft(item.exerciseId)}
                onOpenRestTimerOptions={() =>
                  handleOpenRestTimerOptions(
                    item.exerciseId,
                    exerciseName,
                    item.restSeconds,
                  )
                }
                onAddSet={() => handleAddSet(item.exerciseId)}
                onRemoveSet={(setId) => handleRemoveSet(item.exerciseId, setId)}
                onChangeSetTargetRepsMin={(setId, value) =>
                  handleUpdateSetDraft(item.exerciseId, setId, {
                    targetRepsMin: value,
                  })
                }
                onChangeSetTargetRepsMax={(setId, value) =>
                  handleUpdateSetDraft(item.exerciseId, setId, {
                    targetRepsMax: value,
                  })
                }
                onChangeSetPlannedWeight={(setId, value) =>
                  handleUpdateSetDraft(item.exerciseId, setId, {
                    plannedWeight: value,
                  })
                }
                onChangeProgressionPolicy={(value) =>
                  handleUpdateDraft(item.exerciseId, {
                    progressionPolicy: value,
                    sets: item.sets.map((setEntry, index) => ({
                      ...setEntry,
                      setRole:
                        value === 'top_set_backoff'
                          ? index === 0
                            ? 'top_set'
                            : 'backoff'
                          : setEntry.setRole === 'warmup' ||
                              setEntry.setRole === 'optional'
                            ? setEntry.setRole
                            : 'work',
                    })),
                  })
                }
                onChangeTargetRir={(value) =>
                  handleUpdateDraft(item.exerciseId, {
                    targetRir: value,
                  })
                }
              />
            );
          }}
          ListHeaderComponent={listHeader}
          ListFooterComponent={listFooter}
          ListEmptyComponent={
            <Muted className="mt-4 rounded-[18px] border border-dashed border-surface-border px-4 py-4 text-sm leading-[18px]">
              No exercises added yet. Use the picker above to build out this
              routine template.
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
