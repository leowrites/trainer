import React, { useCallback, useState } from 'react';

import { Box } from '@shared/ui/box';
import { Text } from '@shared/ui/text';

import { useFocusEffect } from '@react-navigation/native';

import { useWorkoutStore } from '../store';
import { useWorkoutStarter } from '../hooks/use-workout-starter';
import { Button } from '@shared/components';

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
    <Box className="flex-1 items-center justify-center bg-surface px-6">
      <Text className="text-white text-2xl font-bold mb-2">Workout</Text>

      {isWorkoutActive ? (
        <>
          <Text className="text-white/60 text-sm mb-6">
            Session in progress
          </Text>
          <Button onPress={endWorkout} className="min-w-[170px]">
            End Workout
          </Button>
        </>
      ) : (
        <>
          {nextRoutine ? (
            <Box className="items-center mb-6">
              <Text className="text-white/60 text-xs mb-1 uppercase tracking-wider">
                Up next · {nextRoutine.scheduleName}
              </Text>
              <Text className="text-white text-lg font-semibold">
                {nextRoutine.routineName}
              </Text>
            </Box>
          ) : (
            <Text className="text-white/60 text-sm mb-6">
              No active schedule — start a free workout
            </Text>
          )}

          {nextRoutine ? (
            <Button
              onPress={handleStartScheduled}
              disabled={starting}
              className="mb-3"
            >
              Start {nextRoutine.routineName}
            </Button>
          ) : null}

          <Button variant="ghost" onPress={handleStartFree} disabled={starting}>
            Free Workout
          </Button>
        </>
      )}
    </Box>
  );
}
