import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { type CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import type { RootStackParamList, RootTabParamList } from '@core/navigation';
import {
  buildDashboardMetrics,
  useHistoryAnalytics,
} from '@features/analytics';
import { useUserProfile } from '@features/health-tracking';
import {
  Button,
  Container,
  DisplayHeading,
  Heading,
  Label,
  Meta,
  Muted,
  Surface,
} from '@shared/components';
import { useWorkoutStarter } from '../hooks/use-workout-starter';
import { useWorkoutStore } from '../store';
import { getGreeting, formatShortDate } from '../utils/formatters';
import { DashboardStatCard } from '../components/dashboard-stat-card';

export type WorkoutHomeScreenProps = CompositeScreenProps<
  BottomTabScreenProps<RootTabParamList, 'Workout'>,
  NativeStackScreenProps<RootStackParamList>
>;

export function WorkoutHomeScreen({
  navigation,
}: WorkoutHomeScreenProps): React.JSX.Element {
  const {
    currentWorkoutTitle,
    currentExerciseCount,
    expandWorkout,
    isWorkoutActive,
  } = useWorkoutStore(
    useShallow((state) => ({
      currentWorkoutTitle: state.activeSession?.title ?? null,
      currentExerciseCount: state.activeSession?.exercises.length ?? 0,
      expandWorkout: state.expandWorkout,
      isWorkoutActive: state.isWorkoutActive,
    })),
  );
  const {
    refreshPreview,
    nextRoutine,
    startWorkoutFromSchedule,
    startFreeWorkout,
  } = useWorkoutStarter();
  const { sessions, refresh: refreshHistory } = useHistoryAnalytics();
  const { profile, refresh: refreshProfile } = useUserProfile();
  const [starting, setStarting] = useState(false);
  const [dashboardNow] = useState(() => Date.now());
  const greeting = getGreeting(profile?.displayName ?? null, dashboardNow);
  const dashboardMetrics = useMemo(
    () => buildDashboardMetrics(sessions, { now: dashboardNow }),
    [dashboardNow, sessions],
  );

  const hasCurrentWorkout = isWorkoutActive && currentWorkoutTitle !== null;
  const inactiveSubtitle = hasCurrentWorkout
    ? 'Your current workout is still in progress.'
    : nextRoutine
      ? `Your next workout is ready, ${nextRoutine.routineName}.`
      : 'Your next workout will appear here once a schedule is active.';

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      refreshPreview();
      refreshHistory();
      refreshProfile();
    });

    return unsubscribe;
  }, [navigation, refreshHistory, refreshPreview, refreshProfile]);

  const handleStartScheduled = (): void => {
    if (starting) {
      return;
    }

    setStarting(true);

    try {
      const sessionId = startWorkoutFromSchedule();
      if (sessionId) {
        navigation.navigate('ActiveWorkout');
      }
    } finally {
      setStarting(false);
    }
  };

  const handleStartFree = (): void => {
    if (starting) {
      return;
    }

    setStarting(true);

    try {
      startFreeWorkout();
      navigation.navigate('ActiveWorkout');
    } finally {
      setStarting(false);
    }
  };

  const handleContinueWorkout = (): void => {
    expandWorkout();
    navigation.navigate('ActiveWorkout');
  };

  return (
    <Container className="px-0 pb-0" edges={['left', 'right']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 0,
          paddingTop: 0,
          paddingBottom: 24,
          gap: 12,
        }}
      >
        <View className="gap-2 pb-1" accessibilityRole="header">
          <Heading className="text-4xl leading-[36px]">
            {greeting.title}
          </Heading>
          <Muted className="max-w-[320px]">{greeting.subtitle}</Muted>
        </View>

        {hasCurrentWorkout && currentWorkoutTitle ? (
          <Surface variant="card" className="w-full rounded-[22px]  p-5">
            <View className="mb-3 flex-row items-center justify-between gap-3">
              <Label className="text-secondary">Current Workout</Label>
              <Meta>In progress</Meta>
            </View>
            <DisplayHeading className="text-3xl leading-[32px]">
              {currentWorkoutTitle}
            </DisplayHeading>
            <Muted className="mt-3">
              {currentExerciseCount} exercises in this session. Collapse it
              anytime and return here when you are ready.
            </Muted>
          </Surface>
        ) : nextRoutine ? (
          <Surface variant="card" className="w-full rounded-[22px] p-5">
            <View className="mb-3 flex-row items-center justify-between gap-3">
              <Label className="text-secondary">Next Workout</Label>
              <Meta>{nextRoutine.scheduleName}</Meta>
            </View>
            <DisplayHeading className="text-3xl leading-[32px]">
              {nextRoutine.routineName}
            </DisplayHeading>
            <Muted className="mt-3">
              {nextRoutine.exerciseCount} exercises • ~
              {nextRoutine.estimatedMinutes} mins
            </Muted>
            <Muted className="mt-2">{inactiveSubtitle}</Muted>
          </Surface>
        ) : (
          <Surface variant="card" className="w-full rounded-[22px] p-5">
            <Heading className="text-2xl leading-[24px]">
              No active schedule
            </Heading>
            <Muted className="mt-2">
              Create a schedule to queue your next workout, or start a free
              session now.
            </Muted>
          </Surface>
        )}

        {hasCurrentWorkout ? (
          <Button onPress={handleContinueWorkout} className="w-full">
            Continue
          </Button>
        ) : nextRoutine ? (
          <Button
            onPress={handleStartScheduled}
            disabled={starting}
            loading={starting}
            className="w-full"
          >
            Start {nextRoutine.routineName}
          </Button>
        ) : null}

        {!hasCurrentWorkout ? (
          <Button
            variant="ghost"
            onPress={handleStartFree}
            disabled={starting}
            loading={starting}
            className="w-full"
          >
            Start Free Workout
          </Button>
        ) : null}

        <View className="gap-3">
          <DashboardStatCard
            label="Workouts This Week"
            value={dashboardMetrics.workoutsThisWeek}
            caption={`${dashboardMetrics.workoutDaysThisWeek} active days`}
          />
          <DashboardStatCard
            label="Weekly Streak"
            value={dashboardMetrics.currentWeeklyStreak}
            caption={
              dashboardMetrics.currentWeeklyStreak === 1
                ? '1 week in a row'
                : `${dashboardMetrics.currentWeeklyStreak} weeks in a row`
            }
          />
          <DashboardStatCard
            label="Last Workout"
            value={formatShortDate(dashboardMetrics.lastCompletedWorkoutAt)}
            caption="Most recent completed session"
          />
        </View>
      </ScrollView>
    </Container>
  );
}
