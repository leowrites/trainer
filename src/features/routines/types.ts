export type Section = 'exercises' | 'routines';

export type RoutinesStackParamList = {
  Library: undefined;
  ExerciseDetail: { exerciseId: string };
  RoutineDetail: { routineId: string };
};

export interface RoutineExerciseDraft {
  exerciseId: string;
  targetSets: string;
  targetReps: string;
}
