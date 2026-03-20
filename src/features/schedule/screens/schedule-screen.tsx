import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

import type { ScheduleStackParamList } from '../types';
import { ScheduleDetailScreen } from './schedule-detail-screen';
import { ScheduleListScreen } from './schedule-list-screen';

const Stack = createNativeStackNavigator<ScheduleStackParamList>();

export function ScheduleScreen(): React.JSX.Element {
  return (
    <Stack.Navigator
      screenOptions={{
        headerBackButtonDisplayMode: 'minimal',
        headerTransparent: true,
      }}
    >
      <Stack.Screen
        name="ScheduleList"
        component={ScheduleListScreen}
        options={{ title: '', headerShown: true }}
      />
      <Stack.Screen
        name="ScheduleDetail"
        component={ScheduleDetailScreen}
        options={{
          title: '',
          headerShown: true,
          presentation: 'fullScreenModal',
        }}
      />
    </Stack.Navigator>
  );
}
