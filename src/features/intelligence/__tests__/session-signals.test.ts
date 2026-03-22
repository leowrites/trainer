import type { HistorySession } from '@features/analytics';
import {
  buildSessionClassifications,
  buildSessionRecordBadges,
} from '../classifiers/session-signals';
import {
  buildExerciseExposureIndex,
  buildExerciseExposures,
} from '../metrics/exposures';
import type { ExerciseCapability } from '../types';

function buildSession(
  id: string,
  startTime: number,
  reps: number,
  weight: number,
): HistorySession {
  return {
    id,
    routineId: 'routine-1',
    routineName: 'Upper A',
    startTime,
    endTime: startTime + 1000,
    durationMinutes: 45,
    totalSets: 3,
    totalCompletedSets: 3,
    totalReps: reps * 3,
    totalVolume: reps * weight * 3,
    exerciseCount: 1,
    exercises: [
      {
        exerciseId: 'exercise-1',
        exerciseName: 'Bench Press',
        progressionPolicy: 'double_progression',
        targetRir: 2,
        targetSets: 3,
        targetReps: 8,
        targetRepsMin: 8,
        targetRepsMax: 8,
        sets: [
          {
            id: `${id}-set-1`,
            exerciseId: 'exercise-1',
            reps,
            weight,
            isCompleted: true,
            actualRir: 2,
            setRole: 'work',
          },
          {
            id: `${id}-set-2`,
            exerciseId: 'exercise-1',
            reps,
            weight,
            isCompleted: true,
            actualRir: 2,
            setRole: 'work',
          },
          {
            id: `${id}-set-3`,
            exerciseId: 'exercise-1',
            reps,
            weight,
            isCompleted: true,
            actualRir: 2,
            setRole: 'work',
          },
        ],
        totalSets: 3,
        completedSets: 3,
        totalReps: reps * 3,
        totalVolume: reps * weight * 3,
      },
    ],
  };
}

