import { buildHistorySessions } from '../domain/history';
import {
  buildHoursTrend,
  buildRepsTrend,
  buildSetsTrend,
  buildVolumeTrend,
} from '../domain/trends';
import type { HistorySessionRow, HistorySetRow } from '../types';

describe('analytics history domain', () => {
  it('builds session summaries from raw workout rows', () => {
    const sessionRows: HistorySessionRow[] = [
      {
        id: 'session-1',
        routine_id: 'routine-1',
        routine_name: 'Upper A',
        snapshot_name: 'Upper A Snapshot',
        start_time: new Date('2026-03-10T15:00:00.000Z').getTime(),
        end_time: new Date('2026-03-10T16:10:00.000Z').getTime(),
      },
    ];

    const setRows: HistorySetRow[] = [
      {
        id: 'set-1',
        session_id: 'session-1',
        exercise_id: 'exercise-1',
        exercise_name: 'Bench Press',
        weight: 100,
        reps: 10,
        is_completed: 1,
        target_sets: 2,
        target_reps: 10,
      },
      {
        id: 'set-2',
        session_id: 'session-1',
        exercise_id: 'exercise-1',
        exercise_name: 'Bench Press',
        weight: 100,
        reps: 10,
        is_completed: 1,
        target_sets: 2,
        target_reps: 10,
      },
      {
        id: 'set-3',
        session_id: 'session-1',
        exercise_id: 'exercise-2',
        exercise_name: 'Row',
        weight: 80,
        reps: 8,
        is_completed: 0,
        target_sets: 1,
        target_reps: 8,
      },
    ];

    const sessions = buildHistorySessions(sessionRows, setRows);

    expect(sessions).toHaveLength(1);
    expect(sessions[0]).toMatchObject({
      id: 'session-1',
      routineName: 'Upper A Snapshot',
      durationMinutes: 70,
      totalSets: 3,
      totalCompletedSets: 2,
      totalReps: 20,
      totalVolume: 2000,
      exerciseCount: 2,
    });
    expect(sessions[0].exercises[0]).toMatchObject({
      exerciseName: 'Bench Press',
      completedSets: 2,
      totalSets: 2,
      totalVolume: 2000,
    });
    expect(sessions[0].exercises[1]).toMatchObject({
      exerciseName: 'Row',
      completedSets: 0,
      totalVolume: 0,
    });
  });

  it('aggregates volume, hours, reps, and sets by workout day for the 3 month range', () => {
    const sessions = buildHistorySessions(
      [
        {
          id: 'session-1',
          routine_id: 'routine-1',
          routine_name: 'Upper A',
          snapshot_name: null,
          start_time: new Date('2026-03-10T15:00:00.000Z').getTime(),
          end_time: new Date('2026-03-10T16:00:00.000Z').getTime(),
        },
        {
          id: 'session-2',
          routine_id: 'routine-2',
          routine_name: 'Lower A',
          snapshot_name: null,
          start_time: new Date('2026-03-10T19:00:00.000Z').getTime(),
          end_time: new Date('2026-03-10T19:30:00.000Z').getTime(),
        },
        {
          id: 'session-3',
          routine_id: 'routine-3',
          routine_name: 'Upper B',
          snapshot_name: null,
          start_time: new Date('2026-03-11T15:00:00.000Z').getTime(),
          end_time: new Date('2026-03-11T15:45:00.000Z').getTime(),
        },
      ],
      [
        {
          id: 'set-1',
          session_id: 'session-1',
          exercise_id: 'exercise-1',
          exercise_name: 'Bench Press',
          weight: 100,
          reps: 10,
          is_completed: 1,
          target_sets: 1,
          target_reps: 10,
        },
        {
          id: 'set-2',
          session_id: 'session-2',
          exercise_id: 'exercise-2',
          exercise_name: 'Squat',
          weight: 120,
          reps: 5,
          is_completed: 1,
          target_sets: 1,
          target_reps: 5,
        },
        {
          id: 'set-3',
          session_id: 'session-3',
          exercise_id: 'exercise-3',
          exercise_name: 'Pull Up',
          weight: 20,
          reps: 8,
          is_completed: 1,
          target_sets: 1,
          target_reps: 8,
        },
      ],
    );

    expect(buildVolumeTrend(sessions, '3m')).toEqual([
      expect.objectContaining({
        key: '2026-03-10',
        value: 1600,
        sessionCount: 2,
      }),
      expect.objectContaining({
        key: '2026-03-11',
        value: 160,
        sessionCount: 1,
      }),
    ]);

    expect(buildHoursTrend(sessions, '3m')).toEqual([
      expect.objectContaining({
        key: '2026-03-10',
        value: 1.5,
        sessionCount: 2,
      }),
      expect.objectContaining({
        key: '2026-03-11',
        value: 0.75,
        sessionCount: 1,
      }),
    ]);

    expect(buildRepsTrend(sessions, '3m')).toEqual([
      expect.objectContaining({
        key: '2026-03-10',
        value: 15,
        sessionCount: 2,
      }),
      expect.objectContaining({
        key: '2026-03-11',
        value: 8,
        sessionCount: 1,
      }),
    ]);

    expect(buildSetsTrend(sessions, '3m')).toEqual([
      expect.objectContaining({
        key: '2026-03-10',
        value: 2,
        sessionCount: 2,
      }),
      expect.objectContaining({
        key: '2026-03-11',
        value: 1,
        sessionCount: 1,
      }),
    ]);
  });

  it('aggregates the last year range month by month', () => {
    const sessions = buildHistorySessions(
      [
        {
          id: 'session-1',
          routine_id: 'routine-1',
          routine_name: 'Upper A',
          snapshot_name: null,
          start_time: new Date('2025-04-10T15:00:00.000Z').getTime(),
          end_time: new Date('2025-04-10T16:00:00.000Z').getTime(),
        },
        {
          id: 'session-2',
          routine_id: 'routine-2',
          routine_name: 'Lower A',
          snapshot_name: null,
          start_time: new Date('2025-04-18T15:00:00.000Z').getTime(),
          end_time: new Date('2025-04-18T16:00:00.000Z').getTime(),
        },
        {
          id: 'session-3',
          routine_id: 'routine-3',
          routine_name: 'Upper B',
          snapshot_name: null,
          start_time: new Date('2025-11-12T15:00:00.000Z').getTime(),
          end_time: new Date('2025-11-12T16:00:00.000Z').getTime(),
        },
      ],
      [
        {
          id: 'set-1',
          session_id: 'session-1',
          exercise_id: 'exercise-1',
          exercise_name: 'Bench Press',
          weight: 100,
          reps: 10,
          is_completed: 1,
          target_sets: 1,
          target_reps: 10,
        },
        {
          id: 'set-2',
          session_id: 'session-2',
          exercise_id: 'exercise-2',
          exercise_name: 'Squat',
          weight: 120,
          reps: 5,
          is_completed: 1,
          target_sets: 1,
          target_reps: 5,
        },
        {
          id: 'set-3',
          session_id: 'session-3',
          exercise_id: 'exercise-3',
          exercise_name: 'Pull Up',
          weight: 20,
          reps: 8,
          is_completed: 1,
          target_sets: 1,
          target_reps: 8,
        },
      ],
    );

    expect(buildVolumeTrend(sessions, '1y')).toEqual([
      expect.objectContaining({
        key: '2025-04',
        label: "Apr '25",
        value: 1600,
        sessionCount: 2,
      }),
      expect.objectContaining({
        key: '2025-11',
        label: "Nov '25",
        value: 160,
        sessionCount: 1,
      }),
    ]);
  });

  it('aggregates the all time range year by year', () => {
    const sessions = buildHistorySessions(
      [
        {
          id: 'session-1',
          routine_id: 'routine-1',
          routine_name: 'Upper A',
          snapshot_name: null,
          start_time: new Date('2024-03-10T15:00:00.000Z').getTime(),
          end_time: new Date('2024-03-10T16:00:00.000Z').getTime(),
        },
        {
          id: 'session-2',
          routine_id: 'routine-2',
          routine_name: 'Lower A',
          snapshot_name: null,
          start_time: new Date('2025-07-10T15:00:00.000Z').getTime(),
          end_time: new Date('2025-07-10T16:00:00.000Z').getTime(),
        },
        {
          id: 'session-3',
          routine_id: 'routine-3',
          routine_name: 'Upper B',
          snapshot_name: null,
          start_time: new Date('2026-03-11T15:00:00.000Z').getTime(),
          end_time: new Date('2026-03-11T15:45:00.000Z').getTime(),
        },
      ],
      [
        {
          id: 'set-1',
          session_id: 'session-1',
          exercise_id: 'exercise-1',
          exercise_name: 'Bench Press',
          weight: 100,
          reps: 10,
          is_completed: 1,
          target_sets: 1,
          target_reps: 10,
        },
        {
          id: 'set-2',
          session_id: 'session-2',
          exercise_id: 'exercise-2',
          exercise_name: 'Squat',
          weight: 120,
          reps: 5,
          is_completed: 1,
          target_sets: 1,
          target_reps: 5,
        },
        {
          id: 'set-3',
          session_id: 'session-3',
          exercise_id: 'exercise-3',
          exercise_name: 'Pull Up',
          weight: 20,
          reps: 8,
          is_completed: 1,
          target_sets: 1,
          target_reps: 8,
        },
      ],
    );

    expect(buildVolumeTrend(sessions, 'all')).toEqual([
      expect.objectContaining({
        key: '2024',
        label: '2024',
        value: 1000,
        sessionCount: 1,
      }),
      expect.objectContaining({
        key: '2025',
        label: '2025',
        value: 600,
        sessionCount: 1,
      }),
      expect.objectContaining({
        key: '2026',
        label: '2026',
        value: 160,
        sessionCount: 1,
      }),
    ]);
  });

  it('excludes unfinished sessions from hours trends', () => {
    const sessions = buildHistorySessions(
      [
        {
          id: 'session-1',
          routine_id: 'routine-1',
          routine_name: 'Upper A',
          snapshot_name: null,
          start_time: new Date('2026-03-10T15:00:00.000Z').getTime(),
          end_time: null,
        },
      ],
      [
        {
          id: 'set-1',
          session_id: 'session-1',
          exercise_id: 'exercise-1',
          exercise_name: 'Bench Press',
          weight: 100,
          reps: 10,
          is_completed: 1,
          target_sets: 1,
          target_reps: 10,
        },
      ],
    );

    expect(buildHoursTrend(sessions, '3m')).toEqual([]);
  });
});
