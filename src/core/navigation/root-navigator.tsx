import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import React from 'react';

import { HistoryScreen } from '@features/analytics';
import { HealthScreen } from '@features/health-tracking';
import { RoutinesScreen } from '@features/routines';
import { ScheduleScreen } from '@features/schedule';
import { WorkoutScreen } from '@features/workout-mode';
import { colors } from '@core/theme';

// ─── Types ─────────────────────────────────────────────────────────────────────

export type RootTabParamList = {
  Workout: undefined;
  Routines: undefined;
  Schedule: undefined;
  History: undefined;
  Profile: undefined;
};

// ─── Navigator ─────────────────────────────────────────────────────────────────

const Tab = createBottomTabNavigator<RootTabParamList>();

/**
 * Root bottom-tab navigator.
 * Wraps all five primary app tabs: Workout, Routines, Schedule, History, Profile.
 */
export function RootNavigator(): React.JSX.Element {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: colors.surface.card,
            borderTopColor: colors.surface.elevated,
          },
          tabBarActiveTintColor: colors.primary[400],
          tabBarInactiveTintColor: colors.text.secondary,
        }}
      >
        <Tab.Screen name="Workout" component={WorkoutScreen} />
        <Tab.Screen name="Routines" component={RoutinesScreen} />
        <Tab.Screen name="Schedule" component={ScheduleScreen} />
        <Tab.Screen name="History" component={HistoryScreen} />
        <Tab.Screen name="Profile" component={HealthScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