describe('session signals', () => {
  it('detects rep PRs at a matched load and target-hit streak PRs', () => {
    const sessions = [
      buildSession('current', 3, 10, 100),
      buildSession('previous-1', 2, 9, 100),
      buildSession('previous-2', 1, 8, 100),
    ];
    const capabilitiesByExerciseId: Record<string, ExerciseCapability> = {
      'exercise-1': {
        exerciseId: 'exercise-1',
        exerciseName: 'Bench Press',
        muscleGroup: 'Chest',
        strengthEstimationMode: 'primary',
      },
    };
    const exposuresByExerciseId = buildExerciseExposureIndex(
      buildExerciseExposures(sessions, capabilitiesByExerciseId),
    );

    const badges = buildSessionRecordBadges(
      sessions[0]!,
      exposuresByExerciseId,
      capabilitiesByExerciseId,
    );

    expect(badges.map((badge) => badge.label)).toEqual(
      expect.arrayContaining(['Rep PR', 'Target Streak']),
    );
  });

  it('does not count set-specific backoff targets as misses', () => {
    const session: HistorySession = {
      id: 'current',
      routineId: 'routine-1',
      routineName: 'Upper A',
      startTime: 3,
      endTime: 4,
      durationMinutes: 45,
      totalSets: 2,
      totalCompletedSets: 2,
      totalReps: 13,
      totalVolume: 930,
      exerciseCount: 1,
      exercises: [
        {
          exerciseId: 'exercise-1',
          exerciseName: 'Bench Press',
          progressionPolicy: 'top_set_backoff',
          targetRir: 2,
          targetSets: 2,
          targetReps: 8,
          targetRepsMin: 8,
          targetRepsMax: 8,
          sets: [
            {
              id: 'set-1',
              exerciseId: 'exercise-1',
              reps: 8,
              weight: 80,
              isCompleted: true,
              targetReps: 8,
              targetRepsMin: 8,
              targetRepsMax: 8,
              actualRir: 2,
              setRole: 'top_set',
            },
            {
              id: 'set-2',
              exerciseId: 'exercise-1',
              reps: 5,
              weight: 58,
              isCompleted: true,
              targetReps: 5,
              targetRepsMin: 5,
              targetRepsMax: 5,
              actualRir: 2,
              setRole: 'backoff',
            },
          ],
          totalSets: 2,
          completedSets: 2,
          totalReps: 13,
          totalVolume: 930,
        },
      ],
    };
    const capabilitiesByExerciseId: Record<string, ExerciseCapability> = {
      'exercise-1': {
        exerciseId: 'exercise-1',
        exerciseName: 'Bench Press',
        muscleGroup: 'Chest',
        strengthEstimationMode: 'primary',
      },
    };
    const exposuresByExerciseId = buildExerciseExposureIndex(
      buildExerciseExposures([session], capabilitiesByExerciseId),
    );

    const classifications = buildSessionClassifications(
      session,
      exposuresByExerciseId,
    );

    expect(classifications[0]).toMatchObject({
      targetMiss: 'none',
      overshotEffort: false,
    });
  });

  it('compares session volume PRs against prior session totals, not per-exercise exposure volume', () => {
    const currentSession: HistorySession = {
      id: 'current',
      routineId: 'routine-1',
      routineName: 'Upper A',
      startTime: 3,
      endTime: 4,
      durationMinutes: 45,
      totalSets: 2,
      totalCompletedSets: 2,
      totalReps: 12,
      totalVolume: 600,
      exerciseCount: 1,
      exercises: [
        {
          exerciseId: 'exercise-1',
          exerciseName: 'Bench Press',
          progressionPolicy: 'double_progression',
          targetRir: 2,
          targetSets: 2,
          targetReps: 6,
          targetRepsMin: 6,
          targetRepsMax: 6,
          sets: [
            {
              id: 'current-set-1',
              exerciseId: 'exercise-1',
              reps: 6,
              weight: 50,
              isCompleted: true,
              actualRir: 2,
              setRole: 'work',
            },
            {
              id: 'current-set-2',
              exerciseId: 'exercise-1',
              reps: 6,
              weight: 50,
              isCompleted: true,
              actualRir: 2,
              setRole: 'work',
            },
          ],
          totalSets: 2,
          completedSets: 2,
          totalReps: 12,
          totalVolume: 600,
        },
      ],
    };
    const priorSession: HistorySession = {
      id: 'prior',
      routineId: 'routine-1',
      routineName: 'Upper A',
      startTime: 2,
      endTime: 3,
      durationMinutes: 45,
      totalSets: 2,
      totalCompletedSets: 2,
      totalReps: 10,
      totalVolume: 1000,
      exerciseCount: 2,
      exercises: [
        {
          exerciseId: 'exercise-1',
          exerciseName: 'Bench Press',
          progressionPolicy: 'double_progression',
          targetRir: 2,
          targetSets: 1,
          targetReps: 5,
          targetRepsMin: 5,
          targetRepsMax: 5,
          sets: [
            {
              id: 'prior-set-1',
              exerciseId: 'exercise-1',
              reps: 5,
              weight: 100,
              isCompleted: true,
              actualRir: 2,
              setRole: 'work',
            },
          ],
          totalSets: 1,
          completedSets: 1,
          totalReps: 5,
          totalVolume: 500,
        },
        {
          exerciseId: 'exercise-2',
          exerciseName: 'Row',
          progressionPolicy: 'double_progression',
          targetRir: 2,
          targetSets: 1,
          targetReps: 5,
          targetRepsMin: 5,
          targetRepsMax: 5,
          sets: [
            {
              id: 'prior-set-2',
              exerciseId: 'exercise-2',
              reps: 5,
              weight: 100,
              isCompleted: true,
              actualRir: 2,
              setRole: 'work',
            },
          ],
          totalSets: 1,
          completedSets: 1,
          totalReps: 5,
          totalVolume: 500,
        },
      ],
    };
    const capabilitiesByExerciseId: Record<string, ExerciseCapability> = {
      'exercise-1': {
        exerciseId: 'exercise-1',
        exerciseName: 'Bench Press',
        muscleGroup: 'Chest',
        strengthEstimationMode: 'primary',
      },
      'exercise-2': {
        exerciseId: 'exercise-2',
        exerciseName: 'Row',
        muscleGroup: 'Back',
        strengthEstimationMode: 'primary',
      },
    };
    const exposuresByExerciseId = buildExerciseExposureIndex(
      buildExerciseExposures(
        [currentSession, priorSession],
        capabilitiesByExerciseId,
      ),
    );

    const badges = buildSessionRecordBadges(
      currentSession,
      exposuresByExerciseId,
      capabilitiesByExerciseId,
    );

    expect(badges.map((badge) => badge.label)).not.toContain('Session Volume');
  });
});
