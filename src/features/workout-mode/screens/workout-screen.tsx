import React from 'react';
import { Text, View } from 'react-native';

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
        <Text
          accessible
          accessibilityRole="button"
          className="text-primary-400 text-base"
          onPress={endWorkout}
        >
          End Workout
        </Text>
      ) : (
        <Text
          accessible
          accessibilityRole="button"
          className="text-primary-400 text-base"
          onPress={() => startWorkout('demo-session-1')}
        >
          Start Workout
        </Text>
      )}
    </View>
  );
}
