export type Section = 'schedules' | 'routines' | 'exercises';

export type RoutinesStackParamList = {
  Library: undefined;
  ExerciseDetail: { exerciseId: string };
  RoutineDetail: { routineId: string };
  ExerciseEditor: { exerciseId?: string };
  RoutineEditor: { routineId?: string };
  ScheduleDetail: { scheduleId?: string };
};

export interface RoutineExerciseDraft {
  exerciseId: string;
  targetSets: string;
  targetReps: string;
}
