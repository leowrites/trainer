import type { HistorySession } from '@features/analytics';
import { buildSessionRecordBadges } from '../classifiers/session-signals';
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
});
