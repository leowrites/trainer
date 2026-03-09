import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { useWorkoutStore } from '../store';

export function WorkoutScreen(): React.JSX.Element {
  const { isWorkoutActive, startWorkout, endWorkout } = useWorkoutStore();

  return (
    <View className="flex-1 items-center justify-center bg-surface">
      <Text className="text-white text-2xl font-bold mb-2">Workout</Text>
      <Text className="text-white/60 text-sm mb-6">
        {isWorkoutActive ? 'Session in progress' : 'No active session'}
      </Text>
      {isWorkoutActive ? (
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
      ) : (
        <Pressable
          accessibilityRole="button"
          className="px-6 py-3 rounded-lg bg-primary-600"
          style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          onPress={() => startWorkout('demo-session-1')}
        >
          <Text className="text-white text-base font-semibold">
            Start Workout
          </Text>
        </Pressable>
      )}
    </View>
  );
}
