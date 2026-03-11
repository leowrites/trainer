import {
  maxHours,
  toHoursDataPoints,
  type HoursDataRow,
} from '../domain/hours-over-time';

describe('toHoursDataPoints', () => {
  it('returns an empty array for empty input', () => {
    expect(toHoursDataPoints([])).toEqual([]);
  });

  it('converts milliseconds to hours correctly', () => {
    const rows: HoursDataRow[] = [
      { session_date: '2024-03-05', total_duration_ms: 3_600_000 }, // exactly 1 hour
    ];
    const points = toHoursDataPoints(rows);
    expect(points[0].hours).toBe(1);
  });

  it('converts a 90-minute session to 1.5 hours', () => {
    const rows: HoursDataRow[] = [
      { session_date: '2024-03-05', total_duration_ms: 5_400_000 }, // 90 min
    ];
    const points = toHoursDataPoints(rows);
    expect(points[0].hours).toBe(1.5);
  });

  it('formats the date label correctly', () => {
    const rows: HoursDataRow[] = [
      { session_date: '2024-03-05', total_duration_ms: 0 },
    ];
    const points = toHoursDataPoints(rows);
    expect(points[0].label).toMatch(/Mar\s+5/);
  });

  it('preserves the order of input rows', () => {
    const rows: HoursDataRow[] = [
      { session_date: '2024-01-01', total_duration_ms: 3_600_000 },
      { session_date: '2024-01-02', total_duration_ms: 7_200_000 },
    ];
    const points = toHoursDataPoints(rows);
    expect(points.map((p) => p.hours)).toEqual([1, 2]);
  });

  it('handles a zero-duration day', () => {
    const rows: HoursDataRow[] = [
      { session_date: '2024-03-01', total_duration_ms: 0 },
    ];
    const points = toHoursDataPoints(rows);
    expect(points[0].hours).toBe(0);
  });
});

describe('maxHours', () => {
  it('returns 0 for an empty array', () => {
    expect(maxHours([])).toBe(0);
  });

  it('returns the single element value for a one-element array', () => {
    expect(maxHours([{ label: 'Jan 1', hours: 2.5 }])).toBe(2.5);
  });

  it('returns the largest hours value', () => {
    const points = [
      { label: 'Jan 1', hours: 1 },
      { label: 'Jan 2', hours: 3.5 },
      { label: 'Jan 3', hours: 0.5 },
    ];
    expect(maxHours(points)).toBe(3.5);
  });

  it('handles all-zero hours', () => {
    const points = [
      { label: 'Jan 1', hours: 0 },
      { label: 'Jan 2', hours: 0 },
    ];
    expect(maxHours(points)).toBe(0);
  });
});
