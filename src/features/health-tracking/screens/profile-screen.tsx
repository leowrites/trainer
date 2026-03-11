import React from 'react';
import { View } from 'react-native';

import { Body, GlassCard, Heading } from '@shared/components';

export function ProfileScreen(): React.JSX.Element {
  return (
    <View className="flex-1 items-center justify-center bg-surface px-6">
      <GlassCard className="items-center w-full" intensity="medium">
        <Heading className="mb-2">Profile</Heading>
        <Body className="text-center opacity-60">
          Track your health &amp; analytics
        </Body>
      </GlassCard>
    </View>
  );
}
