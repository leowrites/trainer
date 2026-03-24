/**
 * App-wide performance coverage manifest.
 *
 * CALLING SPEC:
 * - Single source of truth for route-level perf coverage and nightly scenarios.
 * - Perf coverage tests compare discovered navigator routes against this file.
 * - Nightly profiling scripts use `NIGHTLY_PERF_SCENARIOS` as required output.
 * - Side effects: none.
 */

export interface RoutePerfCoverage {
  routeName: string;
  surface: string;
  jestContractId: string;
}

export interface NightlyPerfScenario {
  scenarioId: string;
  surface: string;
  description: string;
}

export const ROUTE_PERF_COVERAGE: RoutePerfCoverage[] = [
  {
    routeName: 'Workout',
    surface: 'tabs',
    jestContractId: 'workout-home',
  },
  {
    routeName: 'Routines',
    surface: 'tabs',
    jestContractId: 'routines-library',
  },
  {
    routeName: 'History',
    surface: 'tabs',
    jestContractId: 'history-overview',
  },
  {
    routeName: 'Profile',
    surface: 'tabs',
    jestContractId: 'profile-screen',
  },
  {
    routeName: 'Tabs',
    surface: 'root-stack',
    jestContractId: 'root-shell',
  },
  {
    routeName: 'ActiveWorkout',
    surface: 'root-stack',
    jestContractId: 'workout-active',
  },
  {
    routeName: 'WorkoutSummary',
    surface: 'root-stack',
    jestContractId: 'workout-summary',
  },
  {
    routeName: 'ExerciseDetail',
    surface: 'root-stack',
    jestContractId: 'exercise-detail',
  },
  {
    routeName: 'ExerciseEditor',
    surface: 'root-stack',
    jestContractId: 'exercise-editor',
  },
  {
    routeName: 'RoutineDetail',
    surface: 'root-stack',
    jestContractId: 'routine-detail',
  },
  {
    routeName: 'RoutineEditor',
    surface: 'root-stack',
    jestContractId: 'routine-editor',
  },
  {
    routeName: 'Library',
    surface: 'routines-stack',
    jestContractId: 'routines-library',
  },
  {
    routeName: 'ScheduleDetail',
    surface: 'routines-stack',
    jestContractId: 'schedule-detail',
  },
  {
    routeName: 'HistoryOverview',
    surface: 'history-stack',
    jestContractId: 'history-overview',
  },
  {
    routeName: 'Goals',
    surface: 'history-stack',
    jestContractId: 'goals-screen',
  },
  {
    routeName: 'HistorySessionDetail',
    surface: 'history-stack',
    jestContractId: 'history-session-detail',
  },
];

export const EXTRA_FLOW_PERF_COVERAGE: RoutePerfCoverage[] = [
  {
    routeName: 'ScheduleList',
    surface: 'standalone-flow',
    jestContractId: 'schedule-list',
  },
];

export const NIGHTLY_PERF_SCENARIOS: NightlyPerfScenario[] = [
  {
    scenarioId: 'startup',
    surface: 'app-shell',
    description: 'App launch and initial render to first interactive frame.',
  },
  {
    scenarioId: 'start-now',
    surface: 'workout-home',
    description:
      'Start scheduled workout from home and navigate active screen.',
  },
  {
    scenarioId: 'active-set-edit',
    surface: 'active-workout',
    description: 'Edit reps/weight/RIR on focused set with optimistic update.',
  },
  {
    scenarioId: 'overview-open',
    surface: 'active-workout',
    description: 'Open workout overview and load summary rows.',
  },
  {
    scenarioId: 'history-load',
    surface: 'history',
    description: 'Open history overview and hydrate list/chart surfaces.',
  },
  {
    scenarioId: 'library-switch',
    surface: 'routines',
    description:
      'Switch between schedule/routine/exercise sections in library.',
  },
  {
    scenarioId: 'profile-save',
    surface: 'profile',
    description: 'Save profile settings and body-weight update flow.',
  },
];
