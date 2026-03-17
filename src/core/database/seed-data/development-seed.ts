const DAY = 24 * 60 * 60 * 1000;
const SEED_ANCHOR_TIME = Date.UTC(2025, 2, 10, 12, 0, 0);

export interface DevelopmentRoutineExerciseSeed {
  id: string;
  exerciseName: string;
  position: number;
  targetSets: number;
  targetReps: number;
}

export interface DevelopmentRoutineSeed {
  id: string;
  name: string;
  notes: string | null;
  exercises: DevelopmentRoutineExerciseSeed[];
}

export interface DevelopmentScheduleEntrySeed {
  id: string;
  routineId: string;
  position: number;
}

export interface DevelopmentScheduleSeed {
  id: string;
  name: string;
  isActive: number;
  currentPosition: number;
  entries: DevelopmentScheduleEntrySeed[];
}

export interface DevelopmentWorkoutSetSeed {
  id: string;
  exerciseName: string;
  weight: number;
  reps: number;
  isCompleted: number;
  targetSets: number | null;
  targetReps: number | null;
}

export interface DevelopmentWorkoutSessionSeed {
  id: string;
  routineId: string | null;
  scheduleId: string | null;
  snapshotName: string | null;
  startTime: number;
  endTime: number | null;
  sets: DevelopmentWorkoutSetSeed[];
}

export interface DevelopmentBodyWeightEntrySeed {
  id: string;
  weight: number;
  unit: 'kg' | 'lb';
  loggedAt: number;
  notes: string | null;
}

export interface DevelopmentSeedData {
  routines: DevelopmentRoutineSeed[];
  schedules: DevelopmentScheduleSeed[];
  workoutSessions: DevelopmentWorkoutSessionSeed[];
  bodyWeightEntries: DevelopmentBodyWeightEntrySeed[];
}

