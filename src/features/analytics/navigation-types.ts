import type { HistorySession } from './types';

/**
 * History navigation types
 *
 * Native-stack route contracts owned by the analytics feature.
 */
export type HistoryStackParamList = {
  HistoryOverview: undefined;
  Goals: undefined;
  HistorySessionDetail: {
    sessionId: string;
    session?: HistorySession;
  };
};
