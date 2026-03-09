# Trainer

A premium, offline-first mobile fitness application built for serious lifters. Trainer combines intelligent progressive overload tracking with dynamic rotational scheduling (e.g. Push A / Pull A / Push B / Pull B) to help athletes consistently improve over time.

---

## Features

- **Routine & Schedule Engine** — Create custom exercises, group them into Routines, and organize Routines into rotating Schedules. The app automatically queues up the next routine based on your active schedule.
- **Active Workout Mode** — A dedicated, distraction-free UI for logging sets, reps, and weights in real-time.
- **Progressive Overload Assistant** — Analyses historical data to recommend targets for the current session (e.g. "Add 5 lbs" or "Aim for 1 more rep").
- **Comprehensive Analytics** — Dashboards tracking total volume, muscle group distribution, workout duration, and estimated 1RMs.
- **Holistic Health Tracking** — Body weight, daily step count, and other physical activities for a complete fitness picture.

---

## Tech Stack

| Layer          | Technology                                                 |
| -------------- | ---------------------------------------------------------- |
| Framework      | React Native (via Expo ~55) with strict TypeScript ~5.9    |
| Local Database | WatermelonDB (observable, reactive SQLite — offline-first) |
| Global State   | Zustand (ephemeral/non-persistent state only)              |
| Design Pattern | Feature-Sliced Design (FSD)                                |
| Styling        | NativeWind v4 (Tailwind CSS for React Native)              |

---

## Prerequisites

- [Node.js](https://nodejs.org/) ≥ 20
- [npm](https://www.npmjs.com/) ≥ 10
- [Expo CLI](https://docs.expo.dev/get-started/installation/) — `npm install -g expo-cli`
- For iOS: Xcode ≥ 15 with a simulator configured
- For Android: Android Studio with an emulator configured (or a physical device with USB debugging)

---

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Start the development server

```bash
npm start
```

This launches the Expo dev server. From the terminal you can then press:

| Key | Action                       |
| --- | ---------------------------- |
| `i` | Open iOS Simulator           |
| `a` | Open Android Emulator/Device |
| `w` | Open in web browser          |

Alternatively, run a platform directly:

```bash
npm run ios      # iOS Simulator
npm run android  # Android Emulator / device
npm run web      # Browser (Expo Web)
```

---

## Project Structure

The codebase follows [Feature-Sliced Design (FSD)](https://feature-sliced.design/):

```
trainer/
├── src/
│   ├── features/               # Self-contained product features
│   │   ├── routines/           # Routine & exercise management
│   │   ├── workout-mode/       # Active workout logging UI
│   │   ├── analytics/          # Volume, 1RM, and progress charts
│   │   ├── schedule/           # Rotating workout schedules
│   │   └── health-tracking/    # Body weight, steps, misc activities
│   │
│   ├── core/                   # App-wide infrastructure
│   │   ├── database/           # WatermelonDB schema, models & migrations
│   │   ├── navigation/         # Root navigator and route definitions
│   │   └── theme/              # Design tokens (colours, typography)
│   │
│   └── shared/                 # Cross-cutting utilities
│       ├── components/         # Reusable primitive UI components
│       ├── hooks/              # Shared React hooks
│       ├── types/              # Cross-cutting TypeScript types
│       └── constants/          # App-wide constants
│
├── App.tsx                     # Root component
├── index.ts                    # Expo entry point
├── global.css                  # NativeWind / Tailwind directives
├── tailwind.config.js          # Tailwind theme & NativeWind preset
├── babel.config.js             # Babel + module-resolver aliases
├── tsconfig.json               # TypeScript strict config + path aliases
├── eslint.config.js            # ESLint v9 flat config
└── .prettierrc                 # Prettier formatting rules
```

Each feature slice exposes a clean public API through its `index.ts` and is fully self-contained. Never import directly from another feature's internals.

---

## Path Aliases

Path aliases are configured in both `tsconfig.json` and `babel.config.js` so they work for the TypeScript compiler and at Metro/Babel runtime:

| Alias         | Resolves to      |
| ------------- | ---------------- |
| `@/*`         | `src/*`          |
| `@features/*` | `src/features/*` |
| `@core/*`     | `src/core/*`     |
| `@shared/*`   | `src/shared/*`   |

Example usage:

```ts
import { colors } from '@core/theme';
import type { RecordId } from '@shared/types';
```

---

## Development Scripts

| Script                 | Description                              |
| ---------------------- | ---------------------------------------- |
| `npm start`            | Start Expo dev server                    |
| `npm run ios`          | Launch on iOS Simulator                  |
| `npm run android`      | Launch on Android Emulator / device      |
| `npm run web`          | Launch in browser                        |
| `npm run lint`         | Run ESLint across all `.ts`/`.tsx` files |
| `npm run lint:fix`     | Run ESLint and auto-fix issues           |
| `npm run format`       | Format all files with Prettier           |
| `npm run format:check` | Check formatting without writing         |
| `npm run type-check`   | Type-check without emitting files        |

---

## Code Style

- **TypeScript strict mode** is enabled. `any` is forbidden — use explicit types.
- **ESLint** (v9 flat config) enforces no-`any`, explicit return types, exhaustive `useEffect` deps, and consistent type imports.
- **Prettier** formats all TypeScript, JSON, and Markdown files: single quotes, trailing commas, 80-char line width, LF line endings.

Run both before pushing:

```bash
npm run lint && npm run type-check
```

---

## Architecture Guidelines

- **Offline-first**: All reads and writes go through WatermelonDB. Never block a user action on a network request.
- **State separation**: Persistent data lives in WatermelonDB; ephemeral/transient state (e.g. active rest timers, in-progress workout flag) lives in Zustand. Never store WatermelonDB records in Zustand.
- **Decoupled modules**: Progressive overload logic and schedule tracking are built as decoupled modules so they can be swapped or upgraded independently of the UI.
- **No business logic in components**: Extract domain logic into modules within the relevant feature slice.

For a full breakdown of the data layer, models, state management rules, and conventions for extending the schema, see **[docs/architecture.md](docs/architecture.md)**.
