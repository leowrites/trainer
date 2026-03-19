import { Feather } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  DefaultTheme,
  type NavigatorScreenParams,
  NavigationContainer,
} from '@react-navigation/native';
import {
  createNativeStackNavigator,
  type NativeStackScreenProps,
} from '@react-navigation/native-stack';
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import { HistoryScreen } from '@features/analytics';
import { ProfileScreen } from '@features/health-tracking';
import { RoutinesScreen } from '@features/routines';
import { ScheduleScreen } from '@features/schedule';
import { WorkoutActiveScreen, WorkoutScreen } from '@features/workout-mode';
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

export type RootStackParamList = {
  Tabs: NavigatorScreenParams<RootTabParamList>;
  ActiveWorkout: undefined;
};

// ─── Navigator ─────────────────────────────────────────────────────────────────

const Tab = createBottomTabNavigator<RootTabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

function getTabIconName(
  routeName: keyof RootTabParamList,
): React.ComponentProps<typeof Feather>['name'] {
  switch (routeName) {
    case 'Workout':
      return 'home';
    case 'Routines':
      return 'layers';
    case 'Schedule':
      return 'calendar';
    case 'History':
      return 'bar-chart-2';
    case 'Profile':
      return 'user';
    default:
      return 'circle';
  }
}

function TabNavigator({
  navigation,
}: NativeStackScreenProps<RootStackParamList, 'Tabs'>): React.JSX.Element {
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
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: tokens.accent,
          tabBarInactiveTintColor: tokens.textMuted,
          tabBarStyle: {
            backgroundColor: tokens.bgCard,
            borderTopColor: tokens.bgBorder,
          },
          tabBarIcon: ({ color, size }) => (
            <Feather
              name={getTabIconName(route.name)}
              color={color}
              size={size}
            />
          ),
        })}
      >
        <Tab.Screen
          name="Workout"
          component={WorkoutScreen}
          options={{
            title: 'Home',
          }}
        />
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
            navigation.navigate('ActiveWorkout');
          }}
        >
          <Text className="font-heading text-2xl text-foreground">W</Text>
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
            headerTintColor: tokens.textPrimary,
            headerBackButtonDisplayMode: 'minimal',
            headerStyle: {
              backgroundColor: tokens.bgBase,
            },
            contentStyle: {
              backgroundColor: tokens.bgBase,
            },
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
