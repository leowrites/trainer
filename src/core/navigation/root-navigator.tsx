import { createNativeBottomTabNavigator } from '@react-navigation/bottom-tabs/unstable';
import {
  DarkTheme,
  type NavigationProp,
  type NavigatorScreenParams,
  NavigationContainer,
  useNavigation,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { HistoryScreen } from '@features/analytics';
import { ProfileScreen } from '@features/health-tracking';
import { RoutinesScreen } from '@features/routines';
import { ScheduleScreen } from '@features/schedule';
import { WorkoutActiveScreen, WorkoutScreen } from '@features/workout-mode';
import { useWorkoutStore } from '@features/workout-mode/store';
import { colors } from '@core/theme';

// ─── Types ─────────────────────────────────────────────────────────────────────

export type RootTabParamList = {
  Workout: undefined;
  Routines: undefined;
  Schedule: undefined;
  History: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  Tabs: NavigatorScreenParams<RootTabParamList>;
  ActiveWorkout: undefined;
};

// ─── Navigator ─────────────────────────────────────────────────────────────────

const Tab = createNativeBottomTabNavigator<RootTabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

function TabNavigator(): React.JSX.Element {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { isWorkoutActive, isWorkoutCollapsed, activeSession, expandWorkout } =
    useWorkoutStore();

  return (
    <View
      className="flex-1"
      style={{ backgroundColor: colors.surface.DEFAULT }}
    >
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

      {isWorkoutActive && isWorkoutCollapsed && activeSession ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Return to ${activeSession.title}`}
          className="absolute bottom-24 right-5 h-14 w-14 items-center justify-center rounded-full border border-surface-border bg-surface-card"
          onPress={() => {
            expandWorkout();
            navigation.navigate('ActiveWorkout');
          }}
        >
          <Text className="font-heading text-[24px] text-foreground">W</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/**
 * Root navigation with tabs as the base shell and workout mode promoted to a
 * dedicated full-screen native stack screen.
 */
export function RootNavigator(): React.JSX.Element {
  const navigationTheme = {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      primary: colors.primary[400],
      background: colors.surface.DEFAULT,
      card: colors.surface.card,
      text: colors.text.primary,
      border: colors.surface.border,
      notification: colors.secondary.DEFAULT,
    },
  };

  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="Tabs" component={TabNavigator} />
        <Stack.Screen
          name="ActiveWorkout"
          component={WorkoutActiveScreen}
          options={{
            headerShown: true,
            title: '',
            headerTintColor: colors.text.primary,
            headerBackButtonDisplayMode: 'minimal',
            headerShadowVisible: false,
            headerStyle: {
              backgroundColor: colors.surface.DEFAULT,
            },
            contentStyle: {
              backgroundColor: colors.surface.DEFAULT,
            },
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
