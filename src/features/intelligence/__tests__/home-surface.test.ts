import {
  selectHomeExerciseHighlights,
  selectHomePrimaryInsight,
} from '../selectors/home-surface';

describe('home surface selectors', () => {
  it('prefers strong exercise signals over weaker fallback messaging', () => {
    const insight = selectHomePrimaryInsight({
      dashboardMetrics: {
        workoutsThisWeek: 1,
        workoutDaysThisWeek: 1,
        currentWeeklyStreak: 1,
        lastCompletedWorkoutAt: new Date('2026-03-20T10:00:00.000Z').getTime(),
      },
      exerciseTrendSummaries: [
        {
          exerciseId: 'bench',
          exerciseName: 'Bench Press',
          summary: 'Bench is moving up.',
          signal: 'Bench Press ↑',
          direction: 'up',
          quality: {
            level: 'high',
            reasons: [],
          },
        },
      ],
      routineTrendSummaries: [],
      goalViewModels: [],
      now: new Date('2026-03-22T10:00:00.000Z').getTime(),
    });

    expect(insight.text).toBe('Bench Press ↑');
    expect(insight.source).toBe('exercise');
  });

  it('falls back to neutral action messaging when data is weak', () => {
    const insight = selectHomePrimaryInsight({
      dashboardMetrics: {
        workoutsThisWeek: 0,
        workoutDaysThisWeek: 0,
        currentWeeklyStreak: 0,
        lastCompletedWorkoutAt: null,
      },
      exerciseTrendSummaries: [],
      routineTrendSummaries: [],
      goalViewModels: [],
      now: new Date('2026-03-22T10:00:00.000Z').getTime(),
    });

    expect(insight.text).toBe('NEXT SESSION READY');
    expect(insight.source).toBe('fallback');
    expect(insight.quality.level).toBe('low');
  });

  it('suppresses harsh adherence messaging and uses a neutral return cue', () => {
    const insight = selectHomePrimaryInsight({
      dashboardMetrics: {
        workoutsThisWeek: 0,
        workoutDaysThisWeek: 0,
        currentWeeklyStreak: 0,
        lastCompletedWorkoutAt: new Date('2026-03-10T10:00:00.000Z').getTime(),
      },
      exerciseTrendSummaries: [],
      routineTrendSummaries: [],
      goalViewModels: [],
      now: new Date('2026-03-22T10:00:00.000Z').getTime(),
    });

    expect(insight.text).toBe('Start now');
    expect(insight.tone).toBe('neutral');
  });

  it('returns at most two high-signal highlights', () => {
    const highlights = selectHomeExerciseHighlights([
      {
        exerciseId: 'bench',
        exerciseName: 'Bench Press',
        summary: 'Bench up',
        signal: 'Bench Press ↑',
        direction: 'up',
        quality: {
          level: 'high',
          reasons: [],
        },
      },
      {
        exerciseId: 'row',
        exerciseName: 'Row',
        summary: 'Row steady',
        signal: 'Row steady',
        direction: 'steady',
        quality: {
          level: 'medium',
          reasons: ['missing_rir'],
        },
      },
      {
        exerciseId: 'curl',
        exerciseName: 'Curl',
        summary: 'Curl noisy',
        signal: 'Curl ↓',
        direction: 'down',
        quality: {
          level: 'low',
          reasons: ['too_few_exposures'],
        },
      },
    ]);

    expect(highlights).toHaveLength(2);
    expect(highlights.map((item) => item.exerciseId)).toEqual(['bench', 'row']);
  });
});
