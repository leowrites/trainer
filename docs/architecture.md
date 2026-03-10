# Architecture

This document describes the overall architecture of the Trainer app — how data flows, how state is managed, how features are structured, and how the local database layer works.

---

## Table of Contents

1. [Philosophy](#philosophy)
2. [Layer Overview](#layer-overview)
3. [Feature-Sliced Design](#feature-sliced-design)
4. [Data Layer — expo-sqlite](#data-layer--expo-sqlite)
   - [Schema](#schema)
   - [Entity Types](#entity-types)
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

1. **Offline-first** — The app must be fully functional without a network connection. All reads and writes go through the local SQLite database (expo-sqlite). Cloud syncing is a future phase and must never block core user actions.
2. **Type safety** — `any` is forbidden. Every entity type, schema column, hook return value, and component prop must be explicitly typed.
3. **Separation of concerns** — Persistent data lives in expo-sqlite; ephemeral/transient state (e.g. an active rest timer, whether a workout is currently in progress) lives in Zustand. The two must never be mixed.

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
│              expo-sqlite (synchronous SQLite)                │
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
│   ├── database/       # expo-sqlite schema, types & provider
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

## Data Layer — expo-sqlite

All persistent data flows through [expo-sqlite](https://docs.expo.dev/versions/latest/sdk/sqlite/) — Expo's built-in synchronous SQLite API. The synchronous API keeps the data layer simple and avoids async/await boilerplate in query helpers.

### Schema

Defined in `src/core/database/schema.ts` as a single SQL string of `CREATE TABLE IF NOT EXISTS` statements. Every table uses a `TEXT PRIMARY KEY` (UUID) for its `id` column.

**Current version: 1** (`SCHEMA_VERSION` constant in `schema.ts`)

| Table               | Columns                                                                   |
| ------------------- | ------------------------------------------------------------------------- |
| `exercises`         | `name` (TEXT), `muscle_group` (TEXT)                                      |
| `routines`          | `name` (TEXT), `notes` (TEXT, optional)                                   |
| `routine_exercises` | `routine_id`\*, `exercise_id`\*, `position`, `target_sets`, `target_reps` |
| `workout_sessions`  | `routine_id`\* (optional), `start_time`, `end_time` (optional)            |
| `workout_sets`      | `session_id`\*, `exercise_id`\*, `weight`, `reps`, `is_completed`         |

\* Indexed foreign-key column.

> Every table also has an `id TEXT PRIMARY KEY NOT NULL` column (UUID generated with `generateId()` from `@core/database`).

### Entity Types

Plain TypeScript interfaces for every database entity live in `src/core/database/types.ts` and are exported from `src/core/database/`.

```ts
export interface Exercise {
  id: string;
  name: string;
  muscle_group: string;
}

export interface Routine {
  id: string;
  name: string;
  notes: string | null;
}

export interface RoutineExercise {
  id: string;
  routine_id: string;
  exercise_id: string;
  position: number;
  target_sets: number;
  target_reps: number;
}

export interface WorkoutSession {
  id: string;
  routine_id: string | null;
  start_time: number; // Unix timestamp (ms)
  end_time: number | null;
}

export interface WorkoutSet {
  id: string;
  session_id: string;
  exercise_id: string;
  weight: number;
  reps: number;
  is_completed: number; // SQLite boolean: 0 | 1
}
```

### Database Instance

A single `SQLiteDatabase` instance is opened in `src/core/database/database.ts` using `openDatabaseSync`. All tables are created (if they don't already exist) synchronously at startup.

```ts
// src/core/database/database.ts
import { openDatabaseSync } from 'expo-sqlite';
import { CREATE_TABLES_SQL } from './schema';

function initDatabase(): SQLiteDatabase {
  const db = openDatabaseSync('trainer.db');
  db.execSync(CREATE_TABLES_SQL);
  return db;
}

export const database: SQLiteDatabase = initDatabase();
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
import type { Exercise } from '@core/database';

function useExercises(): Exercise[] {
  const db = useDatabase();
  return db.getAllSync<Exercise>('SELECT * FROM exercises ORDER BY name');
}
```

The `DatabaseProvider` also accepts an optional `db` prop so you can inject a different instance in tests:

```tsx
<DatabaseProvider db={mockDb}>
  <ComponentUnderTest />
</DatabaseProvider>
```

### Querying & Writing Data

Use the synchronous expo-sqlite API for all database operations. Keep SQL queries inside dedicated helper functions within the relevant feature slice — never write raw SQL inside React components.

| Method | Purpose | Example |
| --- | --- | --- |
| `db.getAllSync<T>(sql, params?)` | Read multiple rows | `db.getAllSync<Exercise>('SELECT * FROM exercises')` |
| `db.getFirstSync<T>(sql, params?)` | Read a single row | `db.getFirstSync<Routine>('SELECT * FROM routines WHERE id = ?', [id])` |
| `db.runSync(sql, params?)` | INSERT / UPDATE / DELETE | `db.runSync('INSERT INTO routines (id, name) VALUES (?, ?)', [id, name])` |
| `db.withTransactionSync(fn)` | Wrap multiple writes atomically | `db.withTransactionSync(() => { ... })` |

Example write helper:

```ts
// src/features/routines/actions/create-routine.ts
import { useDatabase, generateId } from '@core/database';
import type { Routine } from '@core/database';

export function createRoutine(db: SQLiteDatabase, name: string): Routine {
  const id = generateId();
  db.runSync(
    'INSERT INTO routines (id, name, notes) VALUES (?, ?, NULL)',
    [id, name],
  );
  return { id, name, notes: null };
}
```

Example read helper:

```ts
// src/features/routines/queries/get-routines.ts
import type { SQLiteDatabase } from 'expo-sqlite';
import type { Routine } from '@core/database';

export function getRoutines(db: SQLiteDatabase): Routine[] {
  return db.getAllSync<Routine>('SELECT * FROM routines ORDER BY name');
}
```

### Extending the Schema (Migrations)

When adding or modifying tables/columns:

1. Increment `SCHEMA_VERSION` in `src/core/database/schema.ts`.
2. Add the new `CREATE TABLE` or `ALTER TABLE` statements to `CREATE_TABLES_SQL` (new tables only — SQLite does not support removing columns via `ALTER TABLE`).
3. For column additions, run `ALTER TABLE <table> ADD COLUMN <col> <type>` guarded by the `user_version` pragma so it only runs once.

Example migration guard in `database.ts`:

```ts
const db = openDatabaseSync('trainer.db');
db.execSync(CREATE_TABLES_SQL); // idempotent — CREATE TABLE IF NOT EXISTS

const row = db.getFirstSync<{ user_version: number }>('PRAGMA user_version');
const currentVersion = row?.user_version ?? 0;

if (currentVersion < 2) {
  db.execSync(`
    ALTER TABLE exercises ADD COLUMN equipment TEXT;
    PRAGMA user_version = 2;
  `);
}
```

> **Warning:** Dropping or renaming columns requires creating a new table, copying data, dropping the old table, and renaming the new one. Plan schema changes carefully to avoid data loss.

---

## State Management

| Concern                                            | Tool            | Why                                                                 |
| -------------------------------------------------- | --------------- | ------------------------------------------------------------------- |
| Persistent data (exercises, sessions, sets…)       | **expo-sqlite** | Survives app restarts; synchronous API; offline-first               |
| Ephemeral UI state (rest timer, in-progress flag…) | **Zustand**     | Lightweight; no serialisation needed; lost on restart is acceptable |

**Never** store database entity objects in a Zustand store. If you need to share a record ID with transient state, store the `id: string` only and re-fetch the record from the database as needed.

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
3. If the feature needs new database tables, update `CREATE_TABLES_SQL` in `schema.ts`, add entity interfaces in `src/core/database/types.ts`, and apply any necessary migration guard in `database.ts`.
4. Keep business/domain logic in the feature slice — not in React components.
5. Use `@core/database`'s `useDatabase()` hook for all database access within components.
