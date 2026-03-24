/**
 * Performance core module.
 *
 * CALLING SPEC:
 * - Public exports for performance contracts and coverage manifests.
 * - Consumed by perf tests, CI scripts, and nightly profiling utilities.
 * - Side effects: none.
 */

export type {
  PerfBaseline,
  PerfRegressionPolicy,
  PerfRegressionViolation,
  PerfScenarioResult,
} from './contracts';
export { DEFAULT_PERF_REGRESSION_POLICY } from './contracts';
export {
  EXTRA_FLOW_PERF_COVERAGE,
  NIGHTLY_PERF_SCENARIOS,
  ROUTE_PERF_COVERAGE,
} from './perf-coverage-manifest';
export { getPerfLabScenarioPack, isPerfLabEnabled } from './perf-lab-env';
export {
  resolvePerfScenarioPack,
  runPerfLabScenarios,
} from './perf-lab-runner';
export type { PerfLabScenarioExecutor } from './perf-lab-runner';
export type {
  NightlyPerfScenario,
  RoutePerfCoverage,
} from './perf-coverage-manifest';
