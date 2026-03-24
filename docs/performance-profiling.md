# Performance Profiling

Trainer now has a two-tier performance regression harness:

1. Deterministic Jest perf contracts (PR hard-fail).
2. Nightly iOS simulator profiling with baseline regression checks.

## Deterministic Perf Contracts

Run locally:

```bash
npm run test:perf
```

CI variant:

```bash
npm run test:perf:ci
```

Coverage includes:

- route coverage manifest contracts
- active-workout optimistic write-path contracts
- focused workout profiler contracts
- screen-level commit-budget contracts across workout, routines, schedule, history, goals, profile, and root navigation

## Debug Perf Lab

Enable perf lab in a dev build:

```bash
EXPO_PUBLIC_PERF_LAB=1 EXPO_PUBLIC_PERF_SCENARIO=default npx expo run:ios -d "iPhone 16e"
```

When enabled, the app mounts the full navigator plus a debug perf overlay, auto-runs scripted route/store scenarios, writes results to `perf_lab_runs` in local sqlite, and logs structured rows with `[PERF_LAB_RESULT]`.

## Nightly iOS Profiling

Run locally:

```bash
npm run perf:ios:nightly
```

The runner:

- boots an available iOS simulator (prefers iPhone 16e)
- launches the app with perf lab flags
- captures an app-attached Time Profiler trace (`perf/artifacts/nightly/ios-time-profiler.trace`)
- reads latest `perf_lab_runs` rows from sqlite
- writes current metrics (`perf/artifacts/nightly/ios-current-metrics.json`)
- compares against `perf/baselines/ios-simulator-baseline.json`
- fails on threshold regressions:
  - p50 > 15%
  - p95 > 20%
  - main-thread long-task count > 25%

## Baseline Updates

After intentional perf changes:

```bash
npm run perf:baseline:update
```

This copies current nightly metrics into the committed baseline.
