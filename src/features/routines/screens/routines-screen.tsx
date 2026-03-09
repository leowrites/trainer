import React from 'react';
import { Text, View } from 'react-native';

export function RoutinesScreen(): React.JSX.Element {
  return (
    <View className="flex-1 items-center justify-center bg-surface">
      <Text className="text-white text-2xl font-bold mb-2">Routines</Text>
      <Text className="text-white/60 text-sm">
        Manage your workout routines
      </Text>
    </View>
  );
}
