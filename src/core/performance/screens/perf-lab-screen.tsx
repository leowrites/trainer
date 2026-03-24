/**
 * Debug perf lab screen.
 *
 * CALLING SPEC:
 * - Mounts the real app navigator and executes scripted route/store scenarios.
 * - Persists scenario metrics into local sqlite and prints structured logs.
 * - Side effects: navigation actions, sqlite writes, and debug perf commands.
 */

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ScrollView, View } from 'react-native';

import { useDatabase } from '@core/database/provider';
import {
  RootNavigator,
  rootNavigationRef,
  type RootTabParamList,
} from '@core/navigation';
import { useHistoryAnalytics } from '@features/analytics';
import { useUserProfile } from '@features/health-tracking';
import {
  useExercises,
  useRoutineExerciseCounts,
  useRoutines,
} from '@features/routines';
import { useScheduleEntryIndex, useSchedules } from '@features/schedule';
import {
  useActiveWorkoutActions,
  useWorkoutStarter,
  useWorkoutStore,
} from '@features/workout-mode';
import {
  Body,
  Button,
  Heading,
  Label,
  Muted,
  Surface,
} from '@shared/components';
import type { PerfScenarioResult } from '../contracts';
import { emitPerfLabCommand } from '../perf-lab-command-bus';
import { getPerfLabScenarioPack } from '../perf-lab-env';
import {
  resolvePerfScenarioPack,
  runPerfLabScenarios,
} from '../perf-lab-runner';

interface PersistedPerfLabRun {
  runId: string;
  scenarioId: string;
  timestamp: string;
  device: string;
  sampleCount: number;
  p50Ms: number;
  p95Ms: number;
  maxMs: number;
  mainThreadLongTaskCount: number;
}

const PERF_EXERCISE_A_ID = 'perf-lab-exercise-a';
const PERF_EXERCISE_B_ID = 'perf-lab-exercise-b';
const PERF_ROUTINE_ID = 'perf-lab-routine-a';
const PERF_ROUTINE_EXERCISE_A_ID = 'perf-lab-routine-exercise-a';
const PERF_ROUTINE_EXERCISE_B_ID = 'perf-lab-routine-exercise-b';
const PERF_SCHEDULE_ID = 'perf-lab-schedule-a';
const PERF_SCHEDULE_ENTRY_ID = 'perf-lab-schedule-entry-a';

function persistPerfLabResults(
  db: ReturnType<typeof useDatabase>,
  runs: PersistedPerfLabRun[],
): void {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS perf_lab_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      run_id TEXT NOT NULL,
      scenario_id TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      device TEXT NOT NULL,
      sample_count INTEGER NOT NULL,
      p50_ms REAL NOT NULL,
      p95_ms REAL NOT NULL,
      max_ms REAL NOT NULL,
      main_thread_long_task_count INTEGER NOT NULL
    );
  `);

  db.withTransactionSync(() => {
    runs.forEach((run) => {
      db.runSync(
        `INSERT INTO perf_lab_runs (
          run_id,
          scenario_id,
          timestamp,
          device,
          sample_count,
          p50_ms,
          p95_ms,
          max_ms,
          main_thread_long_task_count
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          run.runId,
          run.scenarioId,
          run.timestamp,
          run.device,
          run.sampleCount,
          run.p50Ms,
          run.p95Ms,
          run.maxMs,
          run.mainThreadLongTaskCount,
        ],
      );
    });
  });
}

function toPersistedRows(
  runId: string,
  results: PerfScenarioResult[],
): PersistedPerfLabRun[] {
  return results.map((result) => ({
    runId,
    scenarioId: result.scenarioId,
    timestamp: result.timestamp,
    device: result.device,
    sampleCount: result.sampleCount,
    p50Ms: result.p50Ms,
    p95Ms: result.p95Ms,
    maxMs: result.maxMs,
    mainThreadLongTaskCount: result.mainThreadLongTaskCount,
  }));
}

function getSimulatorLabel(): string {
  return 'ios-simulator';
}

function waitForMilliseconds(durationMs: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, durationMs);
  });
}

function waitForNextFrame(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      setTimeout(resolve, 0);
    });
  });
}

async function waitForFrames(frameCount: number): Promise<void> {
  for (let index = 0; index < frameCount; index += 1) {
    await waitForNextFrame();
  }
}

async function waitForNavigationReady(timeoutMs = 5000): Promise<void> {
  const startedAt = Date.now();

  while (!rootNavigationRef.isReady()) {
    if (Date.now() - startedAt >= timeoutMs) {
      throw new Error('Navigation container did not become ready in time.');
    }

    await waitForMilliseconds(40);
  }
}

