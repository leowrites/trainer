import type { SQLiteDatabase } from 'expo-sqlite';

import type { HistorySessionRow, HistorySetRow } from '../types';

interface AnalyticsReader {
  getAllSync: SQLiteDatabase['getAllSync'];
}

export const HISTORY_SESSIONS_SQL = `
  SELECT
    ws.id,
    ws.routine_id,
    r.name AS routine_name,
    ws.snapshot_name,
    ws.start_time,
    ws.end_time
  FROM workout_sessions ws
  LEFT JOIN routines r ON r.id = ws.routine_id
  ORDER BY ws.start_time DESC
`;

export const HISTORY_SETS_SQL = `
  SELECT
    wset.id,
    wset.session_id,
    wset.exercise_id,
    e.name AS exercise_name,
    wset.weight,
    wset.reps,
    wset.is_completed,
    re.target_sets,
    re.target_reps
  FROM workout_sets wset
  LEFT JOIN exercises e ON e.id = wset.exercise_id
  LEFT JOIN workout_sessions ws ON ws.id = wset.session_id
  LEFT JOIN routine_exercises re
    ON re.routine_id = ws.routine_id
   AND re.exercise_id = wset.exercise_id
  ORDER BY wset.session_id ASC, e.name ASC, wset.rowid ASC
`;

export interface HistoryRows {
  sessionRows: HistorySessionRow[];
  setRows: HistorySetRow[];
}

export function loadHistoryRows(db: AnalyticsReader): HistoryRows {
  return {
    sessionRows: db.getAllSync<HistorySessionRow>(HISTORY_SESSIONS_SQL),
    setRows: db.getAllSync<HistorySetRow>(HISTORY_SETS_SQL),
  };
}
