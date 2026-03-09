# Trainer 🏋️

A complete fitness tracking mobile app built with React Native, Expo, and TypeScript.

## Features

- **Workout Tracking**: Log exercises, sets, reps, and weights during live workouts with an elapsed timer and rest timer
- **Routines**: Create and manage reusable workout routines with ordered exercises and targets
- **Schedule System**: Build rotation schedules (e.g., Push/Pull/Legs) and advance through them day by day
- **Progress Charts**: View weight progression and volume over time with simple View-based charts
- **Health Logging**: Track body weight, steps, and activity duration with trend visualization
- **History**: Browse past workouts grouped by week with full set details
- **Progressive Overload Algorithm**: Automatic weight suggestions based on recent performance
  - Increase weight by 2.5 kg / 5 lbs when all target reps are achieved
  - Keep same weight when ≥75% reps achieved
  - Deload 10% when performance drops below 75%
- **Muscle Heatmap**: Visual display of muscles worked with color-coded intensity
- **30+ Preset Exercises**: Covering all major muscle groups (chest, back, shoulders, arms, legs, abs)

## Tech Stack

| Technology | Purpose |
|---|---|
| React Native + Expo | Cross-platform mobile framework |
| TypeScript | Type safety |
| Redux Toolkit | State management |
| expo-sqlite (v14+) | Local SQLite database with async API |
| React Navigation v6 | Tab + stack navigation |
| React Native Paper v5 | Material Design UI components |
| date-fns | Date utilities |
| uuid | ID generation |
| Jest + jest-expo | Unit testing |

## Architecture

```
src/
├── components/
│   ├── common/          # EmptyState, LoadingSpinner
│   ├── workout/         # ExerciseCard, SetRow, RestTimer
│   ├── routine/         # RoutineCard, ExercisePickerModal
│   └── progress/        # SimpleLineChart, SimpleBarChart, MuscleHeatmap
├── database/
│   ├── database.ts      # SQLite init, table creation, exercise seeding
│   ├── exercises.ts     # CRUD for exercises
│   ├── routines.ts      # CRUD for routines + routine exercises
│   ├── workouts.ts      # Workout and set management
│   └── health.ts        # Health log management
├── hooks/
│   ├── useWorkout.ts    # Active workout state + timer logic
│   ├── useRoutines.ts   # Routine CRUD hook
│   └── useProgressiveOverload.ts  # Overload suggestion hook
├── navigation/
│   ├── AppNavigator.tsx # Bottom tabs + stack navigator
│   └── types.ts         # Navigation type definitions
├── screens/
│   ├── DashboardScreen.tsx   # Weekly overview, recent workouts
│   ├── RoutinesScreen.tsx    # Routine list + detail/edit
│   ├── WorkoutScreen.tsx     # Live workout mode with timers
│   ├── HistoryScreen.tsx     # Workout history grouped by week
│   ├── ProgressScreen.tsx    # Exercise progress charts
│   ├── HealthScreen.tsx      # Body weight + health logging
│   └── ScheduleScreen.tsx    # Training schedule management
├── store/
│   ├── index.ts         # Redux store
│   ├── workoutSlice.ts  # Active workout state
│   ├── routineSlice.ts  # Routines state
│   ├── scheduleSlice.ts # Schedules state
│   └── healthSlice.ts   # Health logs state
├── types/
│   └── index.ts         # Shared TypeScript interfaces
└── utils/
    ├── progressiveOverload.ts    # Overload algorithm
    ├── muscleGroups.ts           # Muscle group colors + labels
    └── __tests__/
        └── progressiveOverload.test.ts  # Jest tests
```

## Setup

```bash
# Install dependencies
npm install

# Start development server
npx expo start

# Run on iOS simulator
npx expo start --ios

# Run on Android emulator
npx expo start --android

# Web preview
npx expo start --web

# Build for web export
npx expo export --platform web

# Run tests
npx jest --no-coverage
```

## Database Schema

| Table | Description |
|---|---|
| `exercises` | Exercise library (preset + custom) |
| `routines` | Workout routine definitions |
| `routine_exercises` | Exercises within a routine |
| `schedules` | Training rotation schedules |
| `schedule_days` | Routines within a schedule |
| `workouts` | Completed workout sessions |
| `workout_sets` | Individual sets logged during workouts |
| `health_logs` | Body weight, steps, and activity logs |

## Progressive Overload Algorithm

The algorithm analyzes the last 1–3 workouts for each exercise and suggests the next target weight:

- **All reps hit** (100% achievement): Increase weight by 2.5 kg (or 5 lbs)
- **Mostly achieved** (≥75%): Keep the same weight
- **Below threshold** (<75%): Deload by 10% and rebuild

Tests: `npx jest src/utils/__tests__/progressiveOverload.test.ts`
