/**
 * Synchronous SQLite call tracker for tests.
 *
 * CALLING SPEC:
 * - `createDbSyncCallTracker(db)` wraps sync sqlite methods with phase-aware
 *   counters (`render`, `interaction`, `effect`) for perf contracts.
 * - Tests call `setPhase()` before the observed action.
 * - `restore()` must be called in teardown.
 * - Side effects: monkey-patches provided db object methods in tests.
 */

export type DbSyncMethod =
  | 'getAllSync'
  | 'getFirstSync'
  | 'runSync'
  | 'withTransactionSync';

export type DbPerfPhase = 'render' | 'interaction' | 'effect';

export interface DbSyncCallRecord {
  method: DbSyncMethod;
  phase: DbPerfPhase;
  sql?: string;
}

type PatchableDb = {
  getAllSync?: (...args: unknown[]) => unknown;
  getFirstSync?: (...args: unknown[]) => unknown;
  runSync?: (...args: unknown[]) => unknown;
  withTransactionSync?: (...args: unknown[]) => unknown;
};

export interface DbSyncCallTracker {
  setPhase: (phase: DbPerfPhase) => void;
  records: () => DbSyncCallRecord[];
  countBy: (filters: Partial<DbSyncCallRecord>) => number;
  restore: () => void;
}

function extractSql(args: unknown[]): string | undefined {
  const maybeSql = args[0];
  return typeof maybeSql === 'string' ? maybeSql : undefined;
}

export function createDbSyncCallTracker(db: PatchableDb): DbSyncCallTracker {
  const records: DbSyncCallRecord[] = [];
  let phase: DbPerfPhase = 'effect';
  const originals: Partial<
    Record<DbSyncMethod, (...args: unknown[]) => unknown>
  > = {};

  const methods: DbSyncMethod[] = [
    'getAllSync',
    'getFirstSync',
    'runSync',
    'withTransactionSync',
  ];

  methods.forEach((method) => {
    const original = db[method];
    if (typeof original !== 'function') {
      return;
    }

    originals[method] = original;
    db[method] = (...args: unknown[]) => {
      records.push({
        method,
        phase,
        sql: extractSql(args),
      });
      return original(...args);
    };
  });

  return {
    setPhase: (nextPhase) => {
      phase = nextPhase;
    },
    records: () => [...records],
    countBy: (filters) =>
      records.filter((record) =>
        (
          Object.entries(filters) as Array<
            [keyof DbSyncCallRecord, DbSyncCallRecord[keyof DbSyncCallRecord]]
          >
        ).every(([key, value]) => {
          return record[key] === value;
        }),
      ).length,
    restore: () => {
      methods.forEach((method) => {
        const original = originals[method];
        if (original) {
          db[method] = original;
        }
      });
    },
  };
}
