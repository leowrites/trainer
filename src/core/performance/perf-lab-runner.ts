/**
 * Perf lab scenario runner.
 *
 * CALLING SPEC:
 * - Runs deterministic scenario callbacks used by debug perf lab and nightly
 *   baseline comparison.
 * - Produces `PerfScenarioResult` values keyed by scenario id.
 * - Side effects: invokes provided scenario executor.
 */

import type { PerfScenarioResult } from './contracts';
import { NIGHTLY_PERF_SCENARIOS } from './perf-coverage-manifest';

interface TimedSample {
  durationMs: number;
}

export type PerfLabScenarioExecutor = (
  scenarioId: string,
  sampleIndex: number,
) => Promise<void>;

const PERF_SAMPLE_COUNT = 12;
const LONG_TASK_MS = 50;

function percentile(values: number[], pct: number): number {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil((pct / 100) * sorted.length) - 1),
  );

  return Number(sorted[index]?.toFixed(2) ?? 0);
}

async function measureScenarioSamples(
  scenarioId: string,
  executeScenario: PerfLabScenarioExecutor,
): Promise<TimedSample[]> {
  const samples: TimedSample[] = [];

  for (let sampleIndex = 0; sampleIndex < PERF_SAMPLE_COUNT; sampleIndex += 1) {
    const startedAt = performance.now();
    await executeScenario(scenarioId, sampleIndex);
    const durationMs = performance.now() - startedAt;
    samples.push({ durationMs });
  }

  return samples;
}

export async function runPerfLabScenarios(
  device: string,
  executeScenario: PerfLabScenarioExecutor,
): Promise<PerfScenarioResult[]> {
  const timestamp = new Date().toISOString();
  const results: PerfScenarioResult[] = [];

  for (const scenario of NIGHTLY_PERF_SCENARIOS) {
    const samples = (
      await measureScenarioSamples(scenario.scenarioId, executeScenario)
    ).map((sample) => sample.durationMs);
    results.push({
      scenarioId: scenario.scenarioId,
      timestamp,
      device,
      sampleCount: samples.length,
      p50Ms: percentile(samples, 50),
      p95Ms: percentile(samples, 95),
      maxMs: Number(Math.max(...samples).toFixed(2)),
      mainThreadLongTaskCount: samples.filter(
        (durationMs) => durationMs >= LONG_TASK_MS,
      ).length,
      metadata: {
        source: 'perf-lab-driver',
      },
    });
  }

  return results;
}

export function resolvePerfScenarioPack(
  scenarioPack: string | undefined,
): string {
  if (!scenarioPack || scenarioPack.trim() === '') {
    return 'default';
  }

  return scenarioPack.trim();
}
