import React from 'react';
import { Text, View } from 'react-native';

export function WorkoutHeaderTitle({
  title,
  completedExerciseCount,
  totalExerciseCount,
}: {
  title: string;
  completedExerciseCount: number;
  totalExerciseCount: number;
}): React.JSX.Element {
  return (
    <View className="max-w-[220px]">
      <Text numberOfLines={1} className="font-heading text-lg text-foreground">
        {title}
      </Text>
      <Text numberOfLines={1} className="mt-0.5 font-body text-xs text-muted">
        {completedExerciseCount}/{totalExerciseCount} exercises
      </Text>
    </View>
  );
}
