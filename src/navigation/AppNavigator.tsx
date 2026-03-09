import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Text } from 'react-native';
import { useTheme } from 'react-native-paper';

import DashboardScreen from '../screens/DashboardScreen';
import RoutinesScreen from '../screens/RoutinesScreen';
import HistoryScreen from '../screens/HistoryScreen';
import ProgressScreen from '../screens/ProgressScreen';
import HealthScreen from '../screens/HealthScreen';
import ScheduleScreen from '../screens/ScheduleScreen';
import WorkoutScreen from '../screens/WorkoutScreen';

import { RootStackParamList, TabParamList } from './types';

const Tab = createBottomTabNavigator<TabParamList>();
const Stack = createStackNavigator<RootStackParamList>();

const TAB_ICONS: Record<string, string> = {
  Dashboard: '🏠',
  Routines: '📋',
  History: '📅',
  Progress: '📈',
  Health: '❤️',
  Schedule: '🗓️',
};

function MainTabs() {
  const theme = useTheme();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused }) => (
          <Text style={{ fontSize: focused ? 22 : 18 }}>{TAB_ICONS[route.name]}</Text>
        ),
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: '#888',
        headerShown: false,
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Routines" component={RoutinesScreen} />
      <Tab.Screen name="History" component={HistoryScreen} />
      <Tab.Screen name="Progress" component={ProgressScreen} />
      <Tab.Screen name="Health" component={HealthScreen} />
      <Tab.Screen name="Schedule" component={ScheduleScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const theme = useTheme();
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.primary },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    >
      <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
      <Stack.Screen name="WorkoutMode" component={WorkoutScreen} options={{ title: 'Workout' }} />
      <Stack.Screen name="RoutineDetail" component={RoutinesScreen} options={{ title: 'Routine' }} />
      <Stack.Screen name="WorkoutDetail" component={HistoryScreen} options={{ title: 'Workout Details' }} />
      <Stack.Screen name="ExerciseProgress" component={ProgressScreen} options={({ route }) => ({ title: route.params.exerciseName })} />
    </Stack.Navigator>
  );
}
