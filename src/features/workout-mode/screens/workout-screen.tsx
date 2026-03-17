import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { useFocusEffect } from '@react-navigation/native';

import { useExercises } from '@features/routines';
import { type ActiveWorkoutSet } from '../types';
import {
  Badge,
  Body,
  Button,
  Caption,
  Card,
  Checkbox,
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

function WorkoutSetEditor({
  exerciseName,
  setItem,
  index,
  onDelete,
  onUpdateReps,
  onUpdateWeight,
}: {
  exerciseName: string;
  setItem: ActiveWorkoutSet;
  index: number;
  onDelete: () => void;
  onUpdateReps: (reps: number) => void;
  onUpdateWeight: (weight: number) => void;
}): React.JSX.Element {
  const [repsText, setRepsText] = useState(String(setItem.reps));
  const [weightText, setWeightText] = useState(String(setItem.weight));

  useEffect(() => {
    setRepsText(String(setItem.reps));
  }, [setItem.reps]);

  useEffect(() => {
    setWeightText(String(setItem.weight));
  }, [setItem.weight]);

  const handlePersistReps = useCallback((): void => {
    onUpdateReps(parseWholeNumber(repsText));
  }, [onUpdateReps, repsText]);

  const handlePersistWeight = useCallback((): void => {
    onUpdateWeight(parseDecimalNumber(weightText));
  }, [onUpdateWeight, weightText]);

  return (
    <Surface variant="card" className="rounded-xl p-3 gap-3">
      <Caption>Set {index + 1}</Caption>
      <View className="flex-row gap-3">
        <View className="flex-1 gap-1">
          <Label>Reps</Label>
          <Input
            value={repsText}
            onChangeText={setRepsText}
            onEndEditing={handlePersistReps}
            onSubmitEditing={handlePersistReps}
            keyboardType="number-pad"
            returnKeyType="done"
            accessibilityLabel={`${exerciseName} set ${index + 1} reps`}
          />
        </View>
        <View className="flex-1 gap-1">
          <Label>Weight</Label>
          <Input
            value={weightText}
            onChangeText={setWeightText}
            onEndEditing={handlePersistWeight}
            onSubmitEditing={handlePersistWeight}
            keyboardType="decimal-pad"
            returnKeyType="done"
            accessibilityLabel={`${exerciseName} set ${index + 1} weight`}
          />
        </View>
      </View>

      <Button
        variant="ghost"
        onPress={onDelete}
        accessibilityLabel={`Delete ${exerciseName} set ${index + 1}`}
      >
        Delete Set
      </Button>
    </Surface>
  );
}

function FreeWorkoutExercisePicker({
  exerciseIdsInSession,
  onAddExercise,
}: {
  exerciseIdsInSession: string[];
  onAddExercise: (exerciseId: string, exerciseName: string) => void;
}): React.JSX.Element | null {
  const { exercises } = useExercises();
  const [showPicker, setShowPicker] = useState(false);

  const availableExercises = exercises.filter(
    (exercise) => !exerciseIdsInSession.includes(exercise.id),
  );

  if (exercises.length === 0) {
    return (
      <Surface variant="card" className="w-full rounded-xl p-4">
        <Muted className="text-center">
          No exercises available yet. Create one in Routines first.
        </Muted>
      </Surface>
    );
  }

  if (availableExercises.length === 0) {
    return (
      <Surface variant="card" className="w-full rounded-xl p-4">
        <Muted className="text-center">
          All exercises are already in this workout.
        </Muted>
      </Surface>
    );
  }

  return (
    <Surface variant="card" className="w-full rounded-xl p-4 gap-3">
      <View className="gap-1">
        <Body className="font-semibold">Add exercise</Body>
        <Muted>Pick an exercise to start logging in this free workout.</Muted>
      </View>

      {showPicker ? (
        <View className="gap-2">
          {availableExercises.map((exercise) => (
            <Checkbox
              key={exercise.id}
              checked={false}
              onToggle={() => {
                onAddExercise(exercise.id, exercise.name);
                setShowPicker(false);
              }}
              label={exercise.name}
              sublabel={exercise.muscle_group}
            />
          ))}

          <Button variant="ghost" onPress={() => setShowPicker(false)}>
            Cancel
          </Button>
        </View>
      ) : (
        <Button variant="ghost" onPress={() => setShowPicker(true)}>
          Add Exercise
        </Button>
      )}
    </Surface>
  );
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
    addExercise,
    removeExercise,
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

          {activeSession?.isFreeWorkout ? (
            <FreeWorkoutExercisePicker
              exerciseIdsInSession={activeSession.exercises.map(
                (exercise) => exercise.exerciseId,
              )}
              onAddExercise={addExercise}
            />
          ) : null}

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
                      <WorkoutSetEditor
                        key={setItem.id}
                        exerciseName={exercise.exerciseName}
                        setItem={setItem}
                        index={index}
                        onDelete={() => deleteSet(setItem.id)}
                        onUpdateReps={(reps) => updateReps(setItem.id, reps)}
                        onUpdateWeight={(weight) =>
                          updateWeight(setItem.id, weight)
                        }
                      />
                    ))}

                    <Button
                      variant="ghost"
                      onPress={() => addSet(exercise.exerciseId)}
                    >
                      Add Set
                    </Button>

                    {activeSession.isFreeWorkout ? (
                      <Button
                        variant="danger"
                        onPress={() => removeExercise(exercise.exerciseId)}
                      >
                        Remove Exercise
                      </Button>
                    ) : null}
                  </Card>
                ))}
              </View>
            </ScrollView>
          ) : (
            <Surface variant="card" className="w-full rounded-xl p-4">
              <Muted className="text-center">
                {activeSession?.isFreeWorkout
                  ? 'No exercises in this free workout yet.'
                  : 'No exercises in this session yet.'}
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
