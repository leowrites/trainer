# Contributing

## PR Conventions

All changes should be submitted as small, focused pull requests. Each PR should be reviewable on its own — ideally less than 400 lines of diff — and must leave the app in a compilable state.

## Proposed PR split for the initial implementation

The initial implementation is split into **five sequential PRs**. Each PR depends on the previous one. Branch off `main` (or the tip of the previous PR's branch) and target the same base.

---

### PR 1 — Foundation

**Goal:** Bootstrap the project. After this PR the app renders an empty tab navigator with placeholder screens, the SQLite schema is created on first launch, and the Redux store is wired up.

**Files**
```
package.json
package-lock.json
tsconfig.json
babel.config.js
metro.config.js
app.json
.gitignore
assets/
App.tsx
src/types/index.ts
src/database/database.ts        ← schema + seed (no query helpers yet)
src/store/index.ts
src/store/workoutSlice.ts
src/store/routineSlice.ts
src/store/scheduleSlice.ts
src/store/healthSlice.ts
src/navigation/AppNavigator.tsx ← stub <Text>Coming soon</Text> screens
src/navigation/types.ts
README.md
CONTRIBUTING.md
```

**Acceptance criteria**
- `npx expo export --platform web` succeeds with zero TypeScript errors.
- All 8 SQLite tables are created on first launch (verified in Expo DevTools / Metro logs).

---

### PR 2 — Routines

**Goal:** Users can browse preset exercises, create routines, add exercises to them with targets (sets / reps / weight / rest), and delete routines.

**Files**
```
src/database/exercises.ts
src/database/routines.ts
src/hooks/useRoutines.ts
src/components/common/EmptyState.tsx
src/components/common/LoadingSpinner.tsx
src/components/routine/RoutineCard.tsx
src/components/routine/ExercisePickerModal.tsx
src/screens/RoutinesScreen.tsx
```

**Acceptance criteria**
- Create a routine, add ≥ 2 exercises, save — routine appears in the list.
- Delete the routine — it disappears from the list.
- Exercise picker shows all 36 preset exercises grouped by muscle group.

---

### PR 3 — Workout Mode

**Goal:** Users can start a workout (from a routine or from scratch), log sets in real time, use the rest timer, and save the session.

**Files**
```
src/database/workouts.ts
src/hooks/useWorkout.ts
src/components/workout/ExerciseCard.tsx
src/components/workout/SetRow.tsx
src/components/workout/RestTimer.tsx
src/screens/WorkoutScreen.tsx
```

**Acceptance criteria**
- Start a workout, complete 3 sets, save — the session is persisted to SQLite.
- Discard a workout — no record is saved.
- Rest timer starts automatically after a set is logged, counts down, and plays a completion sound.

---

### PR 4 — History & Progress

**Goal:** Users can browse past workouts (grouped by week), drill into a session, and view per-exercise weight / volume charts. Progressive overload suggestions are shown during Workout Mode.

**Files**
```
src/utils/progressiveOverload.ts
src/utils/__tests__/progressiveOverload.test.ts
src/hooks/useProgressiveOverload.ts
src/components/progress/SimpleLineChart.tsx
src/components/progress/SimpleBarChart.tsx
src/screens/HistoryScreen.tsx
src/screens/ProgressScreen.tsx
```

**Acceptance criteria**
- `npx jest src/utils/__tests__/progressiveOverload.test.ts` — all 14 tests pass.
- History screen groups sessions by week and shows total duration.
- Progress screen renders a weight-over-time line chart for a selected exercise.
- Workout mode shows a progressive overload hint (e.g., "+2.5 kg suggested") when applicable.

---

### PR 5 — Dashboard, Health & Schedule

**Goal:** Complete the app with a stats dashboard, health logging (body weight / steps / activities), and a schedule rotation system.

**Files**
```
src/utils/muscleGroups.ts
src/components/progress/MuscleHeatmap.tsx
src/screens/DashboardScreen.tsx
src/screens/HealthScreen.tsx
src/screens/ScheduleScreen.tsx
src/database/health.ts
```

**Acceptance criteria**
- Dashboard shows correct weekly workout count and total hours.
- Muscle heatmap highlights muscles trained this week.
- Health screen allows logging body weight and steps; entries appear in the trend chart.
- Schedule screen allows creating a Push/Pull/Legs rotation; "Next Up" advances correctly after each saved workout.

---

## Running the project locally

```bash
# Install dependencies
npm install

# Start Expo dev server
npx expo start

# Run tests
npx jest --no-coverage

# Web export (CI build check)
npx expo export --platform web
```

## Code style

- TypeScript strict mode — no `any`.
- React hooks only (no class components).
- All database access goes through `src/database/` — screens never call SQLite directly.
- Business logic (progressive overload, schedule advancement) lives in `src/utils/` and must be unit-tested.
- Components in `src/components/` must be presentational — no direct database or Redux calls.
