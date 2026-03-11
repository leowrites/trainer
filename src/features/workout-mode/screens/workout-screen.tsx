import React, { useCallback, useState } from 'react';

import { useFocusEffect } from '@react-navigation/native';

import {
  Badge,
  Body,
  Button,
  Caption,
  Card,
  Container,
  Heading,
  Muted,
  Surface,
} from '@shared/components';
import { useWorkoutStore } from '../store';
import { useWorkoutStarter } from '../hooks/use-workout-starter';

export function WorkoutScreen(): React.JSX.Element {
  const { isWorkoutActive, endWorkout } = useWorkoutStore();
  const {
    nextRoutine,
    startWorkoutFromSchedule,
    startFreeWorkout,
    refreshPreview,
  } = useWorkoutStarter();
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
          <Button variant="ghost" onPress={endWorkout}>
            End Workout
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
