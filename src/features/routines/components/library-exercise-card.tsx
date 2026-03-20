import React from 'react';
import { View } from 'react-native';

import type { Exercise } from '@core/database/types';
import { Body, Card, Muted } from '@shared/components';

export function LibraryExerciseCard({
  exercise,
  onPress,
}: {
  exercise: Exercise;
  onPress: () => void;
}): React.JSX.Element {
  return (
    <Card
      className="mb-3 rounded-[24px] px-5 py-5"
      onPress={onPress}
      accessibilityLabel={`Open ${exercise.name}`}
    >
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-row">
          <Body className="font-heading text-2xl leading-[28px]">
            {exercise.name}
          </Body>
        </View>
        <Muted className="mt-2 text-xs uppercase tracking-[1.3px]">
          {exercise.muscle_group}
        </Muted>
      </View>
    </Card>
  );
}
