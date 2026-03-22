import type { HistorySession } from '@features/analytics';
import { buildSessionClassifications } from '../classifiers/session-signals';
import {
  buildExerciseExposureIndex,
  buildExerciseExposures,
} from '../metrics/exposures';
import { buildSessionPrescriptions } from '../prescriptions/recommendations';
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
    endTime: startTime + 1,
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

describe('prescriptions', () => {
  it('holds progression when recent adherence is weak and data quality is not high', () => {
    const sessions = [
      buildSession('current', Date.UTC(2026, 2, 21), 8, 100),
      buildSession('previous-1', Date.UTC(2026, 2, 18), 8, 97.5),
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
    const classifications = buildSessionClassifications(
      sessions[0]!,
      exposuresByExerciseId,
    );

    const [prescription] = buildSessionPrescriptions(
      sessions[0]!,
      classifications,
      exposuresByExerciseId,
      'kg',
    );

    expect(prescription?.action).toBe('hold');
    expect(prescription?.reason).toContain('Recent adherence is mixed');
  });
});
