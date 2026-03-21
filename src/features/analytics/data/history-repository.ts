import type { SQLiteDatabase } from 'expo-sqlite';

import type {
  HistorySessionRow,
  HistorySetRow,
  HistoryTrendSessionRow,
} from '../types';

interface AnalyticsReader {
  getAllSync: SQLiteDatabase['getAllSync'];
  getFirstSync: SQLiteDatabase['getFirstSync'];
}

const HISTORY_SESSION_SELECT_SQL = `
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

const HISTORY_SET_SELECT_SQL = `
  SELECT
    wset.id,
    wset.session_id,
    wset.exercise_id,
    e.name AS exercise_name,
    wset.weight,
    wset.reps,
    wset.is_completed,
    wset.target_sets,
    wset.target_reps
  FROM workout_sets wset
  LEFT JOIN exercises e ON e.id = wset.exercise_id
  ORDER BY wset.session_id ASC, e.name ASC, wset.rowid ASC
`;

export const HISTORY_TREND_SQL = `
  SELECT
    ws.id,
    ws.start_time,
    ws.end_time,
    COALESCE(
      SUM(CASE WHEN wset.is_completed = 1 THEN wset.weight * wset.reps ELSE 0 END),
      0
    ) AS total_volume,
    COALESCE(
      SUM(CASE WHEN wset.is_completed = 1 THEN wset.reps ELSE 0 END),
      0
    ) AS total_reps,
    COUNT(wset.id) AS total_sets,
    COALESCE(
      SUM(CASE WHEN wset.is_completed = 1 THEN 1 ELSE 0 END),
      0
    ) AS total_completed_sets
  FROM workout_sessions ws
  LEFT JOIN workout_sets wset ON wset.session_id = ws.id
  GROUP BY ws.id, ws.start_time, ws.end_time
  ORDER BY ws.start_time DESC
`;

export interface HistoryPageRows {
  sessionRows: HistorySessionRow[];
  setRows: HistorySetRow[];
  hasMore: boolean;
}

export interface HistoryPageQuery {
  limit: number;
  offset: number;
}

export interface HistorySessionRowsById {
  sessionRow: HistorySessionRow;
  setRows: HistorySetRow[];
}

function buildSetRowsSql(sessionCount: number): string {
  return `${HISTORY_SET_SELECT_SQL.replace(
    'ORDER BY wset.session_id ASC, e.name ASC, wset.rowid ASC',
    `WHERE wset.session_id IN (${Array.from({ length: sessionCount }, () => '?').join(', ')})
  ORDER BY wset.session_id ASC, e.name ASC, wset.rowid ASC`,
  )}`;
}

export function loadHistorySessionPage(
  db: AnalyticsReader,
  query: HistoryPageQuery,
): HistoryPageRows {
  const fetchedSessionRows = db.getAllSync<HistorySessionRow>(
    `${HISTORY_SESSION_SELECT_SQL}\n  LIMIT ? OFFSET ?`,
    [query.limit + 1, query.offset],
  );
  const hasMore = fetchedSessionRows.length > query.limit;
  const sessionRows = fetchedSessionRows.slice(0, query.limit);

  if (sessionRows.length === 0) {
    return {
      sessionRows: [],
      setRows: [],
      hasMore,
    };
  }

  const setRows = db.getAllSync<HistorySetRow>(
    buildSetRowsSql(sessionRows.length),
    sessionRows.map((sessionRow) => sessionRow.id),
  );

  return {
    sessionRows,
    setRows,
    hasMore,
  };
}

export function loadHistorySessionById(
  db: AnalyticsReader,
  sessionId: string,
): HistorySessionRowsById | null {
  const sessionRow = db.getFirstSync<HistorySessionRow>(
    `
  SELECT
    ws.id,
    ws.routine_id,
    r.name AS routine_name,
    ws.snapshot_name,
    ws.start_time,
    ws.end_time
  FROM workout_sessions ws
  LEFT JOIN routines r ON r.id = ws.routine_id
  WHERE ws.id = ?
  LIMIT 1
`,
    [sessionId],
  );

  if (!sessionRow) {
    return null;
  }

  return {
    sessionRow,
    setRows: db.getAllSync<HistorySetRow>(
      `${HISTORY_SET_SELECT_SQL.replace(
        'ORDER BY wset.session_id ASC, e.name ASC, wset.rowid ASC',
        'WHERE wset.session_id = ? ORDER BY wset.session_id ASC, e.name ASC, wset.rowid ASC',
      )}`,
      [sessionId],
    ),
  };
}

export function loadHistoryTrendRows(
  db: AnalyticsReader,
): HistoryTrendSessionRow[] {
  return db.getAllSync<HistoryTrendSessionRow>(HISTORY_TREND_SQL);
}
