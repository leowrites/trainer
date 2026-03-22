import type { ProgressionPolicy, RoutineSetRole } from './template-types';

export type Section = 'schedules' | 'routines' | 'exercises';

export type RoutinesStackParamList = {
  Library: undefined;
  ExerciseDetail: { exerciseId: string };
  RoutineDetail: { routineId: string };
  ExerciseEditor: { exerciseId?: string };
  RoutineEditor: { routineId?: string };
  ScheduleDetail: { scheduleId?: string };
};

export interface RoutineSetDraft {
  id: string;
  targetRepsMin: string;
  targetRepsMax: string;
  plannedWeight: string;
  setRole: RoutineSetRole;
}

export interface RoutineExerciseDraft {
  exerciseId: string;
  restSeconds: string;
  progressionPolicy: ProgressionPolicy;
  targetRir: string;
  sets: RoutineSetDraft[];
}
