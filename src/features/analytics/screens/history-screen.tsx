import React from 'react';
import { View } from 'react-native';

import { Body, GlassCard, Heading } from '@shared/components';

export function HistoryScreen(): React.JSX.Element {
  return (
    <View className="flex-1 items-center justify-center bg-surface px-6">
      <GlassCard className="items-center w-full" intensity="medium">
        <Heading className="mb-2">History</Heading>
        <Body className="text-center opacity-60">
          Review your past workouts
        </Body>
      </GlassCard>
    </View>
  );
}
