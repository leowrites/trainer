/**
 * Intelligence policy constants.
 *
 * CALLING SPEC:
 * - Import these constants anywhere deterministic intelligence rules need
 *   shared thresholds or windows.
 * - Values here are product policy, not persisted user settings.
 * - Side effects: none.
 */

export const HARD_PR_IMPROVEMENT_THRESHOLD = 0.015;
export const MEANINGFUL_PROGRESS_THRESHOLD = 0.015;
export const OVERSHOT_EFFORT_RIR_DELTA = 2;
export const FATIGUE_FLAG_CONSECUTIVE_EXPOSURES = 2;
export const STALL_WINDOW_EXPOSURES = 4;
export const PLATEAU_WINDOW_EXPOSURES = 6;
export const EXERCISE_TREND_WINDOW = 6;
export const EXERCISE_SMOOTHING_WINDOW = 3;
export const ROUTINE_TREND_WINDOW_DAYS = 28;
export const ADHERENCE_WINDOW_DAYS = 28;
export const ADHERENCE_CAP_THRESHOLD = 0.7;
export const ADHERENCE_EXPECTED_SESSIONS_PER_WEEK = 3;
export const DEFAULT_KG_INCREMENT = 2.5;
export const DEFAULT_LB_INCREMENT = 5;
export const RECENT_INTERRUPTION_DAYS = 10;
export const INCONSISTENT_LOGGING_ELIGIBLE_SET_THRESHOLD = 0.5;
