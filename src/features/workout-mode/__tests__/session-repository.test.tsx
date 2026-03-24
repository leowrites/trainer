jest.mock('@lodev09/react-native-true-sheet', () => {
  const React = require('react');
  const ReactNative = require('react-native');

  return {
    TrueSheet: React.forwardRef(
      (
        { children }: React.PropsWithChildren,
        ref: React.ForwardedRef<{
          present: () => Promise<void>;
          dismiss: () => Promise<void>;
        }>,
      ) => {
        React.useImperativeHandle(ref, () => ({
          present: async () => undefined,
          dismiss: async () => undefined,
        }));

        return <ReactNative.View>{children}</ReactNative.View>;
      },
    ),
  };
});

import {
  loadActiveWorkoutSession,
  loadPreviousExercisePerformanceMap,
} from '../session-repository';

describe('session-repository', () => {
  it('merges legacy set-derived exercises with explicit session exercise rows', async () => {
    const db = {
      getFirstAsync: jest.fn().mockImplementation(async (query: string) => {
        if (query.includes('FROM workout_sessions WHERE id = ?')) {
          return {
            id: 'session-1',
            snapshot_name: 'Push A',
            start_time: 1,
          };
        }

        return null;
      }),
      getAllAsync: jest.fn().mockImplementation(async (query: string) => {
        if (query.includes('FROM workout_session_exercises')) {
          return [
            {
              id: 'session-exercise-3',
              session_id: 'session-1',
              exercise_id: 'exercise-3',
              position: 2,
              rest_seconds: 90,
            },
          ];
        }

        if (query.includes('FROM workout_sets ws')) {
          return [
            {
              id: 'set-a',
              session_id: 'session-1',
              exercise_id: 'exercise-1',
              position: 0,
              weight: 100,
              reps: 8,
              is_completed: 1,
              target_sets: 3,
              target_reps: 8,
            },
            {
              id: 'set-b',
              session_id: 'session-1',
              exercise_id: 'exercise-2',
              position: 0,
              weight: 80,
              reps: 10,
              is_completed: 1,
              target_sets: 3,
              target_reps: 10,
            },
            {
              id: 'set-c',
              session_id: 'session-1',
              exercise_id: 'exercise-3',
              position: 0,
              weight: 60,
              reps: 12,
              is_completed: 0,
              target_sets: 2,
              target_reps: 12,
            },
          ];
        }

        if (query.includes('SELECT id, name FROM exercises WHERE id IN')) {
          return [
            { id: 'exercise-1', name: 'Bench Press' },
            { id: 'exercise-2', name: 'Incline Press' },
            { id: 'exercise-3', name: 'Cable Fly' },
          ];
        }

        return [];
      }),
    };

    await expect(
      loadActiveWorkoutSession(db as never, 'session-1'),
    ).resolves.toEqual({
      id: 'session-1',
      title: 'Push A',
      startTime: 1,
      isFreeWorkout: false,
      exercises: [
        {
          exerciseId: 'exercise-1',
          exerciseName: 'Bench Press',
          restSeconds: null,
          progressionPolicy: 'double_progression',
          targetRir: null,
          targetSets: 3,
          targetReps: 8,
          targetRepsMin: 8,
          targetRepsMax: 8,
          sets: [
            {
              id: 'set-a',
              exerciseId: 'exercise-1',
              position: 0,
              reps: 8,
              weight: 100,
              targetWeight: 100,
              isCompleted: true,
              targetSets: 3,
              targetReps: 8,
              targetRepsMin: 8,
              targetRepsMax: 8,
              actualRir: null,
              setRole: 'work',
            },
          ],
        },
        {
          exerciseId: 'exercise-2',
          exerciseName: 'Incline Press',
          restSeconds: null,
          progressionPolicy: 'double_progression',
          targetRir: null,
          targetSets: 3,
          targetReps: 10,
          targetRepsMin: 10,
          targetRepsMax: 10,
          sets: [
            {
              id: 'set-b',
              exerciseId: 'exercise-2',
              position: 0,
              reps: 10,
              weight: 80,
              targetWeight: 80,
              isCompleted: true,
              targetSets: 3,
              targetReps: 10,
              targetRepsMin: 10,
              targetRepsMax: 10,
              actualRir: null,
              setRole: 'work',
            },
          ],
        },
        {
          exerciseId: 'exercise-3',
          exerciseName: 'Cable Fly',
          restSeconds: 90,
          progressionPolicy: 'double_progression',
          targetRir: null,
          targetSets: 2,
          targetReps: 12,
          targetRepsMin: 12,
          targetRepsMax: 12,
          sets: [
            {
              id: 'set-c',
              exerciseId: 'exercise-3',
              position: 0,
              reps: 12,
              weight: 60,
              targetWeight: 60,
              isCompleted: false,
              targetSets: 2,
              targetReps: 12,
              targetRepsMin: 12,
              targetRepsMax: 12,
              actualRir: null,
              setRole: 'work',
            },
          ],
        },
      ],
    });
  });

  it('loads only the latest completed performance row per exercise', async () => {
    const db = {
      getAllAsync: jest.fn().mockResolvedValue([
        {
          exercise_id: 'exercise-1',
          reps: 6,
          weight: 110,
          end_time: 300,
        },
        {
          exercise_id: 'exercise-2',
          reps: 10,
          weight: 55,
          end_time: 250,
        },
      ]),
    };

    await expect(
      loadPreviousExercisePerformanceMap(db as never, 'current-session', [
        'exercise-1',
        'exercise-2',
      ]),
    ).resolves.toEqual({
      'exercise-1': {
        reps: 6,
        weight: 110,
        completedAt: 300,
      },
      'exercise-2': {
        reps: 10,
        weight: 55,
        completedAt: 250,
      },
    });

    expect(db.getAllAsync).toHaveBeenCalledWith(
      expect.stringContaining('WITH latest_completed_sessions AS'),
      [
        'exercise-1',
        'exercise-2',
        'current-session',
        'exercise-1',
        'exercise-2',
        'current-session',
      ],
    );
  });
});
