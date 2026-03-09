import React from 'react';
import { Text, View } from 'react-native';

export function ProfileScreen(): React.JSX.Element {
  return (
    <View className="flex-1 items-center justify-center bg-surface">
      <Text className="text-white text-2xl font-bold mb-2">Profile</Text>
      <Text className="text-white/60 text-sm">
        Track your health &amp; analytics
      </Text>
    </View>
  );
}
