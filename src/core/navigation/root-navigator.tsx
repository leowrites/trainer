import { createNativeBottomTabNavigator } from '@react-navigation/bottom-tabs/unstable';
import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import { HistoryScreen } from '@features/analytics';
import { ProfileScreen } from '@features/health-tracking';
import { RoutinesScreen } from '@features/routines';
import { ScheduleScreen } from '@features/schedule';
import { WorkoutScreen, WorkoutSheetHost } from '@features/workout-mode';
import { useWorkoutStore } from '@features/workout-mode/store';
import { useTheme } from '@core/theme/theme-context';

// ─── Types ─────────────────────────────────────────────────────────────────────

export type RootTabParamList = {
  Workout: undefined;
  Routines: undefined;
  Schedule: undefined;
  History: undefined;
  Profile: undefined;
};

// ─── Navigator ─────────────────────────────────────────────────────────────────

const Tab = createNativeBottomTabNavigator<RootTabParamList>();

export type RootStackParamList = {
  Tabs: undefined;
};

function TabNavigator(): React.JSX.Element {
  const { tokens } = useTheme();
  const {
    isWorkoutActive,
    isWorkoutCollapsed,
    activeWorkoutTitle,
    expandWorkout,
  } = useWorkoutStore(
    useShallow((state) => ({
      isWorkoutActive: state.isWorkoutActive,
      isWorkoutCollapsed: state.isWorkoutCollapsed,
      activeWorkoutTitle: state.activeSession?.title ?? 'Workout',
      expandWorkout: state.expandWorkout,
    })),
  );

  return (
    <View className="flex-1" style={{ backgroundColor: tokens.bgBase }}>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
        }}
      >
        <Tab.Screen name="Workout" component={WorkoutScreen} />
        <Tab.Screen name="Routines" component={RoutinesScreen} />
        <Tab.Screen name="Schedule" component={ScheduleScreen} />
        <Tab.Screen name="History" component={HistoryScreen} />
        <Tab.Screen name="Profile" component={ProfileScreen} />
      </Tab.Navigator>

      {isWorkoutActive && isWorkoutCollapsed ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Return to ${activeWorkoutTitle}`}
          className="absolute bottom-24 right-5 h-14 w-14 items-center justify-center rounded-full border border-surface-border bg-surface-card"
          onPress={() => {
            expandWorkout();
          }}
        >
          <Text className="font-heading text-2xl text-foreground">W</Text>
        </Pressable>
      ) : null}

      <WorkoutSheetHost />
    </View>
  );
}

export function RootNavigator(): React.JSX.Element {
  const { tokens } = useTheme();

  const navigationTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      primary: tokens.accent,
      background: tokens.bgBase,
      card: tokens.bgCard,
      text: tokens.textPrimary,
      border: tokens.bgBorder,
      notification: tokens.secondary,
    },
  };

  return (
    <NavigationContainer theme={navigationTheme}>
      <TabNavigator />
    </NavigationContainer>
  );
}
