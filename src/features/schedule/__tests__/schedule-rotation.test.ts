import {
  getNextPosition,
  selectNextRoutineId,
} from '../domain/schedule-rotation';
import type { ScheduleEntryData } from '../domain/schedule-rotation';

// ─── getNextPosition ──────────────────────────────────────────────────────────

describe('getNextPosition', () => {
  it('returns 0 when starting from -1 (first workout)', () => {
    expect(getNextPosition(-1, 3)).toBe(0);
  });

  it('advances to the next position', () => {
    expect(getNextPosition(0, 3)).toBe(1);
    expect(getNextPosition(1, 3)).toBe(2);
  });

  it('wraps back to 0 after the last entry', () => {
    expect(getNextPosition(2, 3)).toBe(0);
  });

  it('handles a single-entry schedule (always returns 0)', () => {
    expect(getNextPosition(-1, 1)).toBe(0);
    expect(getNextPosition(0, 1)).toBe(0);
  });

  it('returns 0 safely when totalEntries is 0', () => {
    expect(getNextPosition(-1, 0)).toBe(0);
    expect(getNextPosition(5, 0)).toBe(0);
  });

  it('wraps correctly for large schedules', () => {
    expect(getNextPosition(9, 10)).toBe(0);
    expect(getNextPosition(4, 10)).toBe(5);
  });
});

// ─── selectNextRoutineId ──────────────────────────────────────────────────────

describe('selectNextRoutineId', () => {
  const buildEntries = (ids: string[]): ScheduleEntryData[] =>
    ids.map((routineId, position) => ({ routineId, position }));

  it('returns null when the schedule has no entries', () => {
    expect(selectNextRoutineId([], -1)).toBeNull();
    expect(selectNextRoutineId([], 0)).toBeNull();
  });

  it('returns the first routine when starting from -1', () => {
    const entries = buildEntries(['r1', 'r2', 'r3']);
    expect(selectNextRoutineId(entries, -1)).toBe('r1');
  });

  it('selects the correct next routine after the first', () => {
    const entries = buildEntries(['r1', 'r2', 'r3']);
    expect(selectNextRoutineId(entries, 0)).toBe('r2');
    expect(selectNextRoutineId(entries, 1)).toBe('r3');
  });

  it('wraps around to the first routine after the last', () => {
    const entries = buildEntries(['r1', 'r2', 'r3']);
    expect(selectNextRoutineId(entries, 2)).toBe('r1');
  });

  it('sorts entries by position before selecting', () => {
    // Provide entries in reverse order — should still pick position 0 first.
    const unsortedEntries: ScheduleEntryData[] = [
      { routineId: 'r3', position: 2 },
      { routineId: 'r1', position: 0 },
      { routineId: 'r2', position: 1 },
    ];
    expect(selectNextRoutineId(unsortedEntries, -1)).toBe('r1');
    expect(selectNextRoutineId(unsortedEntries, 0)).toBe('r2');
    expect(selectNextRoutineId(unsortedEntries, 1)).toBe('r3');
    expect(selectNextRoutineId(unsortedEntries, 2)).toBe('r1');
  });

  it('does not mutate the original entries array', () => {
    const entries: ScheduleEntryData[] = [
      { routineId: 'r2', position: 1 },
      { routineId: 'r1', position: 0 },
    ];
    const original = [...entries];
    selectNextRoutineId(entries, -1);
    expect(entries).toEqual(original);
  });

  it('works with a single-entry schedule (always returns the same routine)', () => {
    const entries = buildEntries(['only']);
    expect(selectNextRoutineId(entries, -1)).toBe('only');
    expect(selectNextRoutineId(entries, 0)).toBe('only');
  });

  it('handles duplicate position values gracefully', () => {
    // Positions are not guaranteed unique in edge cases; just ensure no crash.
    const entries: ScheduleEntryData[] = [
      { routineId: 'r1', position: 0 },
      { routineId: 'r2', position: 0 },
    ];
    const result = selectNextRoutineId(entries, -1);
    expect(['r1', 'r2']).toContain(result);
  });
});
