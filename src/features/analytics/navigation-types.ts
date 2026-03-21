/**
 * History navigation types
 *
 * Native-stack route contracts owned by the analytics feature.
 */
export type HistoryStackParamList = {
  HistoryOverview: undefined;
  HistorySessionDetail: { sessionId: string };
};
