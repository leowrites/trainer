import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

import type { RoutinesStackParamList } from '../types';
import { ExerciseDetailScreen } from './exercise-detail-screen';
import { LibraryScreen } from './library-screen';
import { RoutineDetailScreen } from './routine-detail-screen';

const Stack = createNativeStackNavigator<RoutinesStackParamList>();

export function RoutinesScreen(): React.JSX.Element {
  return (
    <Stack.Navigator
      screenOptions={{
        headerBackButtonDisplayMode: 'minimal',
        headerTransparent: true,
      }}
    >
      <Stack.Screen
        name="Library"
        component={LibraryScreen}
        options={{ title: '', headerShown: true }}
      />
      <Stack.Screen name="ExerciseDetail" component={ExerciseDetailScreen} />
      <Stack.Screen name="RoutineDetail" component={RoutineDetailScreen} />
    </Stack.Navigator>
  );
}
