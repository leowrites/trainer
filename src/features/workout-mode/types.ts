export interface ActiveWorkoutSet {
  id: string;
  exerciseId: string;
  reps: number;
  weight: number;
  isCompleted: boolean;
}

export interface ActiveWorkoutExercise {
  exerciseId: string;
  exerciseName: string;
  sets: ActiveWorkoutSet[];
}

export interface ActiveWorkoutSession {
  id: string;
  title: string;
  startTime: number;
  exercises: ActiveWorkoutExercise[];
}

export interface WorkoutSessionRow {
  id: string;
  snapshot_name: string | null;
  start_time: number;
}

export interface WorkoutSetRow {
  id: string;
  session_id: string;
  exercise_id: string;
  weight: number;
  reps: number;
  is_completed: number;
}

export interface ExerciseNameRow {
  id: string;
  name: string;
}