function seedPerfLabWorkoutTemplate(db: ReturnType<typeof useDatabase>): void {
  db.withTransactionSync(() => {
    db.runSync(
      `INSERT OR IGNORE INTO exercises (
        id,
        name,
        muscle_group,
        how_to,
        equipment,
        strength_estimation_mode,
        is_deleted
      ) VALUES (?, ?, ?, ?, ?, ?, 0)`,
      [
        PERF_EXERCISE_A_ID,
        'Perf Lab Bench Press',
        'chest',
        'Keep shoulder blades tucked and control the eccentric.',
        'barbell',
        'limited',
      ],
    );
    db.runSync(
      `INSERT OR IGNORE INTO exercises (
        id,
        name,
        muscle_group,
        how_to,
        equipment,
        strength_estimation_mode,
        is_deleted
      ) VALUES (?, ?, ?, ?, ?, ?, 0)`,
      [
        PERF_EXERCISE_B_ID,
        'Perf Lab Row',
        'back',
        'Drive elbows back and hold the top position briefly.',
        'cable',
        'limited',
      ],
    );
    db.runSync(
      'INSERT OR IGNORE INTO routines (id, name, notes, is_deleted) VALUES (?, ?, ?, 0)',
      [
        PERF_ROUTINE_ID,
        'Perf Lab Push Pull',
        'Deterministic perf harness routine.',
      ],
    );
    db.runSync(
      `INSERT OR IGNORE INTO routine_exercises (
        id,
        routine_id,
        exercise_id,
        position,
        target_sets,
        target_reps,
        rest_seconds,
        progression_policy,
        target_rir
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        PERF_ROUTINE_EXERCISE_A_ID,
        PERF_ROUTINE_ID,
        PERF_EXERCISE_A_ID,
        0,
        2,
        6,
        90,
        'double_progression',
        2,
      ],
    );
    db.runSync(
      `INSERT OR IGNORE INTO routine_exercises (
        id,
        routine_id,
        exercise_id,
        position,
        target_sets,
        target_reps,
        rest_seconds,
        progression_policy,
        target_rir
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        PERF_ROUTINE_EXERCISE_B_ID,
        PERF_ROUTINE_ID,
        PERF_EXERCISE_B_ID,
        1,
        2,
        10,
        90,
        'double_progression',
        2,
      ],
    );
    db.runSync(
      `INSERT OR IGNORE INTO routine_exercise_sets (
        id,
        routine_exercise_id,
        position,
        target_reps,
        planned_weight,
        target_reps_min,
        target_reps_max,
        set_role
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'perf-lab-routine-set-a1',
        PERF_ROUTINE_EXERCISE_A_ID,
        0,
        6,
        135,
        6,
        8,
        'work',
      ],
    );
    db.runSync(
      `INSERT OR IGNORE INTO routine_exercise_sets (
        id,
        routine_exercise_id,
        position,
        target_reps,
        planned_weight,
        target_reps_min,
        target_reps_max,
        set_role
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'perf-lab-routine-set-a2',
        PERF_ROUTINE_EXERCISE_A_ID,
        1,
        6,
        125,
        6,
        8,
        'work',
      ],
    );
    db.runSync(
      `INSERT OR IGNORE INTO routine_exercise_sets (
        id,
        routine_exercise_id,
        position,
        target_reps,
        planned_weight,
        target_reps_min,
        target_reps_max,
        set_role
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'perf-lab-routine-set-b1',
        PERF_ROUTINE_EXERCISE_B_ID,
        0,
        10,
        95,
        10,
        12,
        'work',
      ],
    );
    db.runSync(
      `INSERT OR IGNORE INTO routine_exercise_sets (
        id,
        routine_exercise_id,
        position,
        target_reps,
        planned_weight,
        target_reps_min,
        target_reps_max,
        set_role
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'perf-lab-routine-set-b2',
        PERF_ROUTINE_EXERCISE_B_ID,
        1,
        10,
        90,
        10,
        12,
        'work',
      ],
    );
    db.runSync('UPDATE schedules SET is_active = 0 WHERE is_deleted = 0');
    db.runSync(
      `INSERT OR REPLACE INTO schedules (
        id,
        name,
        is_active,
        current_position,
        is_deleted
      ) VALUES (?, ?, 1, 0, 0)`,
      [PERF_SCHEDULE_ID, 'Perf Lab Schedule'],
    );
    db.runSync(
      `INSERT OR REPLACE INTO schedule_entries (
        id,
        schedule_id,
        routine_id,
        position
      ) VALUES (?, ?, ?, 0)`,
      [PERF_SCHEDULE_ENTRY_ID, PERF_SCHEDULE_ID, PERF_ROUTINE_ID],
    );
  });
}

