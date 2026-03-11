/**
 * useGlassSupport
 *
 * Returns platform capability flags that drive the liquid glass UI system.
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
 * **isLiquidGlass** — true on iOS 26+, Apple's "Liquid Glass" release.  At
 * this tier the full native blur is available via `expo-blur`'s `BlurView`
 * and the system renders authentic real-time backdrop sampling.  When false,
 * `GlassView` falls back to a high-quality `rgba` approximation.
 *
 * **Integration note — `expo-blur`:**
 * To upgrade from the rgba approximation to native backdrop blur, add
 * `expo-blur` to your project (`npx expo install expo-blur`) and replace the
 * plain `View` inside `GlassView` with `BlurView` when `isLiquidGlass` is
 * true:
 *
 * ```tsx
 * import { BlurView } from 'expo-blur';
 *
 * // Inside GlassView render:
 * if (glassSupport.isLiquidGlass) {
 *   return <BlurView intensity={blurIntensity} tint="dark" style={...} />;
 * }
 * ```
 *
 * @example
 * ```tsx
 * const { isSupported, isLiquidGlass } = useGlassSupport();
 * ```
 */

import { Platform } from 'react-native';

export interface GlassSupportResult {
  /**
   * `true` on iOS 13+ where `rgba` glass surfaces are visually effective.
   * `false` on Android / Web — use a solid fallback background instead.
   */
  isSupported: boolean;

  /**
   * `true` on iOS 26+ (Apple's "Liquid Glass" OS release).
   * Enables native backdrop blur via `expo-blur` `BlurView`.
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
    isLiquidGlass: isIOS && iosVersion >= 26,
  };
}
