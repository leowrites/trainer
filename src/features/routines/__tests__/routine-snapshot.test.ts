import { buildRoutineSnapshot } from '../domain/routine-snapshot';
import type { RoutineExerciseData } from '../domain/routine-snapshot';

// ─── buildRoutineSnapshot ─────────────────────────────────────────────────────

describe('buildRoutineSnapshot', () => {
  const buildExercise = (
    partial: Partial<RoutineExerciseData> & { exerciseId: string },
  ): RoutineExerciseData => ({
    position: 0,
    targetSets: 3,
    targetReps: 10,
    ...partial,
  });

  it('captures the routine name as snapshotName', () => {
    const snapshot = buildRoutineSnapshot('Push A', []);
    expect(snapshot.snapshotName).toBe('Push A');
  });

  it('returns an empty exercises array for a routine with no exercises', () => {
    const snapshot = buildRoutineSnapshot('Empty Routine', []);
    expect(snapshot.exercises).toHaveLength(0);
  });

  it('returns all provided exercises', () => {
    const exercises = [
      buildExercise({ exerciseId: 'e1', position: 0 }),
      buildExercise({ exerciseId: 'e2', position: 1 }),
    ];
    const snapshot = buildRoutineSnapshot('Push A', exercises);
    expect(snapshot.exercises).toHaveLength(2);
  });

  it('sorts exercises by position ascending', () => {
    const exercises = [
      buildExercise({ exerciseId: 'e3', position: 2 }),
      buildExercise({ exerciseId: 'e1', position: 0 }),
      buildExercise({ exerciseId: 'e2', position: 1 }),
    ];
    const snapshot = buildRoutineSnapshot('Push A', exercises);
    const ids = snapshot.exercises.map((e) => e.exerciseId);
    expect(ids).toEqual(['e1', 'e2', 'e3']);
  });

  it('preserves targetSets and targetReps exactly', () => {
    const exercises = [
      buildExercise({
        exerciseId: 'e1',
        position: 0,
        targetSets: 4,
        targetReps: 8,
      }),
    ];
    const snapshot = buildRoutineSnapshot('Pull A', exercises);
    expect(snapshot.exercises[0].targetSets).toBe(4);
    expect(snapshot.exercises[0].targetReps).toBe(8);
  });

  it('does not mutate the original exercises array', () => {
    const exercises = [
      buildExercise({ exerciseId: 'e2', position: 1 }),
      buildExercise({ exerciseId: 'e1', position: 0 }),
    ];
    const originalOrder = exercises.map((e) => e.exerciseId);
    buildRoutineSnapshot('Any', exercises);
    expect(exercises.map((e) => e.exerciseId)).toEqual(originalOrder);
  });

  it('snapshot is an independent copy — mutating result does not affect input', () => {
    const exercises = [buildExercise({ exerciseId: 'e1', position: 0 })];
    const snapshot = buildRoutineSnapshot('Push A', exercises);
    // Mutate snapshot exercises
    snapshot.exercises[0].targetSets = 99;
    // Original input should be unchanged
    expect(exercises[0].targetSets).toBe(3);
  });

  it('handles exercises at the same position (stable-ish sort, no crash)', () => {
    const exercises = [
      buildExercise({ exerciseId: 'e1', position: 0 }),
      buildExercise({ exerciseId: 'e2', position: 0 }),
    ];
    expect(() => buildRoutineSnapshot('Any', exercises)).not.toThrow();
  });

  it('correctly names a snapshot with special characters', () => {
    const snapshot = buildRoutineSnapshot('Push/Pull — Day 1', []);
    expect(snapshot.snapshotName).toBe('Push/Pull — Day 1');
  });
});
