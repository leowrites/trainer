import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { useWorkoutStore } from '../store';
import { useWorkoutStarter } from '../hooks/use-workout-starter';

export function WorkoutScreen(): React.JSX.Element {
  const { isWorkoutActive, endWorkout } = useWorkoutStore();
  const { nextRoutine, startWorkoutFromSchedule, startFreeWorkout } =
    useWorkoutStarter();

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
            className="px-6 py-3 rounded-lg bg-surface-elevated"
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
            onPress={endWorkout}
          >
            <Text className="text-primary-400 text-base font-semibold">
              End Workout
            </Text>
          </Pressable>
        </>
      ) : (
        <>
          {nextRoutine ? (
            <View className="items-center mb-6">
              <Text className="text-white/60 text-xs mb-1 uppercase tracking-wider">
                Up next · {nextRoutine.scheduleName}
              </Text>
              <Text className="text-white text-lg font-semibold">
                {nextRoutine.routineName}
              </Text>
            </View>
          ) : (
            <Text className="text-white/60 text-sm mb-6">
              No active schedule — start a free workout
            </Text>
          )}

          {nextRoutine ? (
            <Pressable
              accessibilityRole="button"
              className="px-6 py-3 rounded-lg bg-primary-600 mb-3"
              style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
              onPress={() => void startWorkoutFromSchedule()}
            >
              <Text className="text-white text-base font-semibold">
                Start {nextRoutine.routineName}
              </Text>
            </Pressable>
          ) : null}

          <Pressable
            accessibilityRole="button"
            className="px-6 py-3 rounded-lg bg-surface-elevated"
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
            onPress={() => void startFreeWorkout()}
          >
            <Text className="text-white/60 text-base font-semibold">
              Free Workout
            </Text>
          </Pressable>
        </>
      )}
    </View>
  );
}
