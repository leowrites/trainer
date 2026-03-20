import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

import { ScheduleDetailScreen } from '@features/schedule';
import type { RoutinesStackParamList } from '../types';
import { ExerciseDetailScreen } from './exercise-detail-screen';
import { ExerciseEditorScreen } from './exercise-editor-screen';
import { LibraryScreen } from './library-screen';
import { RoutineDetailScreen } from './routine-detail-screen';
import { RoutineEditorScreen } from './routine-editor-screen';

const Stack = createNativeStackNavigator<RoutinesStackParamList>();

export function RoutinesScreen(): React.JSX.Element {
  return (
    <Stack.Navigator
      screenOptions={{
        headerBackButtonDisplayMode: 'minimal',
        headerTransparent: true,
        headerShown: false,
      }}
    >
      <Stack.Screen
        name="Library"
        component={LibraryScreen}
        options={{ headerShown: true, title: '' }}
      />
      <Stack.Screen
        name="ExerciseDetail"
        component={ExerciseDetailScreen}
        options={{ headerShown: true, presentation: 'modal' }}
      />
      <Stack.Screen
        name="ExerciseEditor"
        component={ExerciseEditorScreen}
        options={{ headerShown: true, presentation: 'modal' }}
      />
      <Stack.Screen
        name="RoutineDetail"
        component={RoutineDetailScreen}
        options={{ headerShown: true, presentation: 'modal' }}
      />
      <Stack.Screen
        name="RoutineEditor"
        component={RoutineEditorScreen}
        options={{ headerShown: true, presentation: 'modal' }}
      />
      <Stack.Screen
        name="ScheduleDetail"
        component={ScheduleDetailScreen}
        options={{ headerShown: true, presentation: 'modal' }}
      />
    </Stack.Navigator>
  );
}