export function PerfLabScreen(): React.JSX.Element {
  const db = useDatabase();
  const { startWorkoutFromSchedule, startFreeWorkout, refreshPreview } =
    useWorkoutStarter();
  const {
    addExercise,
    addSet,
    deleteWorkout,
    flushPendingWrites,
    toggleSetLogged,
    updateActualRir,
    updateReps,
    updateWeight,
  } = useActiveWorkoutActions();
  const { refresh: refreshHistory, loadMore: loadMoreHistory } =
    useHistoryAnalytics();
  const { refresh: refreshExercises } = useExercises();
  const { refresh: refreshRoutines } = useRoutines();
  const { refresh: refreshSchedules } = useSchedules();
  const { refresh: refreshRoutineExerciseCounts } = useRoutineExerciseCounts();
  const { refresh: refreshScheduleEntryIndex } = useScheduleEntryIndex();
  const { saveProfile } = useUserProfile();
  const [results, setResults] = useState<PerfScenarioResult[]>([]);
  const [lastRunId, setLastRunId] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);
  const hasAutoRunRef = useRef(false);
  const scenarioPack = useMemo(
    () => resolvePerfScenarioPack(getPerfLabScenarioPack()),
    [],
  );

  const navigateToTab = useCallback(
    async (tab: keyof RootTabParamList): Promise<void> => {
      await waitForNavigationReady();
      if (tab === 'Workout') {
        rootNavigationRef.navigate('Tabs', { screen: 'Workout' });
      } else if (tab === 'Routines') {
        rootNavigationRef.navigate('Tabs', {
          screen: 'Routines',
          params: { screen: 'Library' },
        });
      } else if (tab === 'History') {
        rootNavigationRef.navigate('Tabs', {
          screen: 'History',
          params: { screen: 'HistoryOverview' },
        });
      } else {
        rootNavigationRef.navigate('Tabs', { screen: 'Profile' });
      }
      await waitForFrames(3);
    },
    [],
  );

  const ensureActiveWorkout = useCallback(async (): Promise<void> => {
    const currentState = useWorkoutStore.getState();

    if (!currentState.isWorkoutActive) {
      const startedSessionId = startWorkoutFromSchedule() ?? startFreeWorkout();
      if (!startedSessionId) {
        return;
      }
    }

    const stateAfterStart = useWorkoutStore.getState();
    const hasSets = stateAfterStart.activeRouteSetIds.length > 0;

    if (!hasSets) {
      if (!stateAfterStart.activeExercisesById[PERF_EXERCISE_A_ID]) {
        addExercise(PERF_EXERCISE_A_ID, 'Perf Lab Bench Press');
      }

      const latestState = useWorkoutStore.getState();
      const exerciseSetCount =
        latestState.activeExercisesById[PERF_EXERCISE_A_ID]?.setIds.length ?? 0;

      if (exerciseSetCount < 2) {
        addSet(PERF_EXERCISE_A_ID);
      }
    }

    await waitForNavigationReady();
    rootNavigationRef.navigate('ActiveWorkout');
    await waitForFrames(4);
  }, [addExercise, addSet, startFreeWorkout, startWorkoutFromSchedule]);

  const runScenarioSample = useCallback(
    async (scenarioId: string, sampleIndex: number): Promise<void> => {
      if (scenarioId === 'startup') {
        await waitForNavigationReady();
        rootNavigationRef.resetRoot({
          index: 0,
          routes: [{ name: 'Tabs', params: { screen: 'Workout' } }],
        });
        await waitForFrames(4);
        return;
      }

      if (scenarioId === 'start-now') {
        deleteWorkout();
        await navigateToTab('Workout');
        refreshPreview();
        await waitForFrames(2);
        const startedSessionId =
          startWorkoutFromSchedule() ?? startFreeWorkout();
        if (startedSessionId) {
          await waitForNavigationReady();
          rootNavigationRef.navigate('ActiveWorkout');
          await waitForFrames(4);
        }
        return;
      }

      if (scenarioId === 'active-set-edit') {
        await ensureActiveWorkout();
        const targetSetId = useWorkoutStore.getState().activeRouteSetIds[0];

        if (!targetSetId) {
          return;
        }

        updateReps(targetSetId, 6 + (sampleIndex % 6));
        updateWeight(targetSetId, 95 + sampleIndex * 2.5);
        updateActualRir(targetSetId, sampleIndex % 4);
        toggleSetLogged(targetSetId, sampleIndex % 2 === 0);
        flushPendingWrites();
        await waitForFrames(2);
        return;
      }

      if (scenarioId === 'overview-open') {
        await ensureActiveWorkout();
        emitPerfLabCommand({ type: 'active-workout/open-overview' });
        await waitForFrames(4);
        emitPerfLabCommand({ type: 'active-workout/close-overview' });
        await waitForFrames(2);
        return;
      }

      if (scenarioId === 'history-load') {
        await navigateToTab('History');
        refreshHistory();
        await waitForFrames(4);
        loadMoreHistory();
        await waitForFrames(4);
        return;
      }

      if (scenarioId === 'library-switch') {
        await navigateToTab('Routines');
        refreshExercises();
        refreshRoutines();
        refreshSchedules();
        refreshRoutineExerciseCounts();
        refreshScheduleEntryIndex();
        await waitForFrames(3);
        await navigateToTab('Workout');
        await navigateToTab('Routines');
        await waitForFrames(2);
        return;
      }

      if (scenarioId === 'profile-save') {
        await navigateToTab('Profile');
        saveProfile({
          displayName: `Perf Lab ${sampleIndex % 3}`,
          preferredWeightUnit: sampleIndex % 2 === 0 ? 'kg' : 'lb',
        });
        await waitForFrames(3);
      }
    },
    [
      deleteWorkout,
      navigateToTab,
      refreshPreview,
      startWorkoutFromSchedule,
      startFreeWorkout,
      ensureActiveWorkout,
      updateReps,
      updateWeight,
      updateActualRir,
      toggleSetLogged,
      flushPendingWrites,
      refreshHistory,
      loadMoreHistory,
      refreshExercises,
      refreshRoutines,
      refreshSchedules,
      refreshRoutineExerciseCounts,
      refreshScheduleEntryIndex,
      saveProfile,
    ],
  );

  const runScenarios = useCallback(async (): Promise<void> => {
    if (isRunning) {
      return;
    }

    setIsRunning(true);
    setRunError(null);

    try {
      seedPerfLabWorkoutTemplate(db);
      await waitForNavigationReady();
      const runId = `perf-run-${Date.now()}`;
      const nextResults = await runPerfLabScenarios(
        getSimulatorLabel(),
        runScenarioSample,
      );
      persistPerfLabResults(db, toPersistedRows(runId, nextResults));
      setLastRunId(runId);
      setResults(nextResults);

      console.warn(
        '[PERF_LAB_RESULT]',
        JSON.stringify({
          runId,
          scenarioPack,
          results: nextResults,
        }),
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown perf lab failure.';
      setRunError(errorMessage);
      console.error('[PERF_LAB_ERROR]', error);
    } finally {
      setIsRunning(false);
    }
  }, [db, isRunning, runScenarioSample, scenarioPack]);

  useEffect(() => {
    if (hasAutoRunRef.current) {
      return;
    }

    hasAutoRunRef.current = true;
    void runScenarios();
  }, [runScenarios]);

  return (
    <View className="flex-1">
      <RootNavigator />

      <View pointerEvents="box-none" className="absolute inset-x-3 top-16">
        <Surface className="rounded-3xl border border-surface-border/70 px-4 py-4">
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ gap: 12 }}
            style={{ maxHeight: 340 }}
          >
            <View className="gap-1">
              <Heading className="text-2xl">Perf Lab</Heading>
              <Muted>Scripted route and store perf scenarios.</Muted>
            </View>

            <View className="gap-1">
              <Label>Scenario pack</Label>
              <Body>{scenarioPack}</Body>
              <Label className="mt-1">Last run id</Label>
              <Body>{lastRunId ?? 'No runs yet'}</Body>
              {runError ? (
                <Muted className="text-red-500">{runError}</Muted>
              ) : null}
            </View>

            <Button onPress={() => void runScenarios()} disabled={isRunning}>
              {isRunning ? 'Running Scenarios...' : 'Run Perf Scenarios'}
            </Button>

            {results.map((result) => (
              <View
                key={result.scenarioId}
                className="rounded-2xl border border-surface-border/70 px-4 py-4"
              >
                <Heading className="text-xl">{result.scenarioId}</Heading>
                <Muted className="mt-2">
                  p50: {result.p50Ms}ms · p95: {result.p95Ms}ms · max:{' '}
                  {result.maxMs}ms
                </Muted>
                <Muted className="mt-1">
                  samples: {result.sampleCount} · long tasks:{' '}
                  {result.mainThreadLongTaskCount}
                </Muted>
              </View>
            ))}
          </ScrollView>
        </Surface>
      </View>
    </View>
  );
}
