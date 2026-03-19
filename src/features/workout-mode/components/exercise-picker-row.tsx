import React from 'react';
import { Pressable, Text } from 'react-native';

import { Muted } from '@shared/components';

export function ExercisePickerRow({
  exerciseName,
  muscleGroup,
  onPress,
}: {
  exerciseName: string;
  muscleGroup: string;
  onPress: () => void;
}): React.JSX.Element {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Add ${exerciseName}`}
      className="p-3"
      onPress={onPress}
    >
      <Text className="text-sm text-foreground">{exerciseName}</Text>
      <Muted className="mt-0.5 text-2xs uppercase tracking-[1px]">
        {muscleGroup}
      </Muted>
    </Pressable>
  );
}
