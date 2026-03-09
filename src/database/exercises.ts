import { v4 as uuidv4 } from 'uuid';
import { Exercise } from '../types';
import { getDatabase } from './database';

interface ExerciseRow {
  id: string;
  name: string;
  muscleGroup: string;
  secondaryMuscles: string;
  equipment: string;
  notes: string;
  createdAt: number;
}

function rowToExercise(row: ExerciseRow): Exercise {
  return {
    ...row,
    secondaryMuscles: JSON.parse(row.secondaryMuscles || '[]'),
  };
}

export async function getAllExercises(): Promise<Exercise[]> {
  const db = getDatabase();
  const rows = await db.getAllAsync<ExerciseRow>('SELECT * FROM exercises ORDER BY name ASC');
  return rows.map(rowToExercise);
}

export async function getExerciseById(id: string): Promise<Exercise | null> {
  const db = getDatabase();
  const row = await db.getFirstAsync<ExerciseRow>('SELECT * FROM exercises WHERE id = ?', [id]);
  return row ? rowToExercise(row) : null;
}

export async function createExercise(
  data: Omit<Exercise, 'id' | 'createdAt'>
): Promise<Exercise> {
  const db = getDatabase();
  const id = uuidv4();
  const createdAt = Date.now();
  await db.runAsync(
    'INSERT INTO exercises (id, name, muscleGroup, secondaryMuscles, equipment, notes, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, data.name, data.muscleGroup, JSON.stringify(data.secondaryMuscles), data.equipment, data.notes, createdAt]
  );
  return { id, createdAt, ...data };
}

export async function searchExercises(query: string): Promise<Exercise[]> {
  const db = getDatabase();
  const pattern = `%${query}%`;
  const rows = await db.getAllAsync<ExerciseRow>(
    'SELECT * FROM exercises WHERE name LIKE ? OR muscleGroup LIKE ? ORDER BY name ASC',
    [pattern, pattern]
  );
  return rows.map(rowToExercise);
}
