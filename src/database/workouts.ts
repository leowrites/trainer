import { v4 as uuidv4 } from 'uuid';
import { Workout, WorkoutSet } from '../types';
import { getDatabase } from './database';

interface WorkoutRow {
  id: string;
  routineId: string | null;
  scheduleId: string | null;
  name: string;
  startedAt: number;
  endedAt: number | null;
  durationSeconds: number | null;
  notes: string;
  bodyweight: number | null;
}

interface WorkoutSetRow {
  id: string;
  workoutId: string;
  exerciseId: string;
  setNumber: number;
  reps: number | null;
  weight: number | null;
  weightUnit: 'kg' | 'lbs';
  rpe: number | null;
  isWarmup: number;
  completed: number;
  completedAt: number | null;
  notes: string;
  exName?: string;
  exMuscleGroup?: string;
  exSecondaryMuscles?: string;
  exEquipment?: string;
  exCreatedAt?: number;
}

function rowToWorkout(row: WorkoutRow): Workout {
  return {
    id: row.id,
    routineId: row.routineId ?? undefined,
    scheduleId: row.scheduleId ?? undefined,
    name: row.name,
    startedAt: row.startedAt,
    endedAt: row.endedAt ?? undefined,
    durationSeconds: row.durationSeconds ?? undefined,
    notes: row.notes,
    bodyweight: row.bodyweight ?? undefined,
  };
}

function rowToSet(row: WorkoutSetRow): WorkoutSet {
  const ws: WorkoutSet = {
    id: row.id,
    workoutId: row.workoutId,
    exerciseId: row.exerciseId,
    setNumber: row.setNumber,
    reps: row.reps ?? undefined,
    weight: row.weight ?? undefined,
    weightUnit: row.weightUnit,
    rpe: row.rpe ?? undefined,
    isWarmup: row.isWarmup === 1,
    completed: row.completed === 1,
    completedAt: row.completedAt ?? undefined,
    notes: row.notes,
  };
  if (row.exName) {
    ws.exercise = {
      id: row.exerciseId,
      name: row.exName,
      muscleGroup: row.exMuscleGroup || '',
      secondaryMuscles: JSON.parse(row.exSecondaryMuscles || '[]'),
      equipment: row.exEquipment || '',
      notes: '',
      createdAt: row.exCreatedAt || 0,
    };
  }
  return ws;
}

export async function createWorkout(
  data: Pick<Workout, 'name' | 'notes'> & { routineId?: string; scheduleId?: string; bodyweight?: number }
): Promise<Workout> {
  const db = getDatabase();
  const id = uuidv4();
  const startedAt = Date.now();
  await db.runAsync(
    'INSERT INTO workouts (id, routineId, scheduleId, name, startedAt, notes, bodyweight) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, data.routineId ?? null, data.scheduleId ?? null, data.name, startedAt, data.notes, data.bodyweight ?? null]
  );
  return { id, startedAt, ...data, name: data.name };
}

export async function updateWorkout(
  id: string,
  data: Partial<Pick<Workout, 'endedAt' | 'durationSeconds' | 'notes' | 'bodyweight' | 'name'>>
): Promise<void> {
  const db = getDatabase();
  const fields: string[] = [];
  const values: (string | number | null)[] = [];
  if (data.endedAt !== undefined) { fields.push('endedAt = ?'); values.push(data.endedAt); }
  if (data.durationSeconds !== undefined) { fields.push('durationSeconds = ?'); values.push(data.durationSeconds); }
  if (data.notes !== undefined) { fields.push('notes = ?'); values.push(data.notes); }
  if (data.bodyweight !== undefined) { fields.push('bodyweight = ?'); values.push(data.bodyweight); }
  if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
  if (fields.length === 0) return;
  values.push(id);
  await db.runAsync(`UPDATE workouts SET ${fields.join(', ')} WHERE id = ?`, values);
}

export async function getWorkoutById(id: string): Promise<Workout> {
  const db = getDatabase();
  const row = await db.getFirstAsync<WorkoutRow>('SELECT * FROM workouts WHERE id = ?', [id]);
  if (!row) throw new Error(`Workout ${id} not found`);
  const workout = rowToWorkout(row);
  const setRows = await db.getAllAsync<WorkoutSetRow>(
    `SELECT ws.*, e.name as exName, e.muscleGroup as exMuscleGroup,
            e.secondaryMuscles as exSecondaryMuscles, e.equipment as exEquipment,
            e.createdAt as exCreatedAt
     FROM workout_sets ws
     JOIN exercises e ON ws.exerciseId = e.id
     WHERE ws.workoutId = ? ORDER BY ws.setNumber ASC`,
    [id]
  );
  workout.sets = setRows.map(rowToSet);
  return workout;
}

