import { v4 as uuidv4 } from 'uuid';
import { Routine, RoutineExercise, Exercise } from '../types';
import { getDatabase } from './database';

interface RoutineRow {
  id: string;
  name: string;
  description: string;
  createdAt: number;
  updatedAt: number;
}

interface RoutineExerciseRow {
  id: string;
  routineId: string;
  exerciseId: string;
  orderIndex: number;
  targetSets: number;
  targetReps: string;
  targetWeight: number;
  restSeconds: number;
  notes: string;
  // joined exercise fields
  exName?: string;
  exMuscleGroup?: string;
  exSecondaryMuscles?: string;
  exEquipment?: string;
  exNotes?: string;
  exCreatedAt?: number;
}

function rowToRoutineExercise(row: RoutineExerciseRow): RoutineExercise {
  const re: RoutineExercise = {
    id: row.id,
    routineId: row.routineId,
    exerciseId: row.exerciseId,
    orderIndex: row.orderIndex,
    targetSets: row.targetSets,
    targetReps: row.targetReps,
    targetWeight: row.targetWeight,
    restSeconds: row.restSeconds,
    notes: row.notes,
  };
  if (row.exName) {
    re.exercise = {
      id: row.exerciseId,
      name: row.exName,
      muscleGroup: row.exMuscleGroup || '',
      secondaryMuscles: JSON.parse(row.exSecondaryMuscles || '[]'),
      equipment: row.exEquipment || '',
      notes: row.exNotes || '',
      createdAt: row.exCreatedAt || 0,
    };
  }
  return re;
}

export async function getAllRoutines(): Promise<Routine[]> {
  const db = getDatabase();
  const rows = await db.getAllAsync<RoutineRow>('SELECT * FROM routines ORDER BY updatedAt DESC');
  const routines: Routine[] = [];
  for (const row of rows) {
    const exRows = await db.getAllAsync<RoutineExerciseRow>(
      `SELECT re.*, e.name as exName, e.muscleGroup as exMuscleGroup,
              e.secondaryMuscles as exSecondaryMuscles, e.equipment as exEquipment,
              e.notes as exNotes, e.createdAt as exCreatedAt
       FROM routine_exercises re
       JOIN exercises e ON re.exerciseId = e.id
       WHERE re.routineId = ? ORDER BY re.orderIndex ASC`,
      [row.id]
    );
    routines.push({ ...row, exercises: exRows.map(rowToRoutineExercise) });
  }
  return routines;
}

export async function getRoutineById(id: string): Promise<Routine> {
  const db = getDatabase();
  const row = await db.getFirstAsync<RoutineRow>('SELECT * FROM routines WHERE id = ?', [id]);
  if (!row) throw new Error(`Routine ${id} not found`);
  const exRows = await db.getAllAsync<RoutineExerciseRow>(
    `SELECT re.*, e.name as exName, e.muscleGroup as exMuscleGroup,
            e.secondaryMuscles as exSecondaryMuscles, e.equipment as exEquipment,
            e.notes as exNotes, e.createdAt as exCreatedAt
     FROM routine_exercises re
     JOIN exercises e ON re.exerciseId = e.id
     WHERE re.routineId = ? ORDER BY re.orderIndex ASC`,
    [id]
  );
  return { ...row, exercises: exRows.map(rowToRoutineExercise) };
}

export async function createRoutine(
  data: Pick<Routine, 'name' | 'description'>
): Promise<Routine> {
  const db = getDatabase();
  const id = uuidv4();
  const now = Date.now();
  await db.runAsync(
    'INSERT INTO routines (id, name, description, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)',
    [id, data.name, data.description, now, now]
  );
  return { id, name: data.name, description: data.description, createdAt: now, updatedAt: now, exercises: [] };
}

export async function updateRoutine(
  id: string,
  data: Partial<Pick<Routine, 'name' | 'description'>>
): Promise<Routine> {
  const db = getDatabase();
  const now = Date.now();
  const fields: string[] = [];
  const values: (string | number)[] = [];
  if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
  if (data.description !== undefined) { fields.push('description = ?'); values.push(data.description); }
  fields.push('updatedAt = ?');
  values.push(now);
  values.push(id);
  await db.runAsync(`UPDATE routines SET ${fields.join(', ')} WHERE id = ?`, values);
  return getRoutineById(id);
}

export async function deleteRoutine(id: string): Promise<void> {
  const db = getDatabase();
  await db.runAsync('DELETE FROM routines WHERE id = ?', [id]);
}

export async function addExerciseToRoutine(data: {
  routineId: string;
  exerciseId: string;
  orderIndex: number;
  targetSets: number;
  targetReps: string;
  targetWeight: number;
  restSeconds: number;
  notes: string;
}): Promise<RoutineExercise> {
  const db = getDatabase();
  const id = uuidv4();
  await db.runAsync(
    `INSERT INTO routine_exercises (id, routineId, exerciseId, orderIndex, targetSets, targetReps, targetWeight, restSeconds, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, data.routineId, data.exerciseId, data.orderIndex, data.targetSets, data.targetReps, data.targetWeight, data.restSeconds, data.notes]
  );
  await db.runAsync('UPDATE routines SET updatedAt = ? WHERE id = ?', [Date.now(), data.routineId]);
  return { id, ...data };
}

export async function updateRoutineExercise(
  id: string,
  data: Partial<Pick<RoutineExercise, 'targetSets' | 'targetReps' | 'targetWeight' | 'restSeconds' | 'notes' | 'orderIndex'>>
): Promise<void> {
  const db = getDatabase();
  const fields: string[] = [];
  const values: (string | number)[] = [];
  if (data.targetSets !== undefined) { fields.push('targetSets = ?'); values.push(data.targetSets); }
  if (data.targetReps !== undefined) { fields.push('targetReps = ?'); values.push(data.targetReps); }
  if (data.targetWeight !== undefined) { fields.push('targetWeight = ?'); values.push(data.targetWeight); }
  if (data.restSeconds !== undefined) { fields.push('restSeconds = ?'); values.push(data.restSeconds); }
  if (data.notes !== undefined) { fields.push('notes = ?'); values.push(data.notes); }
  if (data.orderIndex !== undefined) { fields.push('orderIndex = ?'); values.push(data.orderIndex); }
  if (fields.length === 0) return;
  values.push(id);
  await db.runAsync(`UPDATE routine_exercises SET ${fields.join(', ')} WHERE id = ?`, values);
}

export async function removeExerciseFromRoutine(id: string): Promise<void> {
  const db = getDatabase();
  await db.runAsync('DELETE FROM routine_exercises WHERE id = ?', [id]);
}
