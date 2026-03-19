import { Feather } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  createNativeBottomTabNavigator,
  type NativeBottomTabIcon,
} from '@react-navigation/bottom-tabs/unstable';
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
import { Platform, Pressable, Text, View } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import { HistoryScreen } from '@features/analytics';
import { ProfileScreen } from '@features/health-tracking';
import { ExerciseDetailScreen, RoutinesScreen } from '@features/routines';
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
  ExerciseDetail: { exerciseId: string };
};

// ─── Navigator ─────────────────────────────────────────────────────────────────

const BottomTab = createBottomTabNavigator<RootTabParamList>();
const NativeTab = createNativeBottomTabNavigator<RootTabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

function getTabLabel(routeName: keyof RootTabParamList): string {
  return routeName === 'Workout' ? 'Home' : routeName;
}

function getAndroidTabIconName(
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

function getIosTabIcon(
  routeName: keyof RootTabParamList,
  focused: boolean,
): NativeBottomTabIcon {
  switch (routeName) {
    case 'Workout':
      return { type: 'sfSymbol', name: focused ? 'house.fill' : 'house' };
    case 'Routines':
      return {
        type: 'sfSymbol',
        name: focused ? 'square.stack.3d.up.fill' : 'square.stack.3d.up',
      };
    case 'Schedule':
      return {
        type: 'sfSymbol',
        name: focused ? 'calendar.circle.fill' : 'calendar.circle',
      };
    case 'History':
      return {
        type: 'sfSymbol',
        name: focused ? 'chart.bar.fill' : 'chart.bar',
      };
    case 'Profile':
      return {
        type: 'sfSymbol',
        name: focused ? 'person.crop.circle.fill' : 'person.crop.circle',
      };
    default:
      return { type: 'sfSymbol', name: 'circle' };
  }
}

function IosTabs(): React.JSX.Element {
  const { tokens } = useTheme();

  return (
    <NativeTab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        title: getTabLabel(route.name),
        tabBarLabel: getTabLabel(route.name),
        tabBarActiveTintColor: tokens.accent,
        tabBarBlurEffect: 'systemUltraThinMaterial',
        tabBarIcon: ({ focused }) => getIosTabIcon(route.name, focused),
      })}
    >
      <NativeTab.Screen name="Workout" component={WorkoutScreen} />
      <NativeTab.Screen name="Routines" component={RoutinesScreen} />
      <NativeTab.Screen name="Schedule" component={ScheduleScreen} />
      <NativeTab.Screen name="History" component={HistoryScreen} />
      <NativeTab.Screen name="Profile" component={ProfileScreen} />
    </NativeTab.Navigator>
  );
}

function AndroidTabs(): React.JSX.Element {
  const { tokens } = useTheme();

  return (
    <BottomTab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        title: getTabLabel(route.name),
        tabBarLabel: getTabLabel(route.name),
        tabBarActiveTintColor: tokens.accent,
        tabBarInactiveTintColor: tokens.textMuted,
        tabBarStyle: {
          backgroundColor: tokens.bgCard,
          borderTopColor: tokens.bgBorder,
        },
        tabBarIcon: ({ color, size }) => (
          <Feather
            name={getAndroidTabIconName(route.name)}
            color={color}
            size={size}
          />
        ),
      })}
    >
      <BottomTab.Screen name="Workout" component={WorkoutScreen} />
      <BottomTab.Screen name="Routines" component={RoutinesScreen} />
      <BottomTab.Screen name="Schedule" component={ScheduleScreen} />
      <BottomTab.Screen name="History" component={HistoryScreen} />
      <BottomTab.Screen name="Profile" component={ProfileScreen} />
    </BottomTab.Navigator>
  );
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
      {Platform.OS === 'ios' ? <IosTabs /> : <AndroidTabs />}

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
        <Stack.Screen
          name="ExerciseDetail"
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
        >
          {(props) => (
            <ExerciseDetailScreen
              exerciseId={props.route.params.exerciseId}
              navigation={props.navigation}
            />
          )}
        </Stack.Screen>
      </Stack.Navigator>
    </NavigationContainer>
  );
}
