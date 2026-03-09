import { buildRoutineSnapshot } from '../domain/routine-snapshot';
import type { RoutineExerciseData } from '../domain/routine-snapshot';

const exercises: RoutineExerciseData[] = [
  { exerciseId: 'ex-bench', position: 0, targetSets: 4, targetReps: 8 },
  { exerciseId: 'ex-incline', position: 1, targetSets: 3, targetReps: 10 },
  { exerciseId: 'ex-fly', position: 2, targetSets: 3, targetReps: 12 },
];

describe('buildRoutineSnapshot', () => {
  it('captures the routine name in the snapshot', () => {
    const snapshot = buildRoutineSnapshot('Push A', exercises);
    expect(snapshot.snapshotName).toBe('Push A');
  });

  it('preserves all exercise entries', () => {
    const snapshot = buildRoutineSnapshot('Push A', exercises);
    expect(snapshot.exercises).toHaveLength(3);
  });

  it('sorts exercises by position ascending', () => {
    const unordered: RoutineExerciseData[] = [
      { exerciseId: 'ex-fly', position: 2, targetSets: 3, targetReps: 12 },
      { exerciseId: 'ex-bench', position: 0, targetSets: 4, targetReps: 8 },
      { exerciseId: 'ex-incline', position: 1, targetSets: 3, targetReps: 10 },
    ];
    const snapshot = buildRoutineSnapshot('Push A', unordered);
    expect(snapshot.exercises[0].exerciseId).toBe('ex-bench');
    expect(snapshot.exercises[1].exerciseId).toBe('ex-incline');
    expect(snapshot.exercises[2].exerciseId).toBe('ex-fly');
  });

  it('does not mutate the original exercises array', () => {
    const original = [...exercises];
    buildRoutineSnapshot('Push A', exercises);
    expect(exercises).toEqual(original);
  });

  it('handles an empty exercise list', () => {
    const snapshot = buildRoutineSnapshot('Empty Routine', []);
    expect(snapshot.snapshotName).toBe('Empty Routine');
    expect(snapshot.exercises).toHaveLength(0);
  });

  it('returns a new exercises array (not the same reference)', () => {
    const snapshot = buildRoutineSnapshot('Push A', exercises);
    expect(snapshot.exercises).not.toBe(exercises);
  });

  it('snapshot is independent: mutating source does not affect snapshot', () => {
    const mutable: RoutineExerciseData[] = [
      { exerciseId: 'ex-bench', position: 0, targetSets: 4, targetReps: 8 },
    ];
    const snapshot = buildRoutineSnapshot('Push A', mutable);
    // Simulate adding a new exercise to the routine after snapshot
    mutable.push({
      exerciseId: 'ex-new',
      position: 1,
      targetSets: 3,
      targetReps: 12,
    });
    expect(snapshot.exercises).toHaveLength(1);
    expect(snapshot.exercises[0].exerciseId).toBe('ex-bench');
  });
});