export async function getAllWorkouts(limit = 50): Promise<Workout[]> {
  const db = getDatabase();
  const rows = await db.getAllAsync<WorkoutRow>(
    'SELECT * FROM workouts ORDER BY startedAt DESC LIMIT ?',
    [limit]
  );
  return rows.map(rowToWorkout);
}

export async function getWorkoutsThisWeek(): Promise<Workout[]> {
  const db = getDatabase();
  const monday = getMondayOfCurrentWeek();
  const rows = await db.getAllAsync<WorkoutRow>(
    'SELECT * FROM workouts WHERE startedAt >= ? ORDER BY startedAt DESC',
    [monday]
  );
  return rows.map(rowToWorkout);
}

function getMondayOfCurrentWeek(): number {
  const now = new Date();
  const day = now.getDay();
  const diff = (day === 0 ? -6 : 1 - day);
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday.getTime();
}

export async function logSet(
  data: Omit<WorkoutSet, 'id' | 'completedAt'>
): Promise<WorkoutSet> {
  const db = getDatabase();
  const id = uuidv4();
  const completedAt = data.completed ? Date.now() : null;
  await db.runAsync(
    `INSERT INTO workout_sets (id, workoutId, exerciseId, setNumber, reps, weight, weightUnit, rpe, isWarmup, completed, completedAt, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id, data.workoutId, data.exerciseId, data.setNumber,
      data.reps ?? null, data.weight ?? null, data.weightUnit,
      data.rpe ?? null, data.isWarmup ? 1 : 0, data.completed ? 1 : 0,
      completedAt, data.notes,
    ]
  );
  return { ...data, id, completedAt: completedAt ?? undefined };
}

export async function updateSet(
  id: string,
  data: Partial<Pick<WorkoutSet, 'reps' | 'weight' | 'weightUnit' | 'rpe' | 'completed' | 'isWarmup' | 'notes' | 'completedAt'>>
): Promise<void> {
  const db = getDatabase();
  const fields: string[] = [];
  const values: (string | number | null)[] = [];
  if (data.reps !== undefined) { fields.push('reps = ?'); values.push(data.reps); }
  if (data.weight !== undefined) { fields.push('weight = ?'); values.push(data.weight); }
  if (data.weightUnit !== undefined) { fields.push('weightUnit = ?'); values.push(data.weightUnit); }
  if (data.rpe !== undefined) { fields.push('rpe = ?'); values.push(data.rpe); }
  if (data.completed !== undefined) {
    fields.push('completed = ?');
    values.push(data.completed ? 1 : 0);
    fields.push('completedAt = ?');
    values.push(data.completed ? (data.completedAt ?? Date.now()) : null);
  }
  if (data.isWarmup !== undefined) { fields.push('isWarmup = ?'); values.push(data.isWarmup ? 1 : 0); }
  if (data.notes !== undefined) { fields.push('notes = ?'); values.push(data.notes); }
  if (fields.length === 0) return;
  values.push(id);
  await db.runAsync(`UPDATE workout_sets SET ${fields.join(', ')} WHERE id = ?`, values);
}

export async function deleteSet(id: string): Promise<void> {
  const db = getDatabase();
  await db.runAsync('DELETE FROM workout_sets WHERE id = ?', [id]);
}

export async function getSetsByExercise(exerciseId: string, limit = 100): Promise<WorkoutSet[]> {
  const db = getDatabase();
  const rows = await db.getAllAsync<WorkoutSetRow>(
    `SELECT ws.* FROM workout_sets ws
     JOIN workouts w ON ws.workoutId = w.id
     WHERE ws.exerciseId = ? AND ws.completed = 1
     ORDER BY w.startedAt DESC LIMIT ?`,
    [exerciseId, limit]
  );
  return rows.map(rowToSet);
}

export async function getRecentSetsForExercise(
  exerciseId: string,
  workoutCount: number
): Promise<WorkoutSet[][]> {
  const db = getDatabase();
  const workoutRows = await db.getAllAsync<{ id: string }>(
    `SELECT DISTINCT w.id FROM workouts w
     JOIN workout_sets ws ON ws.workoutId = w.id
     WHERE ws.exerciseId = ? AND w.endedAt IS NOT NULL
     ORDER BY w.startedAt DESC LIMIT ?`,
    [exerciseId, workoutCount]
  );
  const result: WorkoutSet[][] = [];
  for (const wr of workoutRows) {
    const setRows = await db.getAllAsync<WorkoutSetRow>(
      'SELECT * FROM workout_sets WHERE workoutId = ? AND exerciseId = ? ORDER BY setNumber ASC',
      [wr.id, exerciseId]
    );
    result.push(setRows.map(rowToSet));
  }
  return result.reverse();
}
