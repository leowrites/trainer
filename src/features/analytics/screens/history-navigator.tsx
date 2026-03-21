import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

import { DEFAULT_PROGRESSION_CONFIG } from '../constants';
import type { HistoryStackParamList } from '../navigation-types';
import type { ProgressiveOverloadConfig } from '../types';
import { HistorySessionDetailScreen } from './history-session-detail-screen';
import { HistoryScreen } from './history-screen';

const Stack = createNativeStackNavigator<HistoryStackParamList>();

interface HistoryNavigatorProps {
  progressionConfig?: ProgressiveOverloadConfig;
}

export function HistoryNavigator({
  progressionConfig = DEFAULT_PROGRESSION_CONFIG,
}: HistoryNavigatorProps = {}): React.JSX.Element {
  return (
    <Stack.Navigator
      screenOptions={{
        headerBackButtonDisplayMode: 'minimal',
        headerTransparent: true,
      }}
    >
      <Stack.Screen
        name="HistoryOverview"
        options={{ headerShown: true, title: '' }}
      >
        {({ navigation }) => (
          <HistoryScreen
            navigation={navigation}
            progressionConfig={progressionConfig}
          />
        )}
      </Stack.Screen>
      <Stack.Screen
        name="HistorySessionDetail"
        options={{
          headerShown: true,
          title: '',
          presentation: 'modal',
        }}
      >
        {({ navigation, route }) => (
          <HistorySessionDetailScreen
            navigation={navigation}
            route={route}
            progressionConfig={progressionConfig}
          />
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