export const developmentSeedData: DevelopmentSeedData = {
  routines: [
    {
      id: 'dev-routine-push-a',
      name: 'Push A',
      notes: 'Seeded upper-body workout for local development.',
      exercises: [
        {
          id: 'dev-routine-push-a-bench',
          exerciseName: 'Barbell Bench Press',
          position: 0,
          targetSets: 3,
          targetReps: 8,
        },
        {
          id: 'dev-routine-push-a-incline',
          exerciseName: 'Incline Dumbbell Bench Press',
          position: 1,
          targetSets: 3,
          targetReps: 10,
        },
        {
          id: 'dev-routine-push-a-press',
          exerciseName: 'Overhead Press',
          position: 2,
          targetSets: 3,
          targetReps: 8,
        },
        {
          id: 'dev-routine-push-a-triceps',
          exerciseName: 'Tricep Pushdown',
          position: 3,
          targetSets: 3,
          targetReps: 12,
        },
      ],
    },
    {
      id: 'dev-routine-pull-a',
      name: 'Pull A',
      notes: 'Seeded back and biceps workout for local development.',
      exercises: [
        {
          id: 'dev-routine-pull-a-row',
          exerciseName: 'Barbell Row',
          position: 0,
          targetSets: 3,
          targetReps: 8,
        },
        {
          id: 'dev-routine-pull-a-pulldown',
          exerciseName: 'Lat Pulldown',
          position: 1,
          targetSets: 3,
          targetReps: 10,
        },
        {
          id: 'dev-routine-pull-a-facepull',
          exerciseName: 'Face Pull',
          position: 2,
          targetSets: 2,
          targetReps: 15,
        },
        {
          id: 'dev-routine-pull-a-curl',
          exerciseName: 'Hammer Curl',
          position: 3,
          targetSets: 3,
          targetReps: 10,
        },
      ],
    },
    {
      id: 'dev-routine-lower-a',
      name: 'Lower A',
      notes: 'Seeded leg day for local development.',
      exercises: [
        {
          id: 'dev-routine-lower-a-squat',
          exerciseName: 'Barbell Back Squat',
          position: 0,
          targetSets: 3,
          targetReps: 8,
        },
        {
          id: 'dev-routine-lower-a-rdl',
          exerciseName: 'Romanian Deadlift',
          position: 1,
          targetSets: 3,
          targetReps: 10,
        },
        {
          id: 'dev-routine-lower-a-legpress',
          exerciseName: 'Leg Press',
          position: 2,
          targetSets: 3,
          targetReps: 12,
        },
        {
          id: 'dev-routine-lower-a-calf',
          exerciseName: 'Standing Calf Raise',
          position: 3,
          targetSets: 3,
          targetReps: 15,
        },
      ],
    },
  ],
  schedules: [
    {
      id: 'dev-schedule-strength-rotation',
      name: 'Strength Rotation',
      isActive: 1,
      currentPosition: -1,
      entries: [
        {
          id: 'dev-schedule-strength-entry-1',
          routineId: 'dev-routine-push-a',
          position: 0,
        },
        {
          id: 'dev-schedule-strength-entry-2',
          routineId: 'dev-routine-pull-a',
          position: 1,
        },
        {
          id: 'dev-schedule-strength-entry-3',
          routineId: 'dev-routine-lower-a',
          position: 2,
        },
      ],
    },
    {
      id: 'dev-schedule-hypertrophy',
      name: 'Hypertrophy Rotation',
      isActive: 0,
      currentPosition: 0,
      entries: [
        {
          id: 'dev-schedule-hypertrophy-entry-1',
          routineId: 'dev-routine-pull-a',
          position: 0,
        },
        {
          id: 'dev-schedule-hypertrophy-entry-2',
          routineId: 'dev-routine-push-a',
          position: 1,
        },
        {
          id: 'dev-schedule-hypertrophy-entry-3',
          routineId: 'dev-routine-lower-a',
          position: 2,
        },
      ],
    },
  ],
  workoutSessions: [
    {
      id: 'dev-session-push-a',
      routineId: 'dev-routine-push-a',
      scheduleId: 'dev-schedule-strength-rotation',
      snapshotName: 'Push A',
      startTime: SEED_ANCHOR_TIME - 6 * DAY,
      endTime: SEED_ANCHOR_TIME - 6 * DAY + 58 * 60 * 1000,
      sets: [
        {
          id: 'dev-session-push-a-bench-1',
          exerciseName: 'Barbell Bench Press',
          weight: 135,
          reps: 8,
          isCompleted: 1,
          targetSets: 3,
          targetReps: 8,
        },
        {
          id: 'dev-session-push-a-bench-2',
          exerciseName: 'Barbell Bench Press',
          weight: 140,
          reps: 6,
          isCompleted: 1,
          targetSets: 3,
          targetReps: 8,
        },
        {
          id: 'dev-session-push-a-bench-3',
          exerciseName: 'Barbell Bench Press',
          weight: 140,
          reps: 6,
          isCompleted: 1,
          targetSets: 3,
          targetReps: 8,
        },
        {
          id: 'dev-session-push-a-incline-1',
          exerciseName: 'Incline Dumbbell Bench Press',
          weight: 50,
          reps: 10,
          isCompleted: 1,
          targetSets: 3,
          targetReps: 10,
        },
        {
          id: 'dev-session-push-a-incline-2',
          exerciseName: 'Incline Dumbbell Bench Press',
          weight: 50,
          reps: 10,
          isCompleted: 1,
          targetSets: 3,
          targetReps: 10,
        },
        {
          id: 'dev-session-push-a-incline-3',
          exerciseName: 'Incline Dumbbell Bench Press',
          weight: 50,
          reps: 9,
          isCompleted: 1,
          targetSets: 3,
          targetReps: 10,
        },
      ],
    },
    {
      id: 'dev-session-pull-a',
      routineId: 'dev-routine-pull-a',
      scheduleId: 'dev-schedule-strength-rotation',
      snapshotName: 'Pull A',
      startTime: SEED_ANCHOR_TIME - 3 * DAY,
      endTime: SEED_ANCHOR_TIME - 3 * DAY + 61 * 60 * 1000,
      sets: [
        {
          id: 'dev-session-pull-a-row-1',
          exerciseName: 'Barbell Row',
          weight: 155,
          reps: 8,
          isCompleted: 1,
          targetSets: 3,
          targetReps: 8,
        },
        {
          id: 'dev-session-pull-a-row-2',
          exerciseName: 'Barbell Row',
          weight: 165,
          reps: 6,
          isCompleted: 1,
          targetSets: 3,
          targetReps: 8,
        },
        {
          id: 'dev-session-pull-a-row-3',
          exerciseName: 'Barbell Row',
          weight: 165,
          reps: 6,
          isCompleted: 1,
          targetSets: 3,
          targetReps: 8,
        },
        {
          id: 'dev-session-pull-a-curl-1',
          exerciseName: 'Hammer Curl',
          weight: 25,
          reps: 10,
          isCompleted: 1,
          targetSets: 3,
          targetReps: 10,
        },
        {
          id: 'dev-session-pull-a-curl-2',
          exerciseName: 'Hammer Curl',
          weight: 25,
          reps: 10,
          isCompleted: 1,
          targetSets: 3,
          targetReps: 10,
        },
      ],
    },
    {
      id: 'dev-session-lower-a',
      routineId: 'dev-routine-lower-a',
      scheduleId: 'dev-schedule-strength-rotation',
      snapshotName: 'Lower A',
      startTime: SEED_ANCHOR_TIME - DAY,
      endTime: SEED_ANCHOR_TIME - DAY + 66 * 60 * 1000,
      sets: [
        {
          id: 'dev-session-lower-a-squat-1',
          exerciseName: 'Barbell Back Squat',
          weight: 225,
          reps: 8,
          isCompleted: 1,
          targetSets: 3,
          targetReps: 8,
        },
        {
          id: 'dev-session-lower-a-squat-2',
          exerciseName: 'Barbell Back Squat',
          weight: 235,
          reps: 6,
          isCompleted: 1,
          targetSets: 3,
          targetReps: 8,
        },
        {
          id: 'dev-session-lower-a-rdl-1',
          exerciseName: 'Romanian Deadlift',
          weight: 185,
          reps: 10,
          isCompleted: 1,
          targetSets: 3,
          targetReps: 10,
        },
        {
          id: 'dev-session-lower-a-legpress-1',
          exerciseName: 'Leg Press',
          weight: 360,
          reps: 12,
          isCompleted: 1,
          targetSets: 3,
          targetReps: 12,
        },
        {
          id: 'dev-session-lower-a-calf-1',
          exerciseName: 'Standing Calf Raise',
          weight: 135,
          reps: 15,
          isCompleted: 1,
          targetSets: 3,
          targetReps: 15,
        },
      ],
    },
  ],
  bodyWeightEntries: [
    {
      id: 'dev-body-weight-1',
      weight: 183.4,
      unit: 'lb',
      loggedAt: SEED_ANCHOR_TIME - 7 * DAY,
      notes: 'Seeded morning weigh-in',
    },
    {
      id: 'dev-body-weight-2',
      weight: 182.7,
      unit: 'lb',
      loggedAt: SEED_ANCHOR_TIME - 4 * DAY,
      notes: 'Seeded morning weigh-in',
    },
    {
      id: 'dev-body-weight-3',
      weight: 181.9,
      unit: 'lb',
      loggedAt: SEED_ANCHOR_TIME - DAY,
      notes: 'Seeded morning weigh-in',
    },
  ],
};
