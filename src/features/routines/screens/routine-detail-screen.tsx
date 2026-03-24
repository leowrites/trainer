import { useFocusEffect } from '@react-navigation/native';
import { useHeaderHeight } from '@react-navigation/elements';
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

import { useTheme } from '@core/theme/theme-context';
import {
  Body,
  Button,
  Card,
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
import { useRoutineInsight } from '../hooks/use-routine-insight';
import { useRoutineTemplate } from '../hooks/use-routine-template';
import { useExercises } from '../hooks/use-exercises';
import { useRoutines } from '../hooks/use-routines';
import type { RoutineExerciseDraft, RoutinesStackParamList } from '../types';
import {
  buildDefaultRoutineExerciseDraft,
  buildDefaultRoutineSetDraft,
  buildRoutineExerciseDrafts,
  buildRoutineInput,
  formatDateLabel,
  formatDurationLabel,
  formatVolumeLabel,
} from '../utils/formatters';

export function RoutineDetailScreen({
  route,
  navigation,
}: NativeStackScreenProps<
  RoutinesStackParamList,
  'RoutineDetail'
>): React.JSX.Element {
  const { colorMode } = useTheme();
  const DraggableFlatList = useMemo(
    () =>
      require('react-native-draggable-flatlist')
        .default as typeof DraggableFlatListType,
    [],
  );
  const headerHeight = useHeaderHeight();
  const prefersReducedMotion = useReducedMotionPreference();
  const { exercises, refresh: refreshExercises } = useExercises();
  const {
    routines,
    hasLoaded,
    refresh: refreshRoutines,
    updateRoutine,
    deleteRoutine,
  } = useRoutines();
  const { template, refresh: refreshRoutineTemplate } = useRoutineTemplate(
    route.params.routineId,
  );
  const { insight: routineInsight, refresh: refreshRoutineInsight } =
    useRoutineInsight(route.params.routineId);
  const selectedRoutine =
    routines.find((routine) => routine.id === route.params.routineId) ?? null;
  const [name, setName] = useState('');
  const [exerciseDrafts, setExerciseDrafts] = useState<RoutineExerciseDraft[]>(
    [],
  );
  const [isExercisePickerOpen, setIsExercisePickerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const saveActionRef = useRef<() => void>(() => undefined);
  const exerciseNameById = useMemo(
    () =>
      exercises.reduce<Record<string, string>>((accumulator, exercise) => {
        accumulator[exercise.id] = exercise.name;
        return accumulator;
      }, {}),
    [exercises],
  );

  useFocusEffect(
    useCallback(() => {
      refreshExercises();
      refreshRoutines();
      refreshRoutineTemplate();
      refreshRoutineInsight();
    }, [
      refreshExercises,
      refreshRoutineInsight,
      refreshRoutineTemplate,
      refreshRoutines,
    ]),
  );

  useEffect(() => {
    if (selectedRoutine === null && hasLoaded) {
      navigation.goBack();
      return;
    }

    if (!selectedRoutine) {
      return;
    }

    setName(selectedRoutine.name);
    setExerciseDrafts(buildRoutineExerciseDrafts(template));
    navigation.setOptions({
      title: selectedRoutine.name,
    });
  }, [hasLoaded, navigation, selectedRoutine, template]);

  const handleSave = useCallback((): void => {
    if (!selectedRoutine) {
      return;
    }

    if (!name.trim()) {
      setError('Routine name is required.');
      return;
    }

    updateRoutine(selectedRoutine.id, buildRoutineInput(name, exerciseDrafts));
    setError(null);
    navigation.setOptions({
      title: name.trim(),
    });
  }, [exerciseDrafts, name, navigation, selectedRoutine, updateRoutine]);

  saveActionRef.current = handleSave;

  useEffect(() => {
    navigation.setOptions({
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

  const handleArchive = useCallback((): void => {
    if (!selectedRoutine) {
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

  if (selectedRoutine === null) {
    return (
      <Container>
        <View />
      </Container>
    );
  }

  const selectedExerciseIds = exerciseDrafts.map((entry) => entry.exerciseId);

  return (
    <Container edges={['left', 'right']}>
      <View>
        <DraggableFlatList
          data={exerciseDrafts}
          keyExtractor={(item) => item.exerciseId}
          activationDistance={8}
          style={{ height: '100%' }}
          contentContainerStyle={{
            paddingTop: headerHeight + 16,
            paddingBottom: 28,
          }}
          onDragEnd={({ data }) => {
            setExerciseDrafts(data);
          }}
          renderItem={({
            item,
            drag,
            isActive,
          }: RenderItemParams<RoutineExerciseDraft>) => {
            const exerciseName =
              exerciseNameById[item.exerciseId] ?? item.exerciseId;

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
          ListHeaderComponent={
            <View>
              <Label>Routine details</Label>
              <Body className="mt-3 font-heading text-4xl leading-[36px]">
                {selectedRoutine.name}
              </Body>
              <Label className="mt-3">Routine name</Label>
              <Input
                className="mt-3"
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
          }
          ListFooterComponent={
            <View>
              {error ? (
                <Muted className="mt-4 text-error">{error}</Muted>
              ) : null}

              <Card
                label="Progression"
                className="mt-4 mb-4 rounded-[24px] px-5 py-5"
              >
                <View className="flex-row flex-wrap gap-3">
                  <View className="min-w-[110px] flex-1 rounded-[18px] bg-surface-elevated px-4 py-4">
                    <Label>Completions</Label>
                    <Body className="mt-2 font-heading text-2xl leading-[28px]">
                      {routineInsight.completionCount}
                    </Body>
                  </View>
                  <View className="min-w-[110px] flex-1 rounded-[18px] bg-surface-elevated px-4 py-4">
                    <Label>Last Run</Label>
                    <Body className="mt-2">
                      {formatDateLabel(routineInsight.lastPerformedAt)}
                    </Body>
                  </View>
                  <View className="min-w-[110px] flex-1 rounded-[18px] bg-surface-elevated px-4 py-4">
                    <Label>Average</Label>
                    <Body className="mt-2">
                      {formatVolumeLabel(routineInsight.averageVolume)}
                    </Body>
                  </View>
                </View>

                <Muted className="mt-4 text-sm leading-[18px]">
                  {formatDurationLabel(routineInsight.averageDurationMinutes)}
                </Muted>

                <View className="mt-5 gap-3">
                  {routineInsight.recentSessions.length > 0 ? (
                    routineInsight.recentSessions.slice(0, 5).map((session) => (
                      <View
                        key={session.sessionId}
                        className="rounded-[18px] border border-surface-border/80 bg-surface-elevated px-4 py-4"
                      >
                        <View className="flex-row items-start justify-between gap-3">
                          <View className="flex-1">
                            <Body className="font-medium">
                              {session.routineName}
                            </Body>
                            <Muted className="mt-1 text-sm leading-[18px]">
                              {formatDateLabel(session.startTime)}
                            </Muted>
                          </View>
                          <Muted className="text-sm">
                            {Math.round(session.totalVolume)} volume
                          </Muted>
                        </View>

                        <Muted className="mt-3 text-sm leading-[18px]">
                          {session.completedSets}/{session.totalSets} completed
                          sets
                        </Muted>
                      </View>
                    ))
                  ) : (
                    <Muted className="text-sm leading-[18px]">
                      No completed history for this routine yet.
                    </Muted>
                  )}
                </View>
              </Card>

              <Button
                className="mb-4 w-full"
                variant="danger"
                onPress={handleArchive}
              >
                Archive Routine
              </Button>
            </View>
          }
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
