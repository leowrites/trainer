/**
 * Performance testing helpers.
 *
 * CALLING SPEC:
 * - Public test-only helpers for profiler commit capture, render counters, and
 *   sqlite sync call tracking.
 * - Imported from perf contract tests.
 * - Side effects: none.
 */

export type {
  ProfilerCapture,
  ProfilerCommit,
} from './capture-profiler-commits';
export { buildProfilerCapture } from './capture-profiler-commits';
export type { RenderCounterHandle } from './render-counter';
export { buildRenderCounter } from './render-counter';
export type {
  DbPerfPhase,
  DbSyncCallRecord,
  DbSyncCallTracker,
  DbSyncMethod,
} from './db-sync-call-tracker';
export { createDbSyncCallTracker } from './db-sync-call-tracker';
