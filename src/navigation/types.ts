import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

export type RootStackParamList = {
  MainTabs: undefined;
  WorkoutMode: { routineId?: string; workoutId?: string };
  RoutineDetail: { routineId: string };
  WorkoutDetail: { workoutId: string };
  ExerciseProgress: { exerciseId: string; exerciseName: string };
};

export type TabParamList = {
  Dashboard: undefined;
  Routines: undefined;
  History: undefined;
  Progress: undefined;
  Health: undefined;
  Schedule: undefined;
};

export type WorkoutModeProps = {
  navigation: StackNavigationProp<RootStackParamList, 'WorkoutMode'>;
  route: RouteProp<RootStackParamList, 'WorkoutMode'>;
};

export type RoutineDetailProps = {
  navigation: StackNavigationProp<RootStackParamList, 'RoutineDetail'>;
  route: RouteProp<RootStackParamList, 'RoutineDetail'>;
};

export type WorkoutDetailProps = {
  navigation: StackNavigationProp<RootStackParamList, 'WorkoutDetail'>;
  route: RouteProp<RootStackParamList, 'WorkoutDetail'>;
};

export type ExerciseProgressProps = {
  navigation: StackNavigationProp<RootStackParamList, 'ExerciseProgress'>;
  route: RouteProp<RootStackParamList, 'ExerciseProgress'>;
};
