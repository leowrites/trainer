import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

import type { HistoryStackParamList } from '../navigation-types';
import { HistorySessionDetailScreen } from './history-session-detail-screen';
import { HistoryScreen } from './history-screen';

const Stack = createNativeStackNavigator<HistoryStackParamList>();

export function HistoryNavigator(): React.JSX.Element {
  return (
    <Stack.Navigator
      screenOptions={{
        headerBackButtonDisplayMode: 'minimal',
        headerTransparent: true,
      }}
    >
      <Stack.Screen
        name="HistoryOverview"
        component={HistoryScreen}
        options={{ headerShown: true, title: '' }}
      />
      <Stack.Screen
        name="HistorySessionDetail"
        component={HistorySessionDetailScreen}
        options={{
          headerShown: true,
          title: '',
          presentation: 'modal',
        }}
      />
    </Stack.Navigator>
  );
}
