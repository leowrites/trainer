import {
  maxVolume,
  toVolumeDataPoints,
  type VolumeDataRow,
} from '../domain/volume-over-time';

describe('toVolumeDataPoints', () => {
  it('returns an empty array for empty input', () => {
    expect(toVolumeDataPoints([])).toEqual([]);
  });

  it('converts a single row to a data point with the correct volume', () => {
    const rows: VolumeDataRow[] = [
      { session_date: '2024-03-05', total_volume: 1500 },
    ];
    const points = toVolumeDataPoints(rows);
    expect(points).toHaveLength(1);
    expect(points[0].volume).toBe(1500);
  });

  it('formats the date label correctly', () => {
    const rows: VolumeDataRow[] = [
      { session_date: '2024-03-05', total_volume: 0 },
    ];
    const points = toVolumeDataPoints(rows);
    // Label should be something like "Mar 5"
    expect(points[0].label).toMatch(/Mar\s+5/);
  });

  it('preserves the order of input rows', () => {
    const rows: VolumeDataRow[] = [
      { session_date: '2024-01-01', total_volume: 100 },
      { session_date: '2024-01-02', total_volume: 200 },
      { session_date: '2024-01-03', total_volume: 300 },
    ];
    const points = toVolumeDataPoints(rows);
    expect(points.map((p) => p.volume)).toEqual([100, 200, 300]);
  });

  it('handles a zero-volume day', () => {
    const rows: VolumeDataRow[] = [
      { session_date: '2024-03-01', total_volume: 0 },
    ];
    const points = toVolumeDataPoints(rows);
    expect(points[0].volume).toBe(0);
  });
});

describe('maxVolume', () => {
  it('returns 0 for an empty array', () => {
    expect(maxVolume([])).toBe(0);
  });

  it('returns the single element value for a one-element array', () => {
    expect(maxVolume([{ label: 'Jan 1', volume: 500 }])).toBe(500);
  });

  it('returns the largest volume', () => {
    const points = [
      { label: 'Jan 1', volume: 100 },
      { label: 'Jan 2', volume: 800 },
      { label: 'Jan 3', volume: 350 },
    ];
    expect(maxVolume(points)).toBe(800);
  });

  it('handles all-zero volumes', () => {
    const points = [
      { label: 'Jan 1', volume: 0 },
      { label: 'Jan 2', volume: 0 },
    ];
    expect(maxVolume(points)).toBe(0);
  });
});
