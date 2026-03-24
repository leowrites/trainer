/**
 * Perf lab environment flags.
 *
 * CALLING SPEC:
 * - Reads debug-only perf lab flags from Expo public env values.
 * - Gate perf lab surface so it is not shown in standard app flows.
 * - Side effects: none.
 */

export function isPerfLabEnabled(): boolean {
  return __DEV__ && process.env.EXPO_PUBLIC_PERF_LAB === '1';
}

export function getPerfLabScenarioPack(): string | undefined {
  const scenarioPack = process.env.EXPO_PUBLIC_PERF_SCENARIO;
  return scenarioPack?.trim() ? scenarioPack.trim() : undefined;
}
