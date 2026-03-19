import React from 'react';
import { Text } from 'react-native';

export function WorkoutHeaderRight({
  durationLabel,
}: {
  durationLabel: string;
}): React.JSX.Element {
  return (
    <Text className="p-2 font-heading text-lg text-foreground">
      {durationLabel}
    </Text>
  );
}
