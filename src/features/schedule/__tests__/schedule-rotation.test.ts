import {
  getNextPosition,
  selectNextRoutineId,
} from '../domain/schedule-rotation';
import type { ScheduleEntryData } from '../domain/schedule-rotation';

describe('getNextPosition', () => {
  it('returns 0 when totalEntries is 0', () => {
    expect(getNextPosition(0, 0)).toBe(0);
    expect(getNextPosition(-1, 0)).toBe(0);
  });

  it('advances from -1 to 0 on the first workout', () => {
    expect(getNextPosition(-1, 3)).toBe(0);
  });

  it('advances forward through positions', () => {
    expect(getNextPosition(0, 3)).toBe(1);
    expect(getNextPosition(1, 3)).toBe(2);
  });

  it('wraps back to 0 after the last position', () => {
    expect(getNextPosition(2, 3)).toBe(0);
  });

  it('works correctly with a single entry', () => {
    expect(getNextPosition(-1, 1)).toBe(0);
    expect(getNextPosition(0, 1)).toBe(0);
  });
});

describe('selectNextRoutineId', () => {
  const entries: ScheduleEntryData[] = [
    { position: 0, routineId: 'push-a' },
    { position: 1, routineId: 'pull-a' },
    { position: 2, routineId: 'push-b' },
  ];

  it('returns null when there are no entries', () => {
    expect(selectNextRoutineId([], -1)).toBeNull();
    expect(selectNextRoutineId([], 0)).toBeNull();
  });

  it('returns the first routine (position 0) on the very first workout', () => {
    expect(selectNextRoutineId(entries, -1)).toBe('push-a');
  });

  it('advances to the next routine in order', () => {
    expect(selectNextRoutineId(entries, 0)).toBe('pull-a');
    expect(selectNextRoutineId(entries, 1)).toBe('push-b');
  });

  it('wraps back to position 0 after the last routine', () => {
    expect(selectNextRoutineId(entries, 2)).toBe('push-a');
  });

  it('sorts entries by position before selecting', () => {
    const unsorted: ScheduleEntryData[] = [
      { position: 2, routineId: 'push-b' },
      { position: 0, routineId: 'push-a' },
      { position: 1, routineId: 'pull-a' },
    ];
    expect(selectNextRoutineId(unsorted, -1)).toBe('push-a');
    expect(selectNextRoutineId(unsorted, 0)).toBe('pull-a');
    expect(selectNextRoutineId(unsorted, 1)).toBe('push-b');
    expect(selectNextRoutineId(unsorted, 2)).toBe('push-a');
  });

  it('does not mutate the original entries array', () => {
    const original = [...entries];
    selectNextRoutineId(entries, -1);
    expect(entries).toEqual(original);
  });
});
