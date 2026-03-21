import {
  buildWorkoutRecordBadges,
  getWorkoutFeedbackOptions,
} from '../domain/workout-summary';
import type { HistorySession } from '@features/analytics';

function buildSession(
  id: string,
  overrides: Partial<HistorySession> = {},
): HistorySession {
  return {
    id,
    routineId: 'routine-1',
    routineName: 'Pull A',
    startTime: 1,
    endTime: 2,
    durationMinutes: 40,
    totalSets: 6,
    totalCompletedSets: 6,
    totalReps: 42,
    totalVolume: 3200,
    exerciseCount: 1,
    exercises: [
      {
        exerciseId: 'exercise-1',
        exerciseName: 'Barbell Row',
        targetSets: 3,
        targetReps: 8,
        sets: [
          {
            id: `${id}-set-1`,
            exerciseId: 'exercise-1',
            reps: 8,
            weight: 100,
            isCompleted: true,
          },
        ],
        totalSets: 3,
        completedSets: 3,
        totalReps: 24,
        totalVolume: 2400,
      },
    ],
    ...overrides,
  };
}

describe('workout summary domain', () => {
  it('builds record badges for new session and exercise highs', () => {
    const currentSession = buildSession('current', {
      totalVolume: 5200,
      exercises: [
        {
          exerciseId: 'exercise-1',
          exerciseName: 'Barbell Row',
          targetSets: 3,
          targetReps: 8,
          sets: [
            {
              id: 'current-set-1',
              exerciseId: 'exercise-1',
              reps: 8,
              weight: 120,
              isCompleted: true,
            },
          ],
          totalSets: 3,
          completedSets: 3,
          totalReps: 24,
          totalVolume: 2880,
        },
      ],
    });

    const previousSessions = [
      buildSession('previous-1', { totalVolume: 4300 }),
      buildSession('previous-2', { totalVolume: 4100 }),
      buildSession('previous-3', { totalVolume: 4000 }),
    ];

    const badges = buildWorkoutRecordBadges(
      currentSession,
      [currentSession, ...previousSessions],
      'kg',
    );

    expect(badges.map((badge) => badge.label)).toEqual(
      expect.arrayContaining(['Session Volume', 'Estimated 1RM', 'Volume PR']),
    );
  });

  it('returns distinct option scales for effort and fatigue', () => {
    expect(getWorkoutFeedbackOptions('effort').at(-1)?.title).toBe('Max');
    expect(getWorkoutFeedbackOptions('fatigue').at(-1)?.title).toBe('Drained');
  });
});
