import { buildHistorySessions } from '../domain/history';
import { buildHoursTrend, buildVolumeTrend } from '../domain/trends';
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

  it('aggregates volume and hours by workout day', () => {
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

    expect(buildVolumeTrend(sessions)).toEqual([
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

    expect(buildHoursTrend(sessions)).toEqual([
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

    expect(buildHoursTrend(sessions)).toEqual([]);
  });
});
