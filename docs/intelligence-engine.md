# Intelligence Engine

## Purpose

The trainer intelligence engine is a deterministic coaching layer built on top
of local workout history. It does not persist canonical PRs, recommendations,
or summaries. Instead, it derives them on read from routine templates, session
snapshots, and completed workout sets.

This document describes the v1 implementation that currently exists in the app.

## Architecture

The intelligence feature lives under
[`src/features/intelligence`](../src/features/intelligence) and is split into
four internal layers:

- `metrics`
  - Builds reusable exercise exposure records from history
  - Filters eligible work sets
  - Computes session volume, best-set data, e1RM, target-hit state, adherence
    inputs, variability, and trend series inputs
- `classifiers`
  - Detects PRs
  - Classifies target miss, overshot effort, fatigue flag, stall flag, and
    plateau flag
- `prescriptions`
  - Produces conservative next-session recommendations from progression policy
    plus classifier output
  - Includes confidence and quality metadata
- `goals`
  - Persists typed goals
  - Evaluates progress and completion from local history

The public hooks used by UI surfaces are:

- `useSessionIntelligence`
- `useIntelligenceOverview`
- `useTrainingGoals`

## Data Model

The schema now supports richer prescription and effort tracking:

- `exercises`
  - `strength_estimation_mode`
- `routine_exercises`
  - `progression_policy`
  - `target_rir`
- `routine_exercise_sets`
  - `target_reps_min`
  - `target_reps_max`
  - `set_role`
- `workout_session_exercises`
  - `progression_policy`
  - `target_rir`
- `workout_sets`
  - `target_reps_min`
  - `target_reps_max`
  - `actual_rir`
  - `set_role`
- `training_goals`
  - typed goal persistence for `strength`, `performance`, `adherence`, and
    `volume`

All schema changes are additive. Legacy exact-rep data is backfilled so
`target_reps_min = target_reps_max = target_reps`.

## Exercise Capability and e1RM

Estimated 1RM is routed through the metrics layer rather than hardcoded into
classifiers or prescriptions.

- Default estimator: the standard estimated 1RM formula used in v1
- Capability gating:
  - `primary`
  - `limited`
  - `disabled`

Compound movements can use e1RM as a primary trend and PR signal. Accessories
can downgrade or disable strength estimation entirely.

## Set Roles and Eligibility

The engine supports explicit set roles:

- `work`
- `top_set`
- `backoff`
- `warmup`
- `optional`

Warmup and optional sets are excluded from best-set logic, PR detection, stall
logic, and plateau logic.

Current defaults:

- `double_progression`
  - programmed sets default to `work`
- `top_set_backoff`
  - first programmed set defaults to `top_set`
  - later programmed sets default to `backoff`
- ad hoc workout-mode sets default to `optional`

## Metrics

Each completed exercise exposure derives:

- eligible work sets
- session volume
- best load
- best reps at best load
- best estimated 1RM
- target-hit state
- work-set miss count
- average actual RIR
- average planned RIR
- target completion rate
- performance variability

Trend summaries currently use:

- smoothed e1RM or smoothed volume direction
- target hit rate
- average reported RIR
- average days between exposures
- variability / consistency language
- routine completion rate
- average routine duration
- progressed / stalled lift counts
- fatigue incidence
- weekly muscle-group set volume
- routine exposure spacing

## Classifiers

The engine keeps negative signals distinct:

- `target miss`
  - reps below programmed floor on eligible work sets
- `overshot effort`
  - actual RIR materially lower than planned RIR when both are available
- `fatigue flag`
  - consecutive flagged exposures
- `stall flag`
  - shorter no-progress window
- `plateau flag`
  - longer no-progress window

PR detection currently supports:

- load PR
- rep PR at a matched load
- estimated 1RM PR
- exercise session-volume PR
- overall session-volume PR
- target-hit streak PR

Hard PRs use a 1.5% improvement threshold.

## Prescriptions

Supported progression policies:

- `double_progression`
- `top_set_backoff`

Prescription behavior:

- computed on read only
- unit-aware increments
  - `2.5 kg`
  - `5 lb`
- conservative when:
  - history is sparse
  - RIR is missing
  - logging is inconsistent
  - recent interruptions exist
  - adherence is weak

Adherence can now suppress an otherwise-valid increase when recommendation
quality is not high enough.

## Quality and Confidence

Each summary or recommendation can include a quality state:

- `high`
- `medium`
- `low`

Current reasons include:

- `too_few_exposures`
- `missing_rir`
- `limited_strength_estimation`
- `inconsistent_logging`
- `recent_interruption`

The type system also reserves `exercise_definition_changed` for future
comparability work, but v1 does not yet derive that state.

## Goal Tracking

Goal types:

- `strength`
- `performance`
- `adherence`
- `volume`

Current behavior:

- strength / performance
  - completion by achieved load and reps
  - progress via target-distance summary
- adherence
  - evaluated over calendar weeks inside the configured goal window
- volume
  - tracks hard sets when RIR exists
  - falls back to completed sets with downgraded confidence when RIR is missing

## UI Surfaces

The intelligence engine is currently surfaced in:

- workout summary
  - PR cards
  - negative signals
  - next-session prescriptions
  - goal deltas
- history session detail
  - classification cards
  - conservative next-step guidance
- history overview
  - exercise trend summaries
  - routine trend summaries
  - goal previews
- goals screen
  - create, edit, delete, and progress display

## Validation

Current implementation is covered by:

- migration tests
- repository tests
- analytics compatibility tests
- workout-mode hook and repository tests
- intelligence unit tests for:
  - PR detection
  - prescriptions
  - adherence goal evaluation

## Known Limits

These are intentionally not solved in the current implementation:

- no canonical persisted PR or recommendation records
- no LLM-generated summaries
- no ML personalization
- no exercise substitution comparability engine
- no true plan-aware adherence denominator across schedule/template changes
