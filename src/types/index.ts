export interface Exercise {
  id: string;
  name: string;
  muscleGroup: string;
  secondaryMuscles: string[];
  equipment: string;
  notes: string;
  createdAt: number;
}

export interface RoutineExercise {
  id: string;
  routineId: string;
  exerciseId: string;
  orderIndex: number;
  targetSets: number;
  targetReps: string;
  targetWeight: number;
  restSeconds: number;
  notes: string;
  exercise?: Exercise;
}

export interface Routine {
  id: string;
  name: string;
  description: string;
  createdAt: number;
  updatedAt: number;
  exercises?: RoutineExercise[];
}

export interface Schedule {
  id: string;
  name: string;
  isActive: boolean;
  currentIndex: number;
  createdAt: number;
  days?: ScheduleDay[];
}

export interface ScheduleDay {
  id: string;
  scheduleId: string;
  routineId: string;
  orderIndex: number;
  routine?: Routine;
}

export interface Workout {
  id: string;
  routineId?: string;
  scheduleId?: string;
  name: string;
  startedAt: number;
  endedAt?: number;
  durationSeconds?: number;
  notes: string;
  bodyweight?: number;
  sets?: WorkoutSet[];
}

export interface WorkoutSet {
  id: string;
  workoutId: string;
  exerciseId: string;
  setNumber: number;
  reps?: number;
  weight?: number;
  weightUnit: 'kg' | 'lbs';
  rpe?: number;
  isWarmup: boolean;
  completed: boolean;
  completedAt?: number;
  notes: string;
  exercise?: Exercise;
}

export interface HealthLog {
  id: string;
  date: string;
  type: 'bodyweight' | 'steps' | 'activity';
  value: number;
  unit: string;
  notes: string;
  loggedAt: number;
}

export interface ActiveWorkout {
  workout: Workout;
  sets: ActiveSet[];
  timerSeconds: number;
  restTimerSeconds: number;
  isRestTimerRunning: boolean;
}

export interface ActiveSet extends WorkoutSet {
  isActive: boolean;
}

export type MuscleGroup =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'forearms'
  | 'abs'
  | 'quads'
  | 'hamstrings'
  | 'glutes'
  | 'calves'
  | 'traps'
  | 'lats';
