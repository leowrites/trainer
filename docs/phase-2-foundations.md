# Phase 2 Foundations

This note captures the foundation decisions that unblock the Phase 2 home,
exercise detail, and workout-context work.

## Home metrics

- `workouts this week`: count of completed workout sessions whose `end_time`
  falls inside the current local calendar week.
- `training streak`: consecutive local calendar weeks with at least one
  completed workout, anchored to the current week. If the current week has no
  completed workout yet, the streak is `0`.
- `workout days this week`: count of distinct local days in the current week
  that contain at least one completed workout.

These semantics intentionally avoid a daily streak requirement, which would
misrepresent common strength-training behavior.

## Profile data

Phase 2 introduces a persisted `user_profile` record so the app can support:

- personalized greetings on the future home screen
- a preferred weight unit for app-level display defaults

## Exercise metadata

Phase 2 adds optional `how_to` and `equipment` metadata on `exercises` so the
future exercise detail surface can ship without another schema change.

## Prior-performance lookup

The current `workout_sessions` + `workout_sets` model is already sufficient for
prior-performance lookup. Phase 2 UI work can query the latest completed sets
for an exercise without further persistence changes.
