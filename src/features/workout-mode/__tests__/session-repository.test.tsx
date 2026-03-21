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

import { loadActiveWorkoutSession } from '../session-repository';

describe('session-repository', () => {
  it('merges legacy set-derived exercises with explicit session exercise rows', () => {
    const db = {
      getFirstSync: jest.fn().mockImplementation((query: string) => {
        if (query.includes('FROM workout_sessions WHERE id = ?')) {
          return {
            id: 'session-1',
            snapshot_name: 'Push A',
            start_time: 1,
          };
        }

        return null;
      }),
      getAllSync: jest.fn().mockImplementation((query: string) => {
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

    expect(loadActiveWorkoutSession(db as never, 'session-1')).toEqual({
      id: 'session-1',
      title: 'Push A',
      startTime: 1,
      isFreeWorkout: false,
      exercises: [
        {
          exerciseId: 'exercise-1',
          exerciseName: 'Bench Press',
          restSeconds: null,
          targetSets: 3,
          targetReps: 8,
          sets: [
            {
              id: 'set-a',
              exerciseId: 'exercise-1',
              position: 0,
              reps: 8,
              weight: 100,
              isCompleted: true,
              targetSets: 3,
              targetReps: 8,
            },
          ],
        },
        {
          exerciseId: 'exercise-2',
          exerciseName: 'Incline Press',
          restSeconds: null,
          targetSets: 3,
          targetReps: 10,
          sets: [
            {
              id: 'set-b',
              exerciseId: 'exercise-2',
              position: 0,
              reps: 10,
              weight: 80,
              isCompleted: true,
              targetSets: 3,
              targetReps: 10,
            },
          ],
        },
        {
          exerciseId: 'exercise-3',
          exerciseName: 'Cable Fly',
          restSeconds: 90,
          targetSets: 2,
          targetReps: 12,
          sets: [
            {
              id: 'set-c',
              exerciseId: 'exercise-3',
              position: 0,
              reps: 12,
              weight: 60,
              isCompleted: false,
              targetSets: 2,
              targetReps: 12,
            },
          ],
        },
      ],
    });
  });
});
