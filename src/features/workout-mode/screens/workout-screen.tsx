import React, { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { useFocusEffect } from '@react-navigation/native';

import { GlassCard, GlassView } from '@shared/components';

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
    <View className="flex-1 items-center justify-center bg-surface px-6">
      <Text className="text-white text-2xl font-bold mb-2">Workout</Text>

      {isWorkoutActive ? (
        <>
          <Text className="text-white/60 text-sm mb-6">
            Session in progress
          </Text>
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => ({
              opacity: pressed ? 0.7 : 1,
            })}
            onPress={endWorkout}
          >
            <GlassView className="px-6 py-3 items-center" borderRadius={8}>
              <Text className="text-primary-400 text-base font-semibold">
                End Workout
              </Text>
            </GlassView>
          </Pressable>
        </>
      ) : (
        <>
          {nextRoutine ? (
            <GlassCard
              className="items-center mb-6 w-full"
              intensity="medium"
              borderRadius={12}
            >
              <Text className="text-white/60 text-xs mb-1 uppercase tracking-wider">
                Up next · {nextRoutine.scheduleName}
              </Text>
              <Text className="text-white text-lg font-semibold">
                {nextRoutine.routineName}
              </Text>
            </GlassCard>
          ) : (
            <Text className="text-white/60 text-sm mb-6">
              No active schedule — start a free workout
            </Text>
          )}

          {nextRoutine ? (
            <Pressable
              accessibilityRole="button"
              className="px-6 py-3 rounded-lg bg-primary-600 mb-3"
              style={({ pressed }) => ({
                opacity: pressed || starting ? 0.7 : 1,
              })}
              disabled={starting}
              onPress={handleStartScheduled}
            >
              <Text className="text-white text-base font-semibold">
                Start {nextRoutine.routineName}
              </Text>
            </Pressable>
          ) : null}

          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => ({
              opacity: pressed || starting ? 0.7 : 1,
            })}
            disabled={starting}
            onPress={handleStartFree}
          >
            <GlassView className="px-6 py-3 items-center" borderRadius={8}>
              <Text className="text-white/60 text-base font-semibold">
                Free Workout
              </Text>
            </GlassView>
          </Pressable>
        </>
      )}
    </View>
  );
}
