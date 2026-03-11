/**
 * useGlassSupport
 *
 * Returns platform capability flags that drive the liquid glass UI system.
 * The `isLiquidGlass` flag is derived from `isLiquidGlassSupported` exported
 * by `@callstack/liquid-glass` (set to `true` by the native module on iOS 26+)
 * and falls back to a `Platform.Version` check so that the hook continues to
 * work correctly in test environments and Expo Go where the native module is
 * not loaded.
 *
 * | Platform        | isSupported | isLiquidGlass |
 * |-----------------|-------------|---------------|
 * | iOS 26+         | true        | true          |
 * | iOS 13–25       | true        | false         |
 * | Android / Web   | false       | false         |
 *
 * **isSupported** — true on iOS 13+ where semi-transparent glass surfaces
 * (simulated via `rgba` backgrounds) are visually effective.
 *
 * **isLiquidGlass** — true on iOS 26+, Apple's "Liquid Glass" release.
 * `GlassView` automatically uses `LiquidGlassView` from
 * `@callstack/liquid-glass` when this flag is active.
 *
 * @example
 * ```tsx
 * const { isSupported, isLiquidGlass } = useGlassSupport();
 * ```
 */

import { Platform } from 'react-native';

import { isLiquidGlassSupported } from '@callstack/liquid-glass';

export interface GlassSupportResult {
  /**
   * `true` on iOS 13+ where `rgba` glass surfaces are visually effective.
   * `false` on Android / Web — use a solid fallback background instead.
   */
  isSupported: boolean;

  /**
   * `true` on iOS 26+ (Apple's "Liquid Glass" OS release).
   * `GlassView` uses the native `LiquidGlassView` from `@callstack/liquid-glass`
   * when this is active.
   */
  isLiquidGlass: boolean;
}

/**
 * Hook that returns glass rendering capability flags for the current platform.
 *
 * This is a pure, synchronous hook — it reads `Platform.OS` and
 * `Platform.Version` and performs no side-effects.
 */
export function useGlassSupport(): GlassSupportResult {
  const isIOS = Platform.OS === 'ios';
  // Platform.Version is a number on iOS (e.g. 17), a string on Android.
  const iosVersion = isIOS ? parseInt(String(Platform.Version), 10) : 0;

  return {
    isSupported: isIOS,
    // isLiquidGlassSupported is set to true by the native module on iOS 26+.
    // The Platform.Version fallback ensures the flag is correct in test
    // environments and Expo Go where the native module is not available.
    isLiquidGlass: isLiquidGlassSupported || (isIOS && iosVersion >= 26),
  };
}
