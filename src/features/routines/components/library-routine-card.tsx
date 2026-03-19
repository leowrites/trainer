import React from 'react';
import { View } from 'react-native';

import type { Routine } from '@core/database/types';
import { Body, Card, Muted } from '@shared/components';

export function LibraryRoutineCard({
  routine,
  exerciseCount,
  onPress,
}: {
  routine: Routine;
  exerciseCount: number;
  onPress: () => void;
}): React.JSX.Element {
  return (
    <Card
      className="mb-3 rounded-[24px] px-5 py-5"
      onPress={onPress}
      accessibilityLabel={`Open ${routine.name}`}
    >
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <Body className="font-heading text-2xl leading-[28px]">
            {routine.name}
          </Body>
          <Muted className="mt-2 text-sm leading-[18px]">
            {exerciseCount} exercises in this routine
          </Muted>
        </View>
      </View>
    </Card>
  );
}
