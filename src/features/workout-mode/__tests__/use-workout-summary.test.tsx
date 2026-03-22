import { act, renderHook } from '@testing-library/react-native';

import { useWorkoutSummary } from '../hooks/use-workout-summary';
import { useDatabase } from '@core/database/provider';
import {
  buildDashboardMetrics,
  useHistoryAnalytics,
  useHistorySessionDetail,
  useHistorySessions,
} from '@features/analytics';
import { useUserProfile } from '@features/health-tracking';
import {
  useSessionIntelligence,
  useTrainingGoals,
} from '@features/intelligence';
import {
  loadWorkoutSummaryMeta,
  saveWorkoutFeedbackLevel,
} from '../workout-summary-repository';
import type { HistorySession } from '@features/analytics';

jest.mock('@core/database/provider', () => ({
  useDatabase: jest.fn(),
  useOptionalDatabase: jest.fn(),
}));

jest.mock('@features/analytics', () => ({
  buildDashboardMetrics: jest.fn(),
  useHistoryAnalytics: jest.fn(),
  useHistorySessionDetail: jest.fn(),
  useHistorySessions: jest.fn(),
}));

jest.mock('@features/health-tracking', () => ({
  useUserProfile: jest.fn(),
}));

jest.mock('@features/intelligence', () => ({
  useSessionIntelligence: jest.fn(),
  useTrainingGoals: jest.fn(),
}));

jest.mock('../workout-summary-repository', () => ({
  loadWorkoutSummaryMeta: jest.fn(),
  saveWorkoutFeedbackLevel: jest.fn(),
}));

const mockUseDatabase = jest.mocked(useDatabase);
const mockBuildDashboardMetrics = jest.mocked(buildDashboardMetrics);
const mockUseHistoryAnalytics = jest.mocked(useHistoryAnalytics);
const mockUseHistorySessionDetail = jest.mocked(useHistorySessionDetail);
const mockUseHistorySessions = jest.mocked(useHistorySessions);
const mockUseUserProfile = jest.mocked(useUserProfile);
const mockUseSessionIntelligence = jest.mocked(useSessionIntelligence);
const mockUseTrainingGoals = jest.mocked(useTrainingGoals);
const mockLoadWorkoutSummaryMeta = jest.mocked(loadWorkoutSummaryMeta);
const mockSaveWorkoutFeedbackLevel = jest.mocked(saveWorkoutFeedbackLevel);

function buildSession(
  id: string,
  overrides: Partial<HistorySession> = {},
): HistorySession {
  return {
    id,
    routineId: 'routine-1',
    routineName: 'Push A',
    startTime: 1,
    endTime: 2,
    durationMinutes: 45,
    totalSets: 4,
    totalCompletedSets: 4,
    totalReps: 32,
    totalVolume: 3200,
    exerciseCount: 1,
    exercises: [
      {
        exerciseId: 'exercise-1',
        exerciseName: 'Bench Press',
        targetSets: 4,
        targetReps: 8,
        sets: [
          {
            id: `${id}-set-1`,
            exerciseId: 'exercise-1',
            reps: 8,
            weight: 100,
            isCompleted: true,
          },
        ],
        totalSets: 4,
        completedSets: 4,
        totalReps: 32,
        totalVolume: 3200,
      },
    ],
    ...overrides,
  };
}

describe('useWorkoutSummary', () => {
  const db = { runSync: jest.fn() };
  const currentSession = buildSession('current');
  const trendSessions = [{ ...buildSession('trend'), exercises: [] }];
  const detailedHistory = [currentSession, buildSession('previous')];

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDatabase.mockReturnValue(db as never);
    mockUseHistorySessionDetail.mockReturnValue({
      isLoading: false,
      session: currentSession,
    });
    mockUseHistoryAnalytics.mockReturnValue({
      isLoading: false,
      isLoadingMore: false,
      hasMore: false,
      allSessions: trendSessions,
      sessions: [],
      trendSeriesByMetric: {
        volume: [],
        hours: [],
        reps: [],
        sets: [],
      },
      loadMore: jest.fn(),
      refresh: jest.fn(),
    });
    mockUseHistorySessions.mockReturnValue({
      isLoading: false,
      sessions: detailedHistory,
    });
    mockUseUserProfile.mockReturnValue({
      profile: { preferredWeightUnit: 'lb' },
    } as never);
    mockUseTrainingGoals.mockReturnValue({
      goals: [],
      goalViewModels: [],
      createGoal: jest.fn(),
      updateGoal: jest.fn(),
      deleteGoal: jest.fn(),
      refresh: jest.fn(),
    });
    mockUseSessionIntelligence.mockReturnValue({
      recordBadges: [],
      negativeSignals: [],
      prescriptions: [],
      classifications: [],
      goalDeltas: [],
    });
    mockBuildDashboardMetrics.mockReturnValue({
      workoutsThisWeek: 2,
      workoutDaysThisWeek: 2,
      currentWeeklyStreak: 3,
      lastCompletedWorkoutAt: currentSession.endTime,
    });
    mockLoadWorkoutSummaryMeta.mockReturnValue({
      effortLevel: null,
      fatigueLevel: null,
      scheduleContext: null,
    });
  });

  it('uses detailed history sessions for intelligence instead of trend-only rows', () => {
    renderHook(() => useWorkoutSummary('current'));

    expect(mockUseTrainingGoals).toHaveBeenCalledWith(detailedHistory);
    expect(mockUseSessionIntelligence).toHaveBeenCalledWith(
      currentSession,
      detailedHistory,
      [],
      'lb',
    );
  });

  it('does not rebuild badges when feedback changes', () => {
    const { result } = renderHook(() => useWorkoutSummary('current'));
    const initialRecordBadges = result.current.summary?.recordBadges;

    act(() => {
      result.current.saveFeedback('effort', 4);
    });

    expect(mockSaveWorkoutFeedbackLevel).toHaveBeenCalledWith(
      db,
      'current',
      'effort',
      4,
    );
    expect(result.current.summary?.recordBadges).toEqual(initialRecordBadges);
  });
});
