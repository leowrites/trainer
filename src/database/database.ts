import * as SQLite from 'expo-sqlite';
import { v4 as uuidv4 } from 'uuid';

let db: SQLite.SQLiteDatabase;

export async function initDatabase(): Promise<void> {
  db = await SQLite.openDatabaseAsync('trainer.db');
  await db.execAsync('PRAGMA journal_mode = WAL;');
  await createTables();
  await seedExercises();
}

export function getDatabase(): SQLite.SQLiteDatabase {
  if (!db) throw new Error('Database not initialized. Call initDatabase() first.');
  return db;
}

async function createTables(): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS exercises (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      muscleGroup TEXT NOT NULL,
      secondaryMuscles TEXT NOT NULL DEFAULT '[]',
      equipment TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      createdAt INTEGER NOT NULL  -- Unix timestamp in milliseconds (Date.now())
    );

    CREATE TABLE IF NOT EXISTS routines (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS routine_exercises (
      id TEXT PRIMARY KEY,
      routineId TEXT NOT NULL,
      exerciseId TEXT NOT NULL,
      orderIndex INTEGER NOT NULL DEFAULT 0,
      targetSets INTEGER NOT NULL DEFAULT 3,
      targetReps TEXT NOT NULL DEFAULT '8-12',
      targetWeight REAL NOT NULL DEFAULT 0,
      restSeconds INTEGER NOT NULL DEFAULT 90,
      notes TEXT NOT NULL DEFAULT '',
      FOREIGN KEY (routineId) REFERENCES routines(id) ON DELETE CASCADE,
      FOREIGN KEY (exerciseId) REFERENCES exercises(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS schedules (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      isActive INTEGER NOT NULL DEFAULT 0,
      currentIndex INTEGER NOT NULL DEFAULT 0,
      createdAt INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS schedule_days (
      id TEXT PRIMARY KEY,
      scheduleId TEXT NOT NULL,
      routineId TEXT NOT NULL,
      orderIndex INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (scheduleId) REFERENCES schedules(id) ON DELETE CASCADE,
      FOREIGN KEY (routineId) REFERENCES routines(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS workouts (
      id TEXT PRIMARY KEY,
      routineId TEXT,
      scheduleId TEXT,
      name TEXT NOT NULL,
      startedAt INTEGER NOT NULL,
      endedAt INTEGER,
      durationSeconds INTEGER,
      notes TEXT NOT NULL DEFAULT '',
      bodyweight REAL
    );

    CREATE TABLE IF NOT EXISTS workout_sets (
      id TEXT PRIMARY KEY,
      workoutId TEXT NOT NULL,
      exerciseId TEXT NOT NULL,
      setNumber INTEGER NOT NULL,
      reps INTEGER,
      weight REAL,
      weightUnit TEXT NOT NULL DEFAULT 'kg',
      rpe REAL,
      isWarmup INTEGER NOT NULL DEFAULT 0,
      completed INTEGER NOT NULL DEFAULT 0,
      completedAt INTEGER,
      notes TEXT NOT NULL DEFAULT '',
      FOREIGN KEY (workoutId) REFERENCES workouts(id) ON DELETE CASCADE,
      FOREIGN KEY (exerciseId) REFERENCES exercises(id)
    );

    CREATE TABLE IF NOT EXISTS health_logs (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      type TEXT NOT NULL,
      value REAL NOT NULL,
      unit TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      loggedAt INTEGER NOT NULL
    );
  `);
}

interface ExerciseSeed {
  name: string;
  muscleGroup: string;
  secondaryMuscles: string[];
  equipment: string;
}

const PRESET_EXERCISES: ExerciseSeed[] = [
  // Chest
  { name: 'Bench Press', muscleGroup: 'chest', secondaryMuscles: ['triceps', 'shoulders'], equipment: 'Barbell' },
  { name: 'Incline Bench Press', muscleGroup: 'chest', secondaryMuscles: ['triceps', 'shoulders'], equipment: 'Barbell' },
  { name: 'Dumbbell Fly', muscleGroup: 'chest', secondaryMuscles: ['shoulders'], equipment: 'Dumbbell' },
  { name: 'Push-Up', muscleGroup: 'chest', secondaryMuscles: ['triceps', 'shoulders'], equipment: 'Bodyweight' },
  { name: 'Cable Crossover', muscleGroup: 'chest', secondaryMuscles: ['shoulders'], equipment: 'Cable' },
  { name: 'Dip', muscleGroup: 'chest', secondaryMuscles: ['triceps', 'shoulders'], equipment: 'Bodyweight' },
  // Back
  { name: 'Deadlift', muscleGroup: 'back', secondaryMuscles: ['glutes', 'hamstrings', 'traps'], equipment: 'Barbell' },
  { name: 'Pull-Up', muscleGroup: 'lats', secondaryMuscles: ['biceps', 'back'], equipment: 'Bodyweight' },
  { name: 'Barbell Row', muscleGroup: 'back', secondaryMuscles: ['biceps', 'lats'], equipment: 'Barbell' },
  { name: 'Cable Row', muscleGroup: 'back', secondaryMuscles: ['biceps', 'lats'], equipment: 'Cable' },
  { name: 'Lat Pulldown', muscleGroup: 'lats', secondaryMuscles: ['biceps', 'back'], equipment: 'Cable' },
  { name: 'T-Bar Row', muscleGroup: 'back', secondaryMuscles: ['biceps', 'lats'], equipment: 'Barbell' },
  // Shoulders
  { name: 'Overhead Press', muscleGroup: 'shoulders', secondaryMuscles: ['triceps', 'traps'], equipment: 'Barbell' },
  { name: 'Lateral Raise', muscleGroup: 'shoulders', secondaryMuscles: [], equipment: 'Dumbbell' },
  { name: 'Front Raise', muscleGroup: 'shoulders', secondaryMuscles: [], equipment: 'Dumbbell' },
  { name: 'Face Pull', muscleGroup: 'shoulders', secondaryMuscles: ['traps', 'back'], equipment: 'Cable' },
  { name: 'Shrug', muscleGroup: 'traps', secondaryMuscles: [], equipment: 'Barbell' },
  { name: 'Arnold Press', muscleGroup: 'shoulders', secondaryMuscles: ['triceps'], equipment: 'Dumbbell' },
  // Biceps
  { name: 'Barbell Curl', muscleGroup: 'biceps', secondaryMuscles: ['forearms'], equipment: 'Barbell' },
  { name: 'Dumbbell Curl', muscleGroup: 'biceps', secondaryMuscles: ['forearms'], equipment: 'Dumbbell' },
  { name: 'Hammer Curl', muscleGroup: 'biceps', secondaryMuscles: ['forearms'], equipment: 'Dumbbell' },
  { name: 'Preacher Curl', muscleGroup: 'biceps', secondaryMuscles: [], equipment: 'Barbell' },
  // Triceps
  { name: 'Skull Crusher', muscleGroup: 'triceps', secondaryMuscles: [], equipment: 'Barbell' },
  { name: 'Tricep Pushdown', muscleGroup: 'triceps', secondaryMuscles: [], equipment: 'Cable' },
  { name: 'Close-Grip Bench Press', muscleGroup: 'triceps', secondaryMuscles: ['chest'], equipment: 'Barbell' },
  { name: 'Overhead Tricep Extension', muscleGroup: 'triceps', secondaryMuscles: [], equipment: 'Dumbbell' },
  // Legs
  { name: 'Squat', muscleGroup: 'quads', secondaryMuscles: ['glutes', 'hamstrings'], equipment: 'Barbell' },
  { name: 'Leg Press', muscleGroup: 'quads', secondaryMuscles: ['glutes', 'hamstrings'], equipment: 'Machine' },
  { name: 'Romanian Deadlift', muscleGroup: 'hamstrings', secondaryMuscles: ['glutes', 'back'], equipment: 'Barbell' },
  { name: 'Leg Curl', muscleGroup: 'hamstrings', secondaryMuscles: [], equipment: 'Machine' },
  { name: 'Leg Extension', muscleGroup: 'quads', secondaryMuscles: [], equipment: 'Machine' },
  { name: 'Calf Raise', muscleGroup: 'calves', secondaryMuscles: [], equipment: 'Machine' },
  { name: 'Lunges', muscleGroup: 'quads', secondaryMuscles: ['glutes', 'hamstrings'], equipment: 'Dumbbell' },
  // Abs
  { name: 'Plank', muscleGroup: 'abs', secondaryMuscles: [], equipment: 'Bodyweight' },
  { name: 'Crunch', muscleGroup: 'abs', secondaryMuscles: [], equipment: 'Bodyweight' },
  { name: 'Hanging Leg Raise', muscleGroup: 'abs', secondaryMuscles: [], equipment: 'Bodyweight' },
];

async function seedExercises(): Promise<void> {
  const existing = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM exercises');
  if (existing && existing.count > 0) return;

  const now = Date.now();
  for (const ex of PRESET_EXERCISES) {
    await db.runAsync(
      'INSERT INTO exercises (id, name, muscleGroup, secondaryMuscles, equipment, notes, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [uuidv4(), ex.name, ex.muscleGroup, JSON.stringify(ex.secondaryMuscles), ex.equipment, '', now]
    );
  }
}
