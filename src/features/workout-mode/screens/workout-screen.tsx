import React, { useCallback, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { useFocusEffect } from '@react-navigation/native';

import {
  Badge,
  Body,
  Button,
  Caption,
  Card,
  Container,
  Heading,
  Input,
  Label,
  Muted,
  Surface,
} from '@shared/components';
import { useWorkoutStore } from '../store';
import { useActiveWorkout } from '../hooks/use-active-workout';
import { useWorkoutStarter } from '../hooks/use-workout-starter';

function parseWholeNumber(value: string): number {
  if (value.trim() === '') {
    return 0;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function parseDecimalNumber(value: string): number {
  if (value.trim() === '') {
    return 0;
  }

  const parsed = Number.parseFloat(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function WorkoutScreen(): React.JSX.Element {
  const { isWorkoutActive } = useWorkoutStore();
  const {
    nextRoutine,
    startWorkoutFromSchedule,
    startFreeWorkout,
    refreshPreview,
  } = useWorkoutStarter();
  const {
    activeSession,
    addSet,
    deleteSet,
    updateReps,
    updateWeight,
    completeWorkout,
  } = useActiveWorkout();
  const [starting, setStarting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refreshPreview();
    }, [refreshPreview]),
  );

  const handleStartScheduled = (): void => {
    if (starting) return;
    setStarting(true);
    try {
      startWorkoutFromSchedule();
    } finally {
      setStarting(false);
    }
  };

  const handleStartFree = (): void => {
    if (starting) return;
    setStarting(true);
    try {
      startFreeWorkout();
    } finally {
      setStarting(false);
    }
  };

  return (
    <Container className="items-center justify-center gap-4">
      <Heading>Workout</Heading>

      {isWorkoutActive ? (
        <>
          <Badge variant="accent" pulse>
            Session in progress
          </Badge>

          <Card className="w-full rounded-xl">
            <Caption className="uppercase tracking-wider mb-1">
              Current session
            </Caption>
            <Body className="font-semibold">
              {activeSession?.title ?? 'Workout'}
            </Body>
          </Card>

          {activeSession && activeSession.exercises.length > 0 ? (
            <ScrollView className="w-full">
              <View className="gap-3">
                {activeSession.exercises.map((exercise) => (
                  <Card
                    key={exercise.exerciseId}
                    className="w-full rounded-xl gap-3"
                  >
                    <View className="flex-row items-center justify-between">
                      <Body className="font-semibold">
                        {exercise.exerciseName}
                      </Body>
                      <Caption>{exercise.sets.length} sets</Caption>
                    </View>

                    {exercise.sets.map((setItem, index) => (
                      <Surface
                        key={setItem.id}
                        variant="card"
                        className="rounded-xl p-3 gap-3"
                      >
                        <Caption>Set {index + 1}</Caption>
                        <View className="flex-row gap-3">
                          <View className="flex-1 gap-1">
                            <Label>Reps</Label>
                            <Input
                              value={String(setItem.reps)}
                              onChangeText={(value) =>
                                updateReps(setItem.id, parseWholeNumber(value))
                              }
                              keyboardType="number-pad"
                              accessibilityLabel={`${exercise.exerciseName} set ${index + 1} reps`}
                            />
                          </View>
                          <View className="flex-1 gap-1">
                            <Label>Weight</Label>
                            <Input
                              value={String(setItem.weight)}
                              onChangeText={(value) =>
                                updateWeight(
                                  setItem.id,
                                  parseDecimalNumber(value),
                                )
                              }
                              keyboardType="decimal-pad"
                              accessibilityLabel={`${exercise.exerciseName} set ${index + 1} weight`}
                            />
                          </View>
                        </View>

                        <Button
                          variant="ghost"
                          onPress={() => deleteSet(setItem.id)}
                          accessibilityLabel={`Delete ${exercise.exerciseName} set ${index + 1}`}
                        >
                          Delete Set
                        </Button>
                      </Surface>
                    ))}

                    <Button
                      variant="ghost"
                      onPress={() => addSet(exercise.exerciseId)}
                    >
                      Add Set
                    </Button>
                  </Card>
                ))}
              </View>
            </ScrollView>
          ) : (
            <Surface variant="card" className="w-full rounded-xl p-4">
              <Muted className="text-center">
                No exercises in this session yet.
              </Muted>
            </Surface>
          )}

          <Button variant="ghost" onPress={completeWorkout} className="w-full">
            Complete Workout
          </Button>
        </>
      ) : (
        <>
          {nextRoutine ? (
            <Card className="w-full rounded-xl mb-2">
              <Caption className="uppercase tracking-wider mb-1">
                Up next · {nextRoutine.scheduleName}
              </Caption>
              <Body className="font-semibold">{nextRoutine.routineName}</Body>
            </Card>
          ) : (
            <Surface variant="card" className="w-full rounded-xl p-4 mb-2">
              <Muted className="text-center">
                No active schedule — start a free workout
              </Muted>
            </Surface>
          )}

          {nextRoutine ? (
            <Button
              onPress={handleStartScheduled}
              disabled={starting}
              loading={starting}
              className="w-full"
            >
              Start {nextRoutine.routineName}
            </Button>
          ) : null}

          <Button
            variant="ghost"
            onPress={handleStartFree}
            disabled={starting}
            loading={starting}
            className="w-full"
          >
            Free Workout
          </Button>
        </>
      )}
    </Container>
  );
}
