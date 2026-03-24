/**
 * Performance contract models.
 *
 * CALLING SPEC:
 * - Defines typed contracts shared by perf tests, nightly profiling scripts,
 *   and baseline comparison utilities.
 * - Use these types for deterministic Jest metrics and device-profile metrics.
 * - Side effects: none.
 */

export interface PerfScenarioResult {
  scenarioId: string;
  timestamp: string;
  device: string;
  sampleCount: number;
  p50Ms: number;
  p95Ms: number;
  maxMs: number;
  mainThreadLongTaskCount: number;
  metadata?: Record<string, string | number | boolean>;
}

export interface PerfBaseline {
  version: 1;
  generatedAt: string;
  platform: 'ios-simulator';
  device: string;
  scenarios: Record<string, PerfScenarioResult>;
}

export interface PerfRegressionPolicy {
  scenarioP50RegressionLimitPct: number;
  scenarioP95RegressionLimitPct: number;
  longTaskCountRegressionLimitPct: number;
}

export interface PerfRegressionViolation {
  scenarioId: string;
  metric: 'p50Ms' | 'p95Ms' | 'mainThreadLongTaskCount';
  baselineValue: number;
  currentValue: number;
  regressionPct: number;
  limitPct: number;
}

export const DEFAULT_PERF_REGRESSION_POLICY: PerfRegressionPolicy = {
  scenarioP50RegressionLimitPct: 15,
  scenarioP95RegressionLimitPct: 20,
  longTaskCountRegressionLimitPct: 25,
};
