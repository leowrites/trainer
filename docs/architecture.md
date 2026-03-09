# Architecture

This document describes the overall architecture of the Trainer app — how data flows, how state is managed, how features are structured, and how the local database layer works.

---

## Table of Contents

1. [Philosophy](#philosophy)
2. [Layer Overview](#layer-overview)
3. [Feature-Sliced Design](#feature-sliced-design)
4. [Data Layer — WatermelonDB](#data-layer--watermelondb)
   - [Schema](#schema)
   - [Models & Relationships](#models--relationships)
   - [Database Instance](#database-instance)
   - [DatabaseProvider & useDatabase Hook](#databaseprovider--usedatabase-hook)
   - [Querying & Writing Data](#querying--writing-data)
   - [Extending the Schema (Migrations)](#extending-the-schema-migrations)
5. [State Management](#state-management)
6. [Navigation](#navigation)
7. [Styling](#styling)
8. [Adding a New Feature Slice](#adding-a-new-feature-slice)

---

## Philosophy

Trainer is built around three guiding principles:

1. **Offline-first** — The app must be fully functional without a network connection. All reads and writes go through the local SQLite database (WatermelonDB). Cloud syncing is a future phase and must never block core user actions.
2. **Type safety** — `any` is forbidden. Every model, schema column, hook return value, and component prop must be explicitly typed.
3. **Separation of concerns** — Persistent data lives in WatermelonDB; ephemeral/transient state (e.g. an active rest timer, whether a workout is currently in progress) lives in Zustand. The two must never be mixed.

---

## Layer Overview

```
┌──────────────────────────────────────────────────────┐
│                    React Native UI                   │
│           (NativeWind / Tailwind utility classes)    │
├──────────────────────────────────────────────────────┤
│                   Feature Slices                     │
│  routines │ workout-mode │ analytics │ schedule │ …  │
├──────────────────────────────────────────────────────┤
│                   Core / Shared                      │
│  database │ navigation │ theme │ hooks │ constants   │
├──────────────────────────────────────────────────────┤
│              WatermelonDB (SQLite / JSI)              │
│          Zustand (ephemeral in-memory state)         │
└──────────────────────────────────────────────────────┘
```

---

## Feature-Sliced Design

The codebase follows [Feature-Sliced Design (FSD)](https://feature-sliced.design/). Code is grouped by feature, not by file type.

```
src/
├── features/           # Self-contained product features
│   ├── routines/       # Routine & exercise management
│   ├── workout-mode/   # Active workout logging UI
│   ├── analytics/      # Volume, 1RM, and progress charts
│   ├── schedule/       # Rotating workout schedules
│   └── health-tracking/
│
├── core/               # App-wide infrastructure (not feature-specific)
│   ├── database/       # WatermelonDB schema, models & provider
│   ├── navigation/     # Root navigator and route definitions
│   └── theme/          # Design tokens (colours, typography)
│
└── shared/             # Utilities reused across features
    ├── components/     # Primitive UI components
    ├── hooks/          # Shared React hooks
    ├── types/          # Cross-cutting TypeScript types
    └── constants/      # App-wide constants
```

**Rules:**

- Each feature slice exposes a public API through its `index.ts`. Never import from another feature's internals.
- Domain/business logic must live in the feature slice, not inside React components.
- `core/` modules are consumed by feature slices but never depend on them.

---

## Data Layer — WatermelonDB

All persistent data flows through [WatermelonDB](https://watermelondb.dev/) — a reactive, observable SQLite ORM built for React Native.

### Schema

Defined in `src/core/database/schema.ts`. The schema is versioned; increment `version` and supply a migration whenever any table or column changes.

**Current version: 1**

| Table               | Columns                                                           |
| ------------------- | ----------------------------------------------------------------- |
| `exercises`         | `name` (string), `muscle_group` (string)                          |
| `routines`          | `name` (string), `notes` (string, optional)                       |
| `routine_exercises` | `routine_id`\*, `exercise_id`\*, `target_sets`, `target_reps`     |
| `workout_sessions`  | `routine_id`\*, `start_time`, `end_time` (optional)               |
| `workout_sets`      | `session_id`\*, `exercise_id`\*, `weight`, `reps`, `is_completed` |

\* Indexed foreign-key column.

> WatermelonDB automatically adds an `id` column (string UUID) and `_changed` / `_status` columns to every table for sync support.

### Models & Relationships

Models live in `src/core/database/models/` and are exported from `src/core/database/`.

```
Exercise
  ◄── RoutineExercise ──► Routine
                              └── @children routineExercises

WorkoutSession
  └── @children workoutSets
        └── @relation exercise ──► Exercise
        └── @relation session  ──► WorkoutSession

Routine
  └── WorkoutSession (via routineId field)
```

#### `Exercise`

```ts
class Exercise extends Model {
  static table = 'exercises';
  @field('name') name: string;
  @field('muscle_group') muscleGroup: string;
}
```

#### `Routine`

```ts
class Routine extends Model {
  static table = 'routines';
  @field('name') name: string;
  @field('notes') notes: string | null;
  @children('routine_exercises') routineExercises: Query<RoutineExercise>;
}
```

#### `RoutineExercise` (join table)

```ts
class RoutineExercise extends Model {
  static table = 'routine_exercises';
  @field('routine_id') routineId: string;
  @field('exercise_id') exerciseId: string;
  @field('target_sets') targetSets: number;
  @field('target_reps') targetReps: number;
  @relation('routines', 'routine_id') routine: Relation<Routine>;
  @relation('exercises', 'exercise_id') exercise: Relation<Exercise>;
}
```

#### `WorkoutSession`

```ts
class WorkoutSession extends Model {
  static table = 'workout_sessions';
  @field('routine_id') routineId: string;
  @readonly @date('start_time') startTime: Date;
  @date('end_time') endTime: Date | null;
  @children('workout_sets') workoutSets: Query<WorkoutSet>;
}
```

#### `WorkoutSet`

```ts
class WorkoutSet extends Model {
  static table = 'workout_sets';
  @field('session_id') sessionId: string;
  @field('exercise_id') exerciseId: string;
  @field('weight') weight: number;
  @field('reps') reps: number;
  @field('is_completed') isCompleted: boolean;
  @relation('workout_sessions', 'session_id') session: Relation<WorkoutSession>;
  @relation('exercises', 'exercise_id') exercise: Relation<Exercise>;
}
```

### Database Instance

A single `Database` instance is created in `src/core/database/database.ts` using the JSI-powered `SQLiteAdapter` for maximum performance. It is configured with:

- The shared `schema` object.
- All five model classes registered in `modelClasses`.
- A `migrations` slot (currently `undefined`; populate it when the schema version is bumped — see [Extending the Schema](#extending-the-schema-migrations)).

```ts
// src/core/database/database.ts
export const database = new Database({
  adapter: new SQLiteAdapter({ schema, jsi: true, ... }),
  modelClasses: [Exercise, Routine, RoutineExercise, WorkoutSession, WorkoutSet],
});
```

This singleton is **not** imported directly in React components. Use the hook (see below).

### DatabaseProvider & useDatabase Hook

Defined in `src/core/database/provider.tsx`.

**Setup** — wrap your root component once:

```tsx
// App.tsx
import { DatabaseProvider } from '@core/database';

export default function App(): React.JSX.Element {
  return <DatabaseProvider>{/* rest of the app */}</DatabaseProvider>;
}
```

**Consume** — call the hook inside any component or custom hook:

```ts
import { useDatabase } from '@core/database';

function useExercises() {
  const db = useDatabase();
  return db.get<Exercise>('exercises').query();
}
```

The `DatabaseProvider` also accepts an optional `db` prop so you can inject a different instance in tests:

```tsx
<DatabaseProvider db={mockDatabase}>
  <ComponentUnderTest />
</DatabaseProvider>
```

### Querying & Writing Data

Always use WatermelonDB's `@writer` decorator for mutations. Never call `db.write()` directly from a React component — move write logic into a function or class within the relevant feature slice.

```ts
// src/features/routines/actions/create-routine.ts
import { database } from '@core/database';

export async function createRoutine(name: string): Promise<void> {
  await database.write(async () => {
    await database.get('routines').create((routine) => {
      routine.name = name;
    });
  });
}
```

For reactive UI updates, pair queries with `withObservables` (from `@nozbe/with-observables`) or use the observable `Query` object directly:

```ts
import { withObservables } from '@nozbe/with-observables';
import { useDatabase, Exercise } from '@core/database';

const enhance = withObservables([], ({ database }) => ({
  exercises: database.get<Exercise>('exercises').query(),
}));
```

### Extending the Schema (Migrations)

When adding or modifying tables/columns:

1. Increment the `version` number in `src/core/database/schema.ts`.
2. Create a migration file in `src/core/database/migrations/`.
3. Register the migration steps in the `migrations` array passed to `SQLiteAdapter` in `database.ts`.

> **Warning:** Bumping the schema version without providing a matching migration will cause WatermelonDB to drop and recreate the database, erasing all local data.

Example migration skeleton:

```ts
// src/core/database/migrations/index.ts
import {
  schemaMigrations,
  addColumns,
} from '@nozbe/watermelondb/Schema/migrations';

export const migrations = schemaMigrations({
  migrations: [
    {
      toVersion: 2,
      steps: [
        addColumns({
          table: 'exercises',
          columns: [{ name: 'equipment', type: 'string', isOptional: true }],
        }),
      ],
    },
  ],
});
```

---

## State Management

| Concern                                            | Tool             | Why                                                                 |
| -------------------------------------------------- | ---------------- | ------------------------------------------------------------------- |
| Persistent data (exercises, sessions, sets…)       | **WatermelonDB** | Survives app restarts; reactive; offline-first                      |
| Ephemeral UI state (rest timer, in-progress flag…) | **Zustand**      | Lightweight; no serialisation needed; lost on restart is acceptable |

**Never** store WatermelonDB `Model` instances in a Zustand store. If you need to share a record ID with transient state, store the `id: string` only and re-fetch the record from the database as needed.

---

## Navigation

Root navigator and route type definitions live in `src/core/navigation/`. The app uses Expo Router / React Navigation. Feature slices may define their own nested navigators internally but must not reach into another feature's navigator.

---

## Styling

All styling uses [NativeWind v4](https://www.nativewind.dev/) (Tailwind CSS for React Native). Avoid `StyleSheet.create` unless a style cannot be expressed with Tailwind utility classes.

Design tokens (brand colours, font sizes, spacing scale) are defined in `src/core/theme/index.ts` and extended into `tailwind.config.js` so they are available as utility classes throughout the app.

---

## Adding a New Feature Slice

1. Create `src/features/<feature-name>/`.
2. Add an `index.ts` that exports the feature's public API (components, hooks, actions).
3. If the feature needs new database tables, update `schema.ts`, add model files in `src/core/database/models/`, register the model class in `database.ts`, and provide a migration (see above).
4. Keep business/domain logic in the feature slice — not in React components.
5. Use `@core/database`'s `useDatabase()` hook for all database access within components.
