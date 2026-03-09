# Copilot Instructions for Trainer

## Project Overview

This is a premium, all-in-one mobile fitness application built for serious lifters. It is heavily inspired by apps like Hevy and Strong, but distinguishes itself with intelligent progressive overload tracking and dynamic rotational scheduling (e.g., Push A / Pull A / Push B / Pull B).

The app is built with an **Offline-First** philosophy: it must be lightning-fast, fully functional without an internet connection, and capable of background cloud synchronization in a future phase.

---

## Tech Stack

| Layer          | Technology                                                 |
| -------------- | ---------------------------------------------------------- |
| Framework      | React Native (via Expo) with strict TypeScript             |
| Local Database | WatermelonDB (observable, reactive SQLite — offline-first) |
| Global State   | Zustand (ephemeral/non-persistent state only)              |
| Design Pattern | Feature-Sliced Design (FSD)                                |
| Styling        | NativeWind (Tailwind CSS for React Native)                 |

---

## Architecture & Design Patterns

### Feature-Sliced Design (FSD)

Code is grouped by feature, not by file type:

- `/features/routines`
- `/features/workout-mode`
- `/features/analytics`
- `/features/schedule`
- etc.

Each feature slice is self-contained and exposes a clean public API. Avoid creating `utils/`, `helpers/`, or `services/` directories at the root level.

### Data Flow

- **Persistent data** must always flow through WatermelonDB.
- **Ephemeral/transient state** (e.g., active rest timers, whether a workout is in progress) lives in Zustand.
- Never mix these two: do not store WatermelonDB records in Zustand, and do not use Zustand for anything that needs to survive an app restart.

---

## Core Features

1. **Routine & Schedule Engine** — Users create custom exercises, group them into Routines, and organize Routines into rotating Schedules. The app automatically queues up the "next" routine based on the active schedule.
2. **Active Workout Mode** — A dedicated, distraction-free UI for logging sets, reps, and weights in real-time.
3. **Progressive Overload Assistant** — Analyzes historical workout data to recommend targets for the current session (e.g., "Add 5 lbs" or "Aim for 1 more rep"). V1 uses deterministic logic; the module must be decoupled so it can be upgraded with ML-based models later.
4. **Comprehensive Analytics** — Dashboards tracking total volume, muscle group distribution, workout duration, and estimated 1RMs.
5. **Holistic Health Tracking** — Body weight, daily step count, and other physical activities for a complete fitness picture.

---

## Development Guidelines & Guardrails

### Local-First, Always

- Never block a user action waiting for a network request.
- All reads and writes happen against the local WatermelonDB instance.
- Cloud syncing (e.g., via Supabase) is a future phase — do not introduce network dependencies in core data paths.

### Type Safety

- `any` types are **strictly forbidden**.
- All database schemas, API responses, and component props must have rigorous TypeScript definitions.
- Prefer explicit return types on functions.

### Extensibility

- The progressive overload logic and schedule tracking must be built as **decoupled modules** so they can be swapped or upgraded independently.
- Avoid hard-coding business logic inside React components — extract it into domain modules within the relevant feature slice.

### Styling

- Use NativeWind (Tailwind) utility classes for all styling.
- Avoid inline `StyleSheet.create` objects unless NativeWind cannot express the style.
- Follow a mobile-first, thumb-friendly UI approach.

### Testing

- Write unit tests for all domain/business logic (progressive overload algorithms, schedule rotation, 1RM calculations).
- Write integration tests for WatermelonDB queries and mutations.
- Keep component tests focused on behavior, not implementation details.

---

## WatermelonDB Conventions

- Define all models in a central `database/` folder, then import them into the relevant feature slices.
- Use `@writer` and `@reader` decorators for all database operations.
- Relationships (`belongsTo`, `hasMany`) must be explicitly typed with the correct model class.
- Never access `database` directly inside a React component — use a custom hook or an observer HOC.

---

## Naming Conventions

- Files: `kebab-case` (e.g., `progressive-overload.ts`, `workout-card.tsx`)
- React components: `PascalCase`
- Hooks: `camelCase` prefixed with `use` (e.g., `useActiveWorkout`)
- Zustand stores: `camelCase` suffixed with `Store` (e.g., `workoutSessionStore`)
- WatermelonDB models: `PascalCase` (e.g., `WorkoutSet`, `Exercise`)
